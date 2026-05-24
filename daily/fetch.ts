/**
 * Dagleg agent — datahenting (Fase 1 steg 6b).
 *
 * Les eitt doegn med live-RunRecords + shadow_checks fraa Supabase.
 * Aggregatoren (daily/aggregate) tek over derifraa.
 *
 * Krev SUPABASE-env — runnaren lastar .env foer dette blir kalla.
 */
import { getSupabase } from "@/lib/supabase";
import type { RunRecord } from "@/lib/runrecord";
import type { ShadowCheckRad } from "@/daily/types";

/**
 * Hentar alle RunRecords med run_type = "live" som starta innanfor
 * [fraa, til). Berre live — golden/discovery-koeyringar er test-agentens
 * domene og skal ikkje med i dagleg-signala.
 */
export async function fetchLiveRunRecords(
  fraa: Date,
  til: Date,
): Promise<RunRecord[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("runrecord")
    .select("*")
    .eq("run_type", "live")
    .gte("started_at", fraa.toISOString())
    .lt("started_at", til.toISOString());

  if (error) {
    throw new Error(`Klarte ikkje lese runrecord: ${error.message}`);
  }
  return (data as RunRecord[] | null) ?? [];
}

/**
 * Hentar shadow_checks-rader logga innanfor [fraa, til).
 */
export async function fetchShadowChecks(
  fraa: Date,
  til: Date,
): Promise<ShadowCheckRad[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("shadow_checks")
    .select(
      "run_id, check_id, deviation_found, expected, got, agent, " +
        "verdikt_da_sjekken_kjorte, er_farleg_feil_kandidat",
    )
    .gte("created_at", fraa.toISOString())
    .lt("created_at", til.toISOString());

  if (error) {
    throw new Error(`Klarte ikkje lese shadow_checks: ${error.message}`);
  }
  return ((data as unknown) as ShadowCheckRad[] | null) ?? [];
}
