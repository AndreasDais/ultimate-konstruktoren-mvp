import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, checkGlobalDailyCap } from "@/lib/ratelimit";

const UI_MODE_COOKIE = "pilar-ui-mode";

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

  if (pathname === "/" && !request.cookies.has(UI_MODE_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";

    const response = NextResponse.redirect(url);
    response.cookies.set(UI_MODE_COOKIE, "intl", {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });

    return response;
  }

  // === RATE-LIMIT-BRANCH ===
  // Alle AI-tunge ruter går gjennom rate-limit-sjekk.
  //
  // /api/init-run er chokepointen for kostnad: eitt kall per køyring,
  // før noko LLM-kall. Der gjeld BEGGE: det globale dagstaket (vern mot
  // mange-IP-flaum) og per-IP-grensa (hindrar at éin IP brenn dagsbudsjettet).
  if (pathname === "/api/init-run") {
    const capped = await checkGlobalDailyCap();
    if (capped) return capped;
    const blocked = await checkRateLimit(request);
    if (blocked) return blocked;
    return NextResponse.next();
  }
  if (
    pathname === "/api/input-agent" ||
    pathname.startsWith("/api/agent-")
  ) {
    const blocked = await checkRateLimit(request);
    if (blocked) return blocked;
    return NextResponse.next();
  }

  // === CONSUMER-AUTH-BRANCH ===
  // Konsument-stier som krev innlogging men IKKJE admin-status.
  // Må komme FØR admin-auth-fall-through nedanfor — elles ville ein
  // vanleg innlogga brukar bli signa ut og sendt til /admin/login.
  if (
    pathname === "/mine" ||
    pathname.startsWith("/mine/") ||
    pathname === "/innstillingar" ||
    pathname.startsWith("/innstillingar/")
  ) {
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
    // First-time public root landing
    "/",
    // Admin-auth
    "/admin/:path*",
    "/api/admin/:path*",
    // Consumer-auth (dag 8 chunk 2 + dag 12)
    "/mine",
    "/mine/:path*",
    "/innstillingar",
    "/innstillingar/:path*",
    // Rate-limit (eksplisitt enumerert sidan path-to-regexp ikkje matchar
    // dash-prefix-pattern reint)
    "/api/init-run",
    "/api/input-agent",
    "/api/agent-a",
    "/api/agent-b",
    "/api/agent-c",
    "/api/agent-d",
    "/api/agent-e",
  ],
};
