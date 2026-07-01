import { redirect } from "next/navigation";

// Codes list page is deprecated — MECHADSHIN + LINKEDIN each have single
// shared codes with counters, shown directly on /admin/waitlist.
export default function DeprecatedCodesPage() {
  redirect("/admin/waitlist");
}
