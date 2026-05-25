import { sanitizeAiscGuardedOutputText } from "@/lib/international/display";
import type { CalculationStep, KeyResultCategory, ReportModel } from "./report-model";
import { localizeResultLabel } from "@/lib/international/display";

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

export function cleanFormulaText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\uFFFE/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


export function normalizeTitleTypography(value: unknown): string {
  return cleanReportText(value)
    .replace(/\s*—\s*/g, " — ")
    .replace(/\b(IPE|HEA|HEB|HEM|UNP|UPN)\s*(\d{2,4})\b/gi, (_, profile: string, number: string) => `${profile.toUpperCase()} ${number}`)
    .replace(/\s{2,}/g, " ")
    .trim();
}

const NOTATION_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bF_Ed,dim\b/g, "Ed,dim"],
  [/\bF_Ed,6\.10a\b/g, "Ed,6.10a"],
  [/\bF_Ed,6\.10b_q\b/g, "Ed,6.10b,q"],
  [/\bF_Ed,6\.10b_s\b/g, "Ed,6.10b,s"],

  [/\bF_Ed[,_ ]?dim\b/g, "Ed,dim"],
  [/\bEd_dim\b/g, "Ed,dim"],
  [/\bF_Ed_?6_10a\b/g, "Ed,6.10a"],
  [/\bEd_6_10a\b/g, "Ed,6.10a"],
  [/\bF_Ed_?6_10b_?q(?:_lead)?\b/g, "Ed,6.10b,q"],
  [/\bEd_6_10b_q(?:_lead)?\b/g, "Ed,6.10b,q"],
  [/\bF_Ed_?6_10b_?s(?:_lead)?\b/g, "Ed,6.10b,s"],
  [/\bEd_6_10b_s(?:_lead)?\b/g, "Ed,6.10b,s"],
  [/\bq_Ed_NA_6_10a\b/g, "qEd,NA 6.10a"],
  [/\bq_Ed_NA_6_10b\b/g, "qEd,NA 6.10b"],
  [/\bq_Ed_NA_governing\b/g, "qEd,NA styrende"],
  [/\bpsi0_q\b/g, "ψ0,q"],
  [/\bpsi0_s\b/g, "ψ0,s"],
  [/\bpsi_0_nyttelast_B\b/g, "ψ0,q"],
  [/\bpsi_0_snolast\b/g, "ψ0,s"],
  [/\bpsi_0_s\b/g, "ψ0,s"],
  [/\bpsi_0_q\b/g, "ψ0,q"],
  [/\bpsi0\b/gi, "ψ0"],
  [/\bgamma_M0\b/g, "γM0"],
  [/\bgamma_G_6_10a\b/g, "γG,6.10a"],
  [/\bgamma_G_610a\b/g, "γG,6.10a"],
  [/\bgamma_G_6_10b\b/g, "γG,6.10b"],
  [/\bgamma_G_610b\b/g, "γG,6.10b"],
  [/\bgamma_G\b/g, "γG"],
  [/\bgamma_Q\b/g, "γQ"],
  [/\beta_M\b/g, "ηM"],
  [/\beta_V\b/g, "ηV"],
  [/\bM_pl_Rd\b/g, "Mpl,Rd"],
  [/\bV_pl_Rd\b/g, "Vpl,Rd"],
  [/\bM_Rd\b/g, "MRd"],
  [/\bV_Rd\b/g, "VRd"],
  [/\bN_Rd\b/g, "NRd"],
  [/\bA_v\b/g, "Av"],
  [/\bA_s\b/g, "As"],
  [/\bf_y\b/g, "fy"],
  [/\bf_ck\b/g, "fck"],
  [/\bf_yk\b/g, "fyk"],
  [/\bt_f\b/g, "tf"],
  [/\bt_w\b/g, "tw"],
  [/\bW_pl,y\b/g, "Wpl,y"],
  [/\bqEd\b/g, "qEd"],
  [/\bMEd\b/g, "MEd"],
  [/\bVEd\b/g, "VEd"],
  [/\bNEd\b/g, "NEd"],
];

function stripTechnicalUnderscores(value: string): string {
  // PILAR-rapportane skal lese som ferdige fagnotat, ikkje rå agent-/kode-output.
  // Derfor fjernar vi tekniske understrekar i symbol overalt i rapporttekst
  // og lèt komma, greske teikn og kontekst bere subscripta visuelt.
  return value
    // Convert common LaTeX-ish subscript forms before removing raw underscores.
    .replace(/\b([A-Za-zΑ-Ωα-ω]+)_\{([^{}]+)\}/g, "$1$2")
    .replace(/\b([A-Za-zΑ-Ωα-ω]+)_([A-Za-z0-9]+)/g, "$1$2")
    .replace(/_/g, "")
    .replace(/\bFEd,dim\b/g, "Ed,dim")
    .replace(/\bFEd,6\.10a\b/g, "Ed,6.10a")
    .replace(/\bFEd,6\.10b,q\b/g, "Ed,6.10b,q")
    .replace(/\bFEd,6\.10b,s\b/g, "Ed,6.10b,s")
    .replace(/\bqEdNA610a\b/g, "qEd,NA 6.10a")
    .replace(/\bqEdNA610b\b/g, "qEd,NA 6.10b")
    .replace(/\bqEdNAgoverning\b/g, "qEd,NA styrende")
    .replace(/\bqEdNA\b/g, "qEd,NA")
    .replace(/\bEd610a\b/g, "Ed,6.10a")
    .replace(/\bEd610bq\b/g, "Ed,6.10b,q")
    .replace(/\bEd610bs\b/g, "Ed,6.10b,s")
    .replace(/\bMplRd\b/g, "Mpl,Rd")
    .replace(/\bVplRd\b/g, "Vpl,Rd")
    .replace(/\bWply\b/g, "Wpl,y")
    .replace(/\bAvz\b/g, "Av,z")
    .replace(/\bMRd\b/g, "MRd")
    .replace(/\bVRd\b/g, "VRd")
    .replace(/\bNRd\b/g, "NRd")
    .replace(/\bFEd610a\b/g, "Ed,6.10a")
    .replace(/\bFEd610bq\b/g, "Ed,6.10b,q")
    .replace(/\bFEd610bs\b/g, "Ed,6.10b,s")
    .replace(/\bpsi0\b/gi, "ψ0")
    .replace(/\bgammaM0\b/g, "γM0")
    .replace(/\bgammaG\b/g, "γG")
    .replace(/\bgammaQ\b/g, "γQ");
}

export function normalizeNotationText(value: string): string {
  const normalized = NOTATION_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  );
  return stripTechnicalUnderscores(normalized);
}

export function normalizeCalculationSyntaxText(value: unknown): string {
  if (typeof value !== "string") return "";
  return cleanReportText(value)
    // Fix the most common calculation-line remnants after underscore removal.
    .replace(/\bFE?d,?dim\b/g, "Ed,dim")
    .replace(/\bFEd,?6\.10a\b/g, "Ed,6.10a")
    .replace(/\bFEd,?6\.10b,?q\b/g, "Ed,6.10b,q")
    .replace(/\bFEd,?6\.10b,?s\b/g, "Ed,6.10b,s")
    .replace(/\bMplRd\b/g, "Mpl,Rd")
    .replace(/\bVplRd\b/g, "Vpl,Rd")
    .replace(/\bWply\b/g, "Wpl,y")
    .replace(/\bAvz\b/g, "Av,z")
    .replace(/\betam\b/gi, "ηM")
    .replace(/\betav\b/gi, "ηV")
    .replace(/\balpha_z\b|\balphaz\b/g, "αz")
    .replace(/\bGammaM1\b|\bgammaM1\b/g, "γM1")
    .replace(/\blambda_1\b|\blambda1\b/g, "λ1")
    .replace(/\bbarlambda_z\b|\blambdazbar\b|\blambdabarz\b/g, "λ̄z")
    .replace(/\bphi_z\b|\bphiz\b/g, "φz")
    .replace(/\bchi_z\b|\bchiz\b/g, "χz")
    .replace(/\bNbRd\b/g, "Nb,Rd");
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
    .replace(/f_ed/g, "ed")
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
    eddim: "Ed,dim",
    ed610a: "Ed,6.10a",
    ed610bq: "Ed,6.10b (qk ledende)",
    ed610bs: "Ed,6.10b (sk ledende)",
    qedna610a: "qEd,NA 6.10a",
    qedna610b: "qEd,NA 6.10b",
    qednagoverning: "qEd,NA styrende",
    qk: "qk",
    gk: "gk",
    sk: "sk",
    qed: "qEd",
    med: "MEd",
    ved: "VEd",
    ned: "NEd",
    l: "L",
    psi0q: "ψ0,q",
    psi0s: "ψ0,s",
    gammaq: "γQ",
    gammam0: "γM0",
    gammag: "γG",
    gammag610a: "γG,6.10a",
    gammag610b: "γG,6.10b",
    psi0nyttelastb: "ψ0,q",
    psi0snolast: "ψ0,s",
    etam: "ηM",
    etav: "ηV",
    mplrd: "Mpl,Rd",
    vplrd: "Vpl,Rd",
    vplrdhalv: "0,5·Vpl,Rd",
    wply: "Wpl,y",
    fy: "fy",
    av: "Av",
    epsilon: "ε",
    cftf: "cf/tf",
    cwtw: "cw/tw",
    alphaz: "αz",
    alpha: "α",
    lambda1: "λ1",
    lambda_1: "λ1",
    lambdabarz: "λ̄z",
    lambdazbar: "λ̄z",
    barlambda_z: "λ̄z",
    phiz: "φz",
    phi_z: "φz",
    chiz: "χz",
    chi_z: "χz",
    gammam1: "γM1",
    nbrd: "Nb,Rd",
    iz: "iz",
    izz: "Iz",
    lcr: "Lcr",
  };
  if (known[canonical]) return known[canonical];

  return original
    .replace(/_/g, "")
    .replace(/psi0/gi, "ψ0")
    .replace(/gamma/gi, "γ")
    .replace(/^ed/i, "Ed")
    .replace(/^med$/i, "MEd")
    .replace(/^ved$/i, "VEd");
}

export function resultPriorityScore(key: string): number {
  const canonical = canonicalResultKey(key);
  const priority: Record<string, number> = {
    eddim: 0,
    med: 1,
    ved: 2,
    etam: 3,
    etav: 4,
    mplrd: 5,
    vplrd: 6,
    qed: 7,
    ed610bq: 8,
    ed610bs: 9,
    ed610a: 10,
    qedna610b: 11,
    qedna610a: 12,
    qednagoverning: 13,
    l: 20,
    qk: 21,
    gk: 22,
    sk: 23,
    psi0q: 40,
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

  // Pure numeric values with decimal comma/dot must stay intact. Without this
  // guard the fallback regex may backtrack and split "0,70" into value "0"
  // and unit ",70", which prints as "0 ,70" in PDF/Word.
  if (/^-?[\d\s]+(?:[,.]\d+)?$/u.test(text)) {
    return { value: text, unit: null };
  }

  const match = text.match(/^(-?[\d\s.,]+)\s*([^\d\s].*)$/u);
  if (!match) return { value: text, unit: null };
  return { value: match[1].trim(), unit: match[2].trim() || null };
}

export function categorizeResultKey(key: string): KeyResultCategory {
  const normalized = key.trim().toLowerCase();
  const canonical = canonicalResultKey(key);
  if (/^(ed|med|ved|ned|qed|mrd|vrd|mplrd|vplrd|eta|utnytt)/.test(canonical) || DIMENSJONERANDE_RE.test(normalized)) {
    return "diwhilejonerande";
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
    return value.map(cleanFormulaText).filter(Boolean);
  }
  const cleaned = cleanFormulaText(value);
  return cleaned ? [cleaned] : [];
}

export function normalizeCalculationStep(
  raw: { title?: unknown; text?: unknown; latex_formula?: unknown },
  index: number,
): CalculationStep {
  const title = normalizeCalculationSyntaxText(raw.title) || `Steg ${index + 1}`;
  const prose = normalizeCalculationSyntaxText(raw.text);
  return {
    id: `step-${String(index + 1).padStart(2, "0")}`,
    number: index + 1,
    title,
    prose,
    formulas: normalizeFormulaList(raw.latex_formula),
    isControlStep: isControlStepTitle(title),
  };
}


function normalizeResultRow<T extends { label: string; value: string; unit: string | null; raw: string }>(row: T): T {
  return {
    ...row,
    label: displayResultLabel(row.label),
    value: cleanReportText(row.value),
    unit: row.unit ? cleanReportText(row.unit) : null,
    raw: cleanReportText(row.raw),
  };
}

export function normalizeReportModel(model: ReportModel): ReportModel {
  const displayLanguage = model.meta.displayLanguage ?? model.meta.locale;
  return {
    ...model,
    cover: {
      ...model.cover,
      title: normalizeTitleTypography(model.cover.title),
      subtitle: normalizeTitleTypography(model.cover.subtitle),
      shortSummary: limitText(model.cover.shortSummary, 340),
      qrLabel: cleanReportText(model.cover.qrLabel),
      qrDescription: cleanReportText(model.cover.qrDescription),
    },
    keyResults: model.keyResults.map(normalizeResultRow),
    summary: {
      text: cleanReportText(model.summary.text),
      request: cleanReportText(model.summary.request),
    },
    interpretation: {
      ...model.interpretation,
      status: cleanReportText(model.interpretation.status),
      assumptions: model.interpretation.assumptions.map(cleanReportText).filter(Boolean),
    },
    calculation: {
      resultRows: model.calculation.resultRows.map(normalizeResultRow),
      steps: model.calculation.steps.map((step) => ({
        ...step,
        title: normalizeCalculationSyntaxText(step.title),
        prose: normalizeCalculationSyntaxText(step.prose),
        formulas: step.formulas.map(cleanFormulaText).filter(Boolean),
      })),
    },
    assessment: {
      professionalAssessment: cleanReportText(model.assessment.professionalAssessment),
      limitations: model.assessment.limitations.map(cleanReportText).filter(Boolean),
      warnings: model.assessment.warnings.map(cleanReportText).filter(Boolean),
    },
    control: {
      ...model.control,
      decision: cleanReportText(model.control.decision),
      controllerText: cleanReportText(model.control.controllerText),
      comparisonText: cleanReportText(model.control.comparisonText),
      comparisonRows: model.control.comparisonRows.map((row) => ({
        ...row,
        label: localizeResultLabel(displayResultLabel(row.label), displayLanguage),
        constructorA: cleanReportText(row.constructorA),
        constructorB: cleanReportText(row.constructorB),
      })),
      pipelineStatus: model.control.pipelineStatus.map((row) => ({
        ...row,
        label: cleanReportText(row.label),
        value: cleanReportText(row.value),
      })),
    },
    conclusion: cleanReportText(model.conclusion),
    disclaimer: cleanReportText(model.disclaimer),
  };
}
