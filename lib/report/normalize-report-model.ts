import type { CalculationStep, KeyResultCategory, ReportModel } from "./report-model";

const CONTROL_STEP_RE = /\b(kontroll|kryss-?sjekk|kryss-?kontroll|verifikasjon|verifiser|konsistens|likevekt|sjekk|oppsummering)\b/i;
const DIMENSJONERANDE_RE = /^(ed|e_d|m_ed|v_ed|n_ed|q_ed|mrd|vrd|m_rd|v_rd|eta|η|utnytt)/i;
const INPUT_RE = /^(g_k|q_k|s_k|l|b|h|d|t|a|f|fy|fyk|fck|profil|spenn|lengde|gamma|γ|psi|ψ)/i;

export function cleanReportText(value: unknown): string {
  if (typeof value !== "string") return "";
  return normalizeNotationText(
    value
      .replace(/\r\n/g, "\n")
      .replace(/\uFFFE/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n"),
  ).trim();
}

export function compactReportText(value: unknown): string {
  return cleanReportText(value).replace(/\s+/g, " ").trim();
}

const NOTATION_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bEd_dim\b/g, "E_d,dim"],
  [/\bEd_6_10a\b/g, "E_d,6.10a"],
  [/\bEd_6_10b_q(?:_lead)?\b/g, "E_d,6.10b,q"],
  [/\bEd_6_10b_s(?:_lead)?\b/g, "E_d,6.10b,s"],
  [/\bpsi0_q\b/g, "ψ_0,q"],
  [/\bpsi0_s\b/g, "ψ_0,s"],
  [/\bpsi0\b/gi, "ψ_0"],
  [/\bgamma_G_6_10a\b/g, "γ_G,6.10a"],
  [/\bgamma_G_610a\b/g, "γ_G,6.10a"],
  [/\bgamma_G_6_10b\b/g, "γ_G,6.10b"],
  [/\bgamma_G_610b\b/g, "γ_G,6.10b"],
  [/\bgamma_G\b/g, "γ_G"],
  [/\bgamma_Q\b/g, "γ_Q"],
  [/\bqEd\b/g, "q_Ed"],
  [/\bMEd\b/g, "M_Ed"],
  [/\bVEd\b/g, "V_Ed"],
  [/\bNEd\b/g, "N_Ed"],
];

export function normalizeNotationText(value: string): string {
  return NOTATION_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  );
}


export function canonicalResultKey(key: string): string {
  const normalized = key
    .trim()
    .toLowerCase()
    .replace(/ψ/g, "psi")
    .replace(/γ/g, "gamma")
    .replace(/\s+/g, "")
    .replace(/[,.;:()\[\]{}-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return normalized
    .replace(/_lead$|lead$/g, "")
    .replace(/_ledende$|ledende$/g, "")
    .replace(/6_10/g, "610")
    .replace(/6\.10/g, "610")
    .replace(/e_d/g, "ed")
    .replace(/m_ed/g, "med")
    .replace(/v_ed/g, "ved")
    .replace(/n_ed/g, "ned")
    .replace(/psi_0/g, "psi0")
    .replace(/gamma_g/g, "gammag")
    .replace(/gamma_q/g, "gammaq")
    .replace(/_/g, "")
    .replace(/^ed610bqk$/, "ed610bq")
    .replace(/^ed610bsk$/, "ed610bs");
}

export function displayResultLabel(key: string): string {
  const original = cleanReportText(key);
  const canonical = canonicalResultKey(original);
  const known: Record<string, string> = {
    eddim: "E_d,dim",
    ed610a: "E_d,6.10a",
    ed610bq: "E_d,6.10b (q_k ledende)",
    ed610bs: "E_d,6.10b (s_k ledende)",
    qk: "q_k",
    gk: "g_k",
    sk: "s_k",
    qed: "q_Ed",
    med: "M_Ed",
    ved: "V_Ed",
    ned: "N_Ed",
    l: "L",
    psi0q: "ψ_0,q",
    psi0s: "ψ_0,s",
    gammaq: "γ_Q",
    gammag610a: "γ_G,6.10a",
    gammag610b: "γ_G,6.10b",
  };
  if (known[canonical]) return known[canonical];

  return original
    .replace(/_/g, "_")
    .replace(/psi0/gi, "ψ_0")
    .replace(/gamma/gi, "γ")
    .replace(/^ed/i, "E_d")
    .replace(/^med$/i, "M_Ed")
    .replace(/^ved$/i, "V_Ed");
}

export function resultPriorityScore(key: string): number {
  const canonical = canonicalResultKey(key);
  const priority: Record<string, number> = {
    eddim: 0,
    med: 1,
    ved: 2,
    qed: 3,
    ed610bq: 4,
    ed610bs: 5,
    ed610a: 6,
    l: 10,
    qk: 11,
    gk: 12,
    sk: 13,
    psi0q: 30,
    psi0s: 31,
    gammaq: 32,
    gammag610a: 33,
    gammag610b: 34,
  };
  return priority[canonical] ?? 60;
}

export function limitText(value: string, maxChars: number): string {
  const text = compactReportText(value);
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars - 1).trimEnd();
  const lastSentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (lastSentence > maxChars * 0.55) return `${cut.slice(0, lastSentence + 1).trim()} …`;
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, Math.max(0, lastSpace)).trim()} …`;
}

export function splitValueUnit(raw: string): { value: string; unit: string | null } {
  const text = compactReportText(raw);
  if (!text) return { value: "", unit: null };
  const match = text.match(/^(-?[\d\s.,]+)\s*([^\d\s].*)$/u);
  if (!match) return { value: text, unit: null };
  return { value: match[1].trim(), unit: match[2].trim() || null };
}

export function categorizeResultKey(key: string): KeyResultCategory {
  const normalized = key.trim().toLowerCase();
  const canonical = canonicalResultKey(key);
  if (/^(ed|med|ved|ned|qed|mrd|vrd|eta|utnytt)/.test(canonical) || DIMENSJONERANDE_RE.test(normalized)) {
    return "dimensjonerande";
  }
  if (/^(gk|qk|sk|l|b|h|d|psi|gamma|fyk|fck|fy|profil|spenn)/.test(canonical) || INPUT_RE.test(normalized)) {
    return "input";
  }
  if (/kontroll|utnytt|eta|η|ratio|samsvar/.test(normalized)) return "kontroll";
  return "anna";
}

export function isControlStepTitle(title: string): boolean {
  return CONTROL_STEP_RE.test(title);
}

export function normalizeFormulaList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(cleanReportText).filter(Boolean);
  }
  const cleaned = cleanReportText(value);
  return cleaned ? [cleaned] : [];
}

export function normalizeCalculationStep(
  raw: { title?: unknown; text?: unknown; latex_formula?: unknown },
  index: number,
): CalculationStep {
  const title = cleanReportText(raw.title) || `Steg ${index + 1}`;
  const prose = cleanReportText(raw.text);
  return {
    id: `step-${String(index + 1).padStart(2, "0")}`,
    number: index + 1,
    title,
    prose,
    formulas: normalizeFormulaList(raw.latex_formula),
    isControlStep: isControlStepTitle(title),
  };
}

export function normalizeReportModel(model: ReportModel): ReportModel {
  return {
    ...model,
    cover: {
      ...model.cover,
      shortSummary: limitText(model.cover.shortSummary, 340),
    },
    summary: {
      text: cleanReportText(model.summary.text),
      request: cleanReportText(model.summary.request),
    },
    interpretation: {
      ...model.interpretation,
      assumptions: model.interpretation.assumptions.map(cleanReportText).filter(Boolean),
    },
    assessment: {
      professionalAssessment: cleanReportText(model.assessment.professionalAssessment),
      limitations: model.assessment.limitations.map(cleanReportText).filter(Boolean),
      warnings: model.assessment.warnings.map(cleanReportText).filter(Boolean),
    },
    conclusion: cleanReportText(model.conclusion),
    disclaimer: cleanReportText(model.disclaimer),
  };
}
