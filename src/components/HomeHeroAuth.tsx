"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/Button";

/**
 * Client-side auth-aware CTA in the hero. Renders the correct button
 * (dashboard vs waitlist) once auth state is known. Shows the "join waitlist"
 * CTA as the optimistic default so first paint is meaningful for the 99%
 * anonymous visitors.
 */
export default function HomeHeroAuth() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setIsAuthed(!!data.user));
  }, []);

  // Optimistic render: assume anonymous until we know otherwise.
  // This is safe because for authed users the app pushes them to /dashboard
  // via the client-side redirect once state resolves.
  if (isAuthed === true) {
    return (
      <Link href="/dashboard">
        <Button variant="primary" size="lg">
          המשך לדאשבורד <span className="inline-block">←</span>
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/waitlist">
      <Button variant="primary" size="lg">
        הצטרף לרשימת המתנה <span className="inline-block">←</span>
      </Button>
    </Link>
  );
}
