import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TEAM_AGENTS } from "@/lib/team/agents";
import TeamChatView from "./TeamChatView";

export const metadata = { title: "Chat · Team" };
export const dynamic = "force-dynamic";

export default async function TeamChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ chat?: string }>;
}) {
  const { handle } = await params;
  const { chat: chatIdFromUrl } = await searchParams;

  const agent = TEAM_AGENTS.find((a) => a.handle === handle);
  if (!agent) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  if (me?.plan !== "admin") redirect("/dashboard");

  // Resolve chat: use provided ID or create new
  let chatId = chatIdFromUrl;
  if (chatId) {
    const { data: existing } = await supabase
      .from("team_agent_chats")
      .select("id")
      .eq("id", chatId)
      .eq("user_id", user.id)
      .single();
    if (!existing) chatId = undefined;
  }
  if (!chatId) {
    const { data: created } = await supabase
      .from("team_agent_chats")
      .insert({ user_id: user.id, agent_handle: handle })
      .select("id")
      .single();
    chatId = created?.id;
    if (!chatId) redirect("/team");
  }

  const { data: messages } = await supabase
    .from("team_agent_messages")
    .select("id, role, content, created_at")
    .eq("chat_id", chatId!)
    .order("created_at", { ascending: true });

  // Sidebar: all chats with this agent for this user
  const { data: sidebarChats } = await supabase
    .from("team_agent_chats")
    .select("id, title, updated_at")
    .eq("user_id", user.id)
    .eq("agent_handle", handle)
    .eq("archived", false)
    .order("updated_at", { ascending: false })
    .limit(20);

  return (
    <TeamChatView
      agent={{ handle: agent.handle, name: agent.name, role: agent.role }}
      chatId={chatId!}
      activeChats={sidebarChats ?? []}
      initialMessages={(messages ?? []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "agent",
        content: m.content,
        created_at: m.created_at,
      }))}
    />
  );
}
