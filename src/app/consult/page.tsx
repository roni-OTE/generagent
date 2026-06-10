import { redirect } from "next/navigation";

/**
 * /consult — just redirects to /dashboard.
 * New chats are created via the sidebar "+ שיחה חדשה" button which
 * calls /api/consult/start and redirects to /consult/[id].
 */
export default function ConsultRoot() {
  redirect("/dashboard");
}
