/**
 * Byggjer radene for Mission Control sin samanliknings-tabell (Comparator-
 * panelet) ved hjelp av den DETERMINISTISKE nøkkel-paringa i result-compare.
 *
 * Bakgrunn (rota til feilen): panelet bygde tidlegare tabellen med rå,
 * teikn-eksakt nøkkel-oppslag (`resultsB[field]`) over ein union der A sine
 * nøklar kom først og lista vart kappa til 6. Når Konstruktør B stava ein
 * resultat-nøkkel bittelitt annleis enn Konstruktør A — komma vs understrek,
 * store/små bokstavar, punktum — bomma oppslaget. Då fall B-kolonnen til «—»
 * medan A alltid vart vist (A sine nøklar bygde tabellen), og avviket fall
 * til 0. Skrivemåte-drift mellom dei to uavhengige konstruktørane er ikkje-
 * deterministisk per køyring, så feilen var intermitterande.
 *
 * Denne modulen parar i staden via `normalizeResultKey` — same kode som
 * Samanliknaren (agent_c) brukar — så B-verdiane dukkar opp uavhengig av
 * skrivemåte, avvika blir eining-aware og kode-rekna, og nøklar berre éin
 * side rapporterte hamnar i eigne only_a/only_b-rader (ikkje falske 0 %).
 */
import { compareResults, normalizeResultKey } from "./result-compare";

export type ComparatorSeverity = "low" | "medium" | "high" | "critical";

export type ComparatorRow = {
  /** Vist nøkkel — A si skrivemåte for para rader, original for upara. */
  field: string;
  /** Rå verdi frå Konstruktør A, eller «—» når berre B rapporterte. */
  valueA: string;
  /** Rå verdi frå Konstruktør B, eller «—» når berre A rapporterte. */
  valueB: string;
  /** Kode-rekna relativt avvik (%). null = ikkje samanliknbart (upara/ikkje-numerisk). */
  percentDiff: number | null;
  severity: ComparatorSeverity;
  kind: "paired" | "only_a" | "only_b";
};

export type ComparatorTable = {
  /** Para rader først, så upara. Kappa til `limit`. */
  rows: ComparatorRow[];
  /** Tal på para nøklar (før kapping). */
  pairedCount: number;
  /** Tal på para numeriske avvik >= terskelen (5 %), før kapping. */
  aboveThresholdCount: number;
  /** Største para numeriske avvik (%); 0 når ingen numeriske par finst. */
  maxPercentDiff: number;
  /** Sann berre når det finst minst eitt numerisk par, alle er 0 %, og ingen upara nøklar. */
  allAgree: boolean;
};

/** Lausare form enn ComparisonResult["numeric_differences"] — vi les berre field/severity. */
type NumericDifferenceLike = {
  field?: string;
  percent_diff?: number;
  severity?: ComparatorSeverity;
};

const PLACEHOLDER = "—";
const THRESHOLD_PCT = 5;

/** Avled alvorsgrad frå avvik når Samanliknaren ikkje gav ein. */
function severityFromPercent(pct: number | null): ComparatorSeverity {
  if (pct === null || pct < THRESHOLD_PCT) return "low";
  if (pct < 15) return "medium";
  return "high";
}

export function buildComparatorTable(
  resultsA: Record<string, string> | null | undefined,
  resultsB: Record<string, string> | null | undefined,
  numericDifferences: NumericDifferenceLike[] = [],
  limit = 6,
): ComparatorTable {
  const a = resultsA ?? {};
  const b = resultsB ?? {};
  const cmp = compareResults(a, b);

  // Severity frå Samanliknaren, slått opp på NORMALISERT nøkkel — same
  // robuste matching som verdiane. Fyrste førekomst vinn.
  const sevByNorm = new Map<string, ComparatorSeverity>();
  for (const d of numericDifferences) {
    if (d && typeof d.field === "string" && d.severity) {
      const n = normalizeResultKey(d.field);
      if (!sevByNorm.has(n)) sevByNorm.set(n, d.severity);
    }
  }

  const pairedRows: ComparatorRow[] = cmp.paired.map((p) => ({
    field: p.key,
    valueA: p.aValue || PLACEHOLDER,
    valueB: p.bValue || PLACEHOLDER,
    percentDiff: p.percentDiff,
    severity:
      sevByNorm.get(normalizeResultKey(p.key)) ??
      severityFromPercent(p.percentDiff),
    kind: "paired",
  }));

  const onlyARows: ComparatorRow[] = cmp.onlyA.map((key) => ({
    field: key,
    valueA: a[key] || PLACEHOLDER,
    valueB: PLACEHOLDER,
    percentDiff: null,
    severity: "low",
    kind: "only_a",
  }));

  const onlyBRows: ComparatorRow[] = cmp.onlyB.map((key) => ({
    field: key,
    valueA: PLACEHOLDER,
    valueB: b[key] || PLACEHOLDER,
    percentDiff: null,
    severity: "low",
    kind: "only_b",
  }));

  const numericPaired = cmp.paired
    .map((p) => p.percentDiff)
    .filter((x): x is number => x !== null);
  const maxPercentDiff = numericPaired.reduce((m, x) => Math.max(m, x), 0);
  const aboveThresholdCount = numericPaired.filter((x) => x >= THRESHOLD_PCT).length;
  const allAgree =
    numericPaired.length > 0 &&
    cmp.onlyA.length === 0 &&
    cmp.onlyB.length === 0 &&
    numericPaired.every((x) => x === 0);

  return {
    rows: [...pairedRows, ...onlyARows, ...onlyBRows].slice(0, limit),
    pairedCount: cmp.paired.length,
    aboveThresholdCount,
    maxPercentDiff,
    allAgree,
  };
}
