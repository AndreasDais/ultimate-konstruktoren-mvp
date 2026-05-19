import { getSupabase } from "@/lib/supabase";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { coerceLocale, wrapPromptWithLocale, type Locale } from "@/lib/locale";

/**
 * Hent user_id frå innlogga session viss han finst. Returnerer null for
 * anonyme køyringar — det er forventa og OK. Auth-utfall != produkt-utfall.
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Best-effort — session-refresh skjer i middleware.
            }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch (err) {
    // Auth-feil skal aldri stoppe ein calculation_run. Fall tilbake til anonym.
    console.warn("[init-run] getCurrentUserId failed, fall tilbake til anonym:", err);
    return null;
  }
}

export async function POST(request: Request) {
  let locale: Locale = "nb";
  try {
    const { request_id, calculation_type } = await request.json();

    if (!request_id) {
      return Response.json(
        { error: "Manglar request_id" },
        { status: 400 }
      );
    }

    const userId = await getCurrentUserId();
    const supabase = getSupabase();

    // Best-effort: oppdater requests.user_id viss innlogga.
    // Feil her stoppar ikkje køyringa — vi har framleis calculation_runs.user_id.
    if (userId) {
      const { error: reqUpdateError } = await supabase
        .from("requests")
        .update({ user_id: userId })
        .eq("id", request_id);
      if (reqUpdateError) {
        console.warn(
          "[init-run] kunne ikkje oppdatere requests.user_id:",
          reqUpdateError
        );
      }
    }

    const { data, error } = await supabase
      .from("calculation_runs")
      .insert({
        request_id,
        calculation_type: calculation_type ?? null,
        run_status: "running",
        agent_package_version: "agents_v0.2",
        started_at: new Date().toISOString(),
        user_id: userId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Klarte ikkje opprette calculation_run:", error);
      return Response.json(
        { error: "Klarte ikkje opprette berekningskøyring" },
        { status: 500 }
      );
    }

    return Response.json({ run_id: data.id });
  } catch (err) {
    console.error("init-run error:", err);
    const errorMessage = err instanceof Error ? err.message : "Ukjent feil";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}