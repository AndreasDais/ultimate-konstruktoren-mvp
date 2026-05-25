/**
 * FIKS 5 (F3): normalisering av internal_consistency_issues frå Comparator.
 *
 * Selvkontroll-teljaren på resultat-sida tel oppføringane i
 * internal_consistency_issues. Ein inkonsistens-fri konstruktør skal gi ei
 * TOM liste — men språkmodellen legg av og til inn ei placeholder-oppføring
 * med tekst som «ingen inkonsistensar funne». Den blir då feilaktig talt som
 * éin inkonsistens («2 inkonsistensar funne» når svaret eigentleg er 0).
 *
 * Denne modulen droppar slike placeholder-oppføringar deterministisk, slik at
 * only reelle inkonsistensar står att. Rein, sideeffektfri.
 */

/** Tekstmønster som avslører ei «ingen funne»-placeholder-oppføring. */
const NO_ISSUE_PATTERN =
  /\b(ingen|inga)\b.*\b(inkonsisten|avvik|funn|problem|feil)/i;

/**
 * Sann viss oppføringa skildrar ein FAKTISK inkonsistens — altså har eit
 * ikkje-tomt issue-felt som ikkje only seier «ingen funne».
 */
export function isRealIssue(entry: unknown): boolean {
  if (!entry || typeof entry !== "object") return false;
  const issue = (entry as { issue?: unknown }).issue;
  if (typeof issue !== "string") return false;
  const trimmed = issue.trim();
  if (trimmed.length === 0) return false;
  if (NO_ISSUE_PATTERN.test(trimmed)) return false;
  return true;
}

/**
 * Reinsar internal_consistency_issues: behaldar only reelle inkonsistensar
 * i begge listene. Degraderer trygt på manglande/feilforma input.
 */
export function normalizeConsistencyIssues(raw: unknown): {
  agent_a: unknown[];
  agent_b: unknown[];
} {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const clean = (v: unknown): unknown[] =>
    Array.isArray(v) ? v.filter(isRealIssue) : [];
  return { agent_a: clean(obj.agent_a), agent_b: clean(obj.agent_b) };
}