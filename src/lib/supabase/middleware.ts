import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh the user's Supabase session on every request.
 * Returns the response to be sent back to the client.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const url = request.nextUrl.clone();
  const path = url.pathname;

  const protectedPrefixes = ["/dashboard", "/admin", "/consult", "/p/", "/team", "/account"];
  const isProtected = protectedPrefixes.some((p) => path.startsWith(p));

  // Authenticated API routes MUST refresh the session too. Without this, a long
  // chat that fires /api/consult/turn without any page reload never refreshes the
  // access token — it expires mid-chat and the route 401s ("החיבור שלך פג"),
  // getting the user stuck. Public API routes (no auth) stay on the fast path.
  const publicApiPrefixes = ["/api/waitlist", "/api/feedback", "/api/invite", "/api/health", "/api/cron", "/api/support"];
  const isApi = path.startsWith("/api/");
  const isPublicApi = publicApiPrefixes.some((p) => path.startsWith(p));
  const needsSession = isProtected || (isApi && !isPublicApi);

  // Fast path: public pages/API skip the auth round-trip so cached HTML stays fast.
  if (!needsSession) {
    return response;
  }

  // getUser() validates and, if needed, refreshes the token — the refreshed
  // cookies flow to the downstream route handler via the response above.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // API routes return their own JSON 401 — don't redirect them.
    if (isApi) return response;
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Admin-only: /admin and /team (talk to internal team agents)
  const adminOnlyPrefixes = ["/admin", "/team"];
  const isAdminOnly = adminOnlyPrefixes.some((p) => path.startsWith(p));
  if (isAdminOnly) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();
    if (profile?.plan !== "admin") {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
