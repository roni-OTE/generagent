"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const TOS_VERSION = "v1.0";

export async function acceptLegal(formData: FormData) {
  const accepted = formData.get("accept");
  if (!accepted) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const ua = h.get("user-agent") ?? null;

  // Record acceptance — RLS allows self-insert
  await supabase.from("legal_acceptances").insert({
    user_id: user.id,
    document: "terms",
    version: TOS_VERSION,
    ip_address: ip,
    user_agent: ua,
  });

  redirect("/dashboard");
}
