/**
 * Test-agent — RunRecord-henting (Fase 1 steg 4b).
 *
 * Les den konsoliderte runrecord-VIEW-en (db/runrecord.sql, steg 1c) for
 * eitt run_id. VIEW-en samlar dei sju pipeline-tabellane + step_metrics
 * til éi rad — graderaren sin kanoniske inngang.
 *
 * Krev SUPABASE-env (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 * — orkestratoren lastar .env før dette blir kalla.
 */
import { getSupabase } from "@/lib/supabase";
import type { RunRecord } from "@/lib/runrecord";

/**
 * Hentar RunRecord for eitt run_id. Returnerer null om rada ikkje finst
 * (t.d. om pipelinen ikkje fullførte). Kastar berre ved reell DB-feil.
 */
export async function fetchRunRecord(
  runId: string,
): Promise<RunRecord | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("runrecord")
    .select("*")
    .eq("run_id", runId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Klarte ikkje lese runrecord for ${runId}: ${error.message}`,
    );
  }
  return (data as RunRecord | null) ?? null;
}
