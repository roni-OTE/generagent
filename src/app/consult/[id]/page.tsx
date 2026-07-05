import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkspaceShell from "@/components/WorkspaceShell";
import ChatView from "./ChatView";

export const dynamic = "force-dynamic";

export default async function ConsultChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, plan")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: consultation } = await supabase
    .from("consultations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!consultation) redirect("/dashboard");

  // If completed, redirect to result — unless the user explicitly asked to see
  // the transcript (?view=chat, linked from the result page and the sidebar).
  if (consultation.status === "completed" && consultation.analysis_json && view !== "chat") {
    redirect(`/consult/${id}/result`);
  }

  // If stuck in "analyzing" state — try the finalize once on page-load via client-side trigger.
  // We mark it so ChatView knows to auto-retry.
  const stuckAnalyzing = consultation.status === "analyzing";

  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content, micro_explanation, created_at")
    .eq("consultation_id", id)
    .order("created_at", { ascending: true });

  return (
    <WorkspaceShell
      userEmail={user.email ?? ""}
      displayName={profile.display_name}
      isAdmin={profile.plan === "admin"}
      activeChatId={id}
    >
      <ChatView
        consultationId={id}
        initialMessages={(messages ?? []).map((m) => ({
          role: m.role as "bot" | "user" | "system",
          content: m.content,
          micro: m.micro_explanation ?? undefined,
        }))}
        initialPhase={consultation.phase}
        initialQuestionCount={consultation.question_count}
        initialConfidence={Number(consultation.confidence ?? 0)}
        initialDone={consultation.status !== "in_progress"}
        autoFinalize={stuckAnalyzing}
        completedView={consultation.status === "completed" && view === "chat"}
      />
    </WorkspaceShell>
  );
}
