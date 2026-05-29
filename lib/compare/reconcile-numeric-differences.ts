/**
 * Reconcile LLM-rapporterte `numeric_differences` (frå Samanliknaren/agent_c)
 * mot den deterministiske kode-jamføringa (compareResults).
 *
 * Behald BERRE rader der feltet matchar ein PARA nøkkel (rapportert av BEGGE
 * konstruktørane), og overstyr A/B-verdiar + percent_diff med dei kode-rekna
 * fasit-verdiane. Droppar alt anna:
 *  - upara nøklar (berre éin konstruktør rapporterte) — F1: ikkje eit avvik
 *  - HALLUSINERTE felt (verken para eller upara) — LLM fann opp ein nøkkel som
 *    ingen konstruktør rapporterte. Den gamle inline-koden i ruta slapp desse
 *    gjennom uendra (`if (!hit) return d`) med LLM-dikta verdiar til UI + DB.
 *
 * Rein og sideeffektfri. Matchar nøklar via normalizeResultKey, så LLM-en kan
 * stave feltet litt annleis enn konstruktøren utan å miste raden.
 */
import { normalizeResultKey, type ResultComparison } from "./result-compare";

/** Lausare form av ei numeric_differences-rad — vi les berre field/percent_diff. */
export type LlmNumericDifference = {
  field?: unknown;
  percent_diff?: unknown;
  [k: string]: unknown;
};

export type ReconciledNumericDifference = Record<string, unknown> & {
  field: string;
  agent_a_value: string;
  agent_b_value: string;
  percent_diff: number | null;
};

export function reconcileNumericDifferences(
  llmRows: unknown,
  comparison: ResultComparison,
): ReconciledNumericDifference[] {
  if (!Array.isArray(llmRows)) return [];

  const pairedByNorm = new Map(
    comparison.paired.map((p) => [normalizeResultKey(p.key), p]),
  );

  const out: ReconciledNumericDifference[] = [];
  for (const raw of llmRows) {
    const row = (raw ?? {}) as LlmNumericDifference;
    const hit = pairedByNorm.get(normalizeResultKey(String(row.field ?? "")));
    if (!hit) continue; // droppar upara OG hallusinerte felt

    out.push({
      ...row,
      // Behald LLM si skrivemåte av feltet (som før); fall til kanonisk nøkkel.
      field: typeof row.field === "string" ? row.field : hit.key,
      // Kode er fasit for tala.
      agent_a_value: hit.aValue,
      agent_b_value: hit.bValue,
      percent_diff:
        hit.percentDiff === null
          ? typeof row.percent_diff === "number"
            ? row.percent_diff
            : null
          : Math.round(hit.percentDiff * 10) / 10,
    });
  }
  return out;
}
