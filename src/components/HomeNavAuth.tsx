"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";
import UserMenu from "@/components/UserMenu";

/**
 * Client-side auth state for the home page nav.
 * The rest of the page renders instantly (static) — this component hydrates
 * auth state after paint, so users see the hero immediately.
 */
type AuthState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "authed"; email: string; displayName: string | null; isAdmin: boolean };

export default function HomeNavAuth() {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      // getSession() reads from localStorage — instant, no network round-trip.
      // Only verify server-side once we have a user we care about.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setState({ status: "anon" });
        return;
      }
      // Optimistic UI: show authed immediately using session data.
      setState({
        status: "authed",
        email: session.user.email ?? "",
        displayName: null,
        isAdmin: false,
      });
      // Then fetch profile in the background to upgrade the display name + admin badge.
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, plan")
        .eq("id", session.user.id)
        .single();
      if (profile) {
        setState({
          status: "authed",
          email: session.user.email ?? "",
          displayName: profile.display_name ?? null,
          isAdmin: profile.plan === "admin",
        });
      }
    })();
  }, []);

  if (state.status === "loading") {
    // Render skeleton — same width as the real buttons so layout doesn't jump
    return (
      <div className="flex gap-2.5 items-center opacity-0">
        <span className="h-8 w-16 rounded" />
        <span className="h-8 w-20 rounded" />
      </div>
    );
  }

  if (state.status === "anon") {
    return (
      <div className="flex gap-2.5 items-center">
        <Link href="/login">
          <Button variant="ghost" size="sm">התחבר</Button>
        </Link>
        <Link href="/waitlist">
          <Button variant="primary" size="sm">
            הצטרף <span className="inline-block">←</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 items-center">
      <Link href="/dashboard">
        <Button variant="primary" size="sm">
          לדאשבורד <span className="inline-block">←</span>
        </Button>
      </Link>
      <UserMenu email={state.email} displayName={state.displayName} isAdmin={state.isAdmin} />
    </div>
  );
}
