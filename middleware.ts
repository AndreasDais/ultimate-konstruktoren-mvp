import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/ratelimit";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // === RATE-LIMIT-BRANCH ===
  // Alle AI-tunge ruter går gjennom rate-limit-sjekk.
  // /api/input-agent og /api/agent-* kostar Anthropic-tokens — utan grense
  // kan ein einsleg brukar (eller bot) brenne pilot-budsjettet på minutter.
  if (
    pathname === "/api/input-agent" ||
    pathname.startsWith("/api/agent-")
  ) {
    const blocked = await checkRateLimit(request);
    if (blocked) return blocked;
    return NextResponse.next();
  }

  // === ADMIN-AUTH-BRANCH ===
  // Resten (matcher = /admin/* og /api/admin/*) går gjennom Supabase-auth.

  // Login-sida er offentleg — utan dette får vi redirect-loop
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Steg 1: hent innlogga brukar via cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Ingen session → tilbake til login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Steg 2: sjekk at brukaren faktisk er admin (admins-tabellen).
  // Vi bruker service-role for å unngå RLS-konflikter — admins-tabellen
  // skal aldri vere lesbar for vanlege brukarar.
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: adminRow, error: adminError } = await adminSupabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("[middleware] Admin lookup failed:", adminError);
    // Sikkerhets-fail: nekt tilgang ved feil i admin-sjekk
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("error", "lookup_failed");
    return NextResponse.redirect(url);
  }

  if (!adminRow) {
    // Innlogga, men ikkje admin — logg ut og redirect
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("error", "not_admin");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Admin-auth
    "/admin/:path*",
    "/api/admin/:path*",
    // Rate-limit (eksplisitt enumerert sidan path-to-regexp ikkje matchar
    // dash-prefix-pattern reint)
    "/api/input-agent",
    "/api/agent-a",
    "/api/agent-b",
    "/api/agent-c",
    "/api/agent-d",
    "/api/agent-e",
  ],
};