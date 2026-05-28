/**
 * Lazy orphan-sweeper for calculation_runs.
 *
 * Pipeline orchestration lever klientside (app/page.tsx driv steg 3–5).
 * Lukkar brukar fana mellom init-run og Controller-completion, blir
 * `calculation_runs.run_status` ståande som "running" for alltid.
 * Server-side resume finst ikkje.
 *
 * Sweeperen er ein billeg garbage-collector: køyringar med
 * `run_status = "running"` eldre enn `STALE_THRESHOLD_MS` (30 min) blir
 * markerte som "aborted". Typisk PILAR-berekning fullfører på 3–4 min,
 * så 30 min er trygt — aktive runs blir aldri rydda ved feiltaking.
 *
 * Designprinsipp: feilar mjukt. Sweep-feil skal aldri stoppe ein
 * legitim berekning. Kallaren bør `void`-fyre dette på den varme vegen
 * (init-run) og berre logge ved problem.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** 30 min — same terskel som etablert konvensjon i app/mine/page.tsx. */
export const STALE_THRESHOLD_MS = 30 * 60 * 1000;

/**
 * Kva runs sweeperen skal røre:
 *  - `{ userId: string }` — berre denne brukaren sine.
 *  - `{ anonymous: true }` — berre anonyme runs (`user_id IS NULL`).
 *  - `{ userId: string, includeAnonymous: true }` — denne brukaren + alle anon.
 *    Brukt frå init-run for å rydde anon-runs som elles aldri blir markerte.
 */
export type SweepScope =
  | { userId: string; includeAnonymous?: boolean }
  | { anonymous: true; userId?: never };

export type SweepResult = {
  /** Tal på rader markerte som "aborted". null ved feil. */
  swept: number | null;
  /** Sett ved feil; sweeperen feilar elles mjukt og loggar ikkje. */
  error: string | null;
};

/**
 * Markerer foreldra "running"-runs som "aborted". Idempotent.
 * Feilar mjukt: loggar og returnerer `{ swept: null, error }`.
 */
export async function sweepOrphanRuns(
  supabase: SupabaseClient,
  scope: SweepScope,
): Promise<SweepResult> {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();

  let query = supabase
    .from("calculation_runs")
    .update({ run_status: "aborted" }, { count: "exact" })
    .eq("run_status", "running")
    .lt("started_at", cutoff);

  if ("anonymous" in scope) {
    query = query.is("user_id", null);
  } else if (scope.includeAnonymous) {
    query = query.or(`user_id.eq.${scope.userId},user_id.is.null`);
  } else {
    query = query.eq("user_id", scope.userId);
  }

  const { error, count } = await query;

  if (error) {
    const message = error.message ?? "ukjent feil";
    console.warn(`[sweep-orphans] mjuk feil: ${message}`);
    return { swept: null, error: message };
  }

  return { swept: count ?? 0, error: null };
}
