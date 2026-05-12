import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/ratelimit";

/**
 * Bygg ein Supabase-klient med cookie-handling som auto-refreshar session,
 * og eit response-objekt som kan returnerast etterpå. Begge må fungere saman
 * fordi @supabase/ssr må kunne skrive refresh-cookies på response.
 */
function buildSupabaseAndResponse(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

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
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, getResponse: () => response };
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // === RATE-LIMIT-BRANCH ===
  // Alle AI-tunge ruter går gjennom rate-limit-sjekk.
  if (
    pathname === "/api/input-agent" ||
    pathname.startsWith("/api/agent-")
  ) {
    const blocked = await checkRateLimit(request);
    if (blocked) return blocked;
    return NextResponse.next();
  }

  // === CONSUMER-AUTH-BRANCH ===
  // /mine krev innlogging men IKKJE admin-status. Må komme FØR
  // admin-auth-fall-through nedanfor — elles ville ein vanleg innlogga
  // brukar bli signa ut og sendt til /admin/login.
  if (pathname === "/mine" || pathname.startsWith("/mine/")) {
    const { supabase, getResponse } = buildSupabaseAndResponse(request);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    return getResponse();
  }

  // === ADMIN-AUTH-BRANCH ===
  // Login-sida er offentleg — utan dette får vi redirect-loop
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const { supabase, getResponse } = buildSupabaseAndResponse(request);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Ingen session → tilbake til admin-login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Sjekk at brukaren faktisk er admin (admins-tabellen).
  // Service-role for å unngå RLS-konflikter — admins-tabellen
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
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("error", "lookup_failed");
    return NextResponse.redirect(url);
  }

  if (!adminRow) {
    // Innlogga, men ikkje admin — logg ut og redirect.
    // NB: dette er kun trigga for /admin/*-stier. /mine-brukarar
    // blir aldri sendt hit fordi vi tok dei i consumer-branchen ovanfor.
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("error", "not_admin");
    return NextResponse.redirect(url);
  }

  return getResponse();
}

export const config = {
  matcher: [
    // Admin-auth
    "/admin/:path*",
    "/api/admin/:path*",
    // Consumer-auth (chunk 2)
    "/mine",
    "/mine/:path*",
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