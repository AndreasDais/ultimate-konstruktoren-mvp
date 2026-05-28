import { getSupabase } from "@/lib/supabase";
import { sweepOrphanRuns } from "@/lib/calculation-runs/sweep-orphans";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
  try {
    const {
      request_id,
      calculation_type,
      run_type: rawRunType,
      display_language: rawDisplayLanguage,
      eval_case_id: rawEvalCaseId,
      engineering_context: rawEngineeringContext,
    } = await request.json();

    // Visningsspraak: rekna klientside (displayLanguageForContext). Berre
    // gyldige verdiar blir lagra; alt anna -> null (sniffer-fallback).
    const display_language =
      rawDisplayLanguage === "nn" ||
      rawDisplayLanguage === "nb" ||
      rawDisplayLanguage === "en"
        ? rawDisplayLanguage
        : null;

    // run_type lèt test-agenten (steg 4) opprette golden-køyringar.
    // Ukjend / utelaten verdi => "live" (defensivt — same åtferd som før).
    const run_type =
      rawRunType === "golden" || rawRunType === "discovery"
        ? rawRunType
        : "live";

    // Sprint 64.2 — eval_case_id lukker gap G4 frå TRACE_SURFACE_AUDIT.md.
    // Kun set når kallaren (eval-runner) eksplisitt sender eit gyldig
    // case_id. Live-trafikk passar undefined => feltet hamnar ikkje i
    // insert-payloaden i det heile, og fungerer dermed sjølv om DB-kolonnen
    // ikkje er køyrd ut enno (PostgREST PGRST204 unngått for produksjon).
    const eval_case_id =
      typeof rawEvalCaseId === "string" &&
      rawEvalCaseId.trim().length > 0 &&
      rawEvalCaseId.length <= 200
        ? rawEvalCaseId.trim()
        : null;

    // Sprint D — engineering_context per run (G6 i TRACE_SURFACE_AUDIT.md).
    // Konteksten er allereie sendt inline til kvar agent; vi lagrar han no
    // òg på runet sjølv så forensics-query kan filtrere/joine på profil.
    // Same conditional-insert mønster som eval_case_id: feltet kjem berre
    // i payloaden når klienten sender det, så produksjon overlever sjølv om
    // migrationen ikkje er køyrd enno.
    const engineering_context =
      rawEngineeringContext !== null &&
      typeof rawEngineeringContext === "object" &&
      !Array.isArray(rawEngineeringContext)
        ? rawEngineeringContext
        : null;

    if (!request_id) {
      return Response.json(
        { error: "Manglar request_id" },
        { status: 400 }
      );
    }

    const userId = await getCurrentUserId();
    const supabase = getSupabase();

    // Lazy orphan-cleanup (sprint 62.0). Fire-and-forget — sweep-feil skal
    // aldri stoppe ein ny berekning. Dekker anonyme runs (som /mine-sweepen
    // ikkje rører) + innlogga brukar sine egne. Sjå
    // lib/calculation-runs/sweep-orphans.ts for terskel og åtferd.
    void sweepOrphanRuns(
      supabase,
      userId ? { userId, includeAnonymous: true } : { anonymous: true },
    );

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

    // Bygg insert-payload conditionally: eval_case_id-feltet blir berre
    // inkludert om kallaren faktisk sendte ein verdi. Slik unngår
    // produksjon PGRST204 viss migrationen ikkje er køyrd enno.
    const insertPayload: Record<string, unknown> = {
      request_id,
      calculation_type: calculation_type ?? null,
      run_status: "running",
      run_type,
      display_language,
      agent_package_version: "agents_v0.2",
      started_at: new Date().toISOString(),
      user_id: userId,
    };
    if (eval_case_id !== null) {
      insertPayload.eval_case_id = eval_case_id;
    }
    if (engineering_context !== null) {
      insertPayload.engineering_context = engineering_context;
    }

    const { data, error } = await supabase
      .from("calculation_runs")
      .insert(insertPayload)
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