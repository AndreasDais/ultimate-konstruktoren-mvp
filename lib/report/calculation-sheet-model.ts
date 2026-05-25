import { localizeResultLabel, polishEnglishGeneratedText, inferCalculationEnglishDisplay } from "@/lib/international/display";
import type { PilarDisplayLanguage } from "@/lib/international/display";
import type { Locale } from "@/lib/locale";
import type { CalculationStep, ReportModel } from "./report-model";
import {
  cleanReportText,
  displayResultLabel,
  normalizeCalculationSyntaxText,
} from "./normalize-report-model";

export const CALCULATION_SHEET_MODEL_VERSION = "calculation_sheet_v0.1";

export type CalculationSheetMeta = {
  schemaVersion: typeof CALCULATION_SHEET_MODEL_VERSION;
  runId: string;
  documentId: string;
  title: string;
  subtitle: string;
  date: string;
  status: string;
  displayLanguage?: PilarDisplayLanguage;
  locale: Locale;
  reportUrl: string;
};

export type CalculationGiven = {
  label: string;
  latex: string;
  value: string;
  unit: string | null;
  description?: string;
};

export type CalculationFormula = {
  latex: string;
  plain: string;
};

export type CalculationSheetStep = {
  id: string;
  number: number;
  title: string;
  explanation: string;
  formulas: CalculationFormula[];
  isControlStep: boolean;
};

export type CalculationSheetResult = {
  label: string;
  latex: string;
  value: string;
  unit: string | null;
};

export type CalculationSheetModel = {
  meta: CalculationSheetMeta;
  given: CalculationGiven[];
  assumptions: string[];
  steps: CalculationSheetStep[];
  results: CalculationSheetResult[];
  notes: string[];
};

const KNOWN_SYMBOL_LATEX: Record<string, string> = {
  MEd: "M_{Ed}",
  VEd: "V_{Ed}",
  NEd: "N_{Ed}",
  qEd: "q_{Ed}",
  Ed: "E_d",
  "Ed,dim": "E_{d,dim}",
  "Ed,6.10a": "E_{d,6.10a}",
  "Ed,6.10b,q": "E_{d,6.10b,q}",
  "Ed,6.10b,s": "E_{d,6.10b,s}",
  "Ed,6.10b (qk ledende)": "E_{d,6.10b,q}",
  "Ed,6.10b (sk ledende)": "E_{d,6.10b,s}",
  "qEd,NA 6.10a": "q_{Ed,NA,6.10a}",
  "qEd,NA 6.10b": "q_{Ed,NA,6.10b}",
  "qEd,NA styrende": "q_{Ed,NA}",
  qk: "q_k",
  gk: "g_k",
  sk: "s_k",
  L: "L",
  fy: "f_y",
  E: "E",
  Lcr: "L_{cr}",
  iz: "i_z",
  Iz: "I_z",
  alpha: "\\alpha",
  alphaz: "\\alpha_z",
  alpha_z: "\\alpha_z",
  "α": "\\alpha",
  "αz": "\\alpha_z",
  lambda1: "\\lambda_1",
  lambda_1: "\\lambda_1",
  "λ1": "\\lambda_1",
  barlambda_z: "\\bar{\\lambda}_z",
  lambdabarz: "\\bar{\\lambda}_z",
  lambdazbar: "\\bar{\\lambda}_z",
  "λ̄z": "\\bar{\\lambda}_z",
  phiz: "\\phi_z",
  "φz": "\\phi_z",
  chiz: "\\chi_z",
  "χz": "\\chi_z",
  NbRd: "N_{b,Rd}",
  "Nb,Rd": "N_{b,Rd}",
  fyk: "f_{yk}",
  fck: "f_{ck}",
  Av: "A_v",
  "Av,z": "A_{v,z}",
  Wply: "W_{pl,y}",
  "Wpl,y": "W_{pl,y}",
  MplRd: "M_{pl,Rd}",
  "Mpl,Rd": "M_{pl,Rd}",
  VplRd: "V_{pl,Rd}",
  "Vpl,Rd": "V_{pl,Rd}",
  MRd: "M_{Rd}",
  VRd: "V_{Rd}",
  NRd: "N_{Rd}",
  "0,5·Vpl,Rd": "0{,}5 \\cdot V_{pl,Rd}",
  "γG": "\\gamma_G",
  "γQ": "\\gamma_Q",
  "γM0": "\\gamma_{M0}",
  "γM1": "\\gamma_{M1}",
  "γG,6.10a": "\\gamma_{G,6.10a}",
  "γG,6.10b": "\\gamma_{G,6.10b}",
  "ψ0": "\\psi_0",
  "ψ0,q": "\\psi_{0,q}",
  "ψ0,s": "\\psi_{0,s}",
  "ηM": "\\eta_M",
  "ηV": "\\eta_V",
  "ε": "\\varepsilon",
  "cf/tf": "c_f/t_f",
  "cw/tw": "c_w/t_w",
};

export function latexForSymbol(label: string): string {
  const cleaned = cleanReportText(displayResultLabel(label));
  if (KNOWN_SYMBOL_LATEX[cleaned]) return KNOWN_SYMBOL_LATEX[cleaned];

  if (/^qEd,NA 6\.10a$/i.test(cleaned)) return "q_{Ed,NA,6.10a}";
  if (/^qEd,NA 6\.10b$/i.test(cleaned)) return "q_{Ed,NA,6.10b}";
  if (/^qEd,NA styrende$/i.test(cleaned)) return "q_{Ed,NA}";

  return cleaned
    .replace(/([A-Za-z])Ed\b/g, "$1_{Ed}")
    .replace(/([A-Za-z])Rd\b/g, "$1_{Rd}")
    .replace(/qk\b/g, "q_k")
    .replace(/gk\b/g, "g_k")
    .replace(/sk\b/g, "s_k")
    .replace(/γG\b/g, "\\gamma_G")
    .replace(/γQ\b/g, "\\gamma_Q")
    .replace(/γM0\b/g, "\\gamma_{M0}")
    .replace(/ψ0\b/g, "\\psi_0")
    .replace(/ηM\b/g, "\\eta_M")
    .replace(/ηV\b/g, "\\eta_V")
    .replace(/gammaM1\b|GammaM1\b/g, "\\gamma_{M1}")
    .replace(/lambda_1\b|lambda1\b/g, "\\lambda_1")
    .replace(/barlambda_z\b|lambdazbar\b|lambdabarz\b/g, "\\bar{\\lambda}_z")
    .replace(/alpha_z\b|alphaz\b/g, "\\alpha_z")
    .replace(/alpha\b/g, "\\alpha")
    .replace(/phiz\b/g, "\\phi_z")
    .replace(/chiz\b/g, "\\chi_z")
    .replace(/NbRd\b|Nb,Rd\b/g, "N_{b,Rd}")
    .replace(/Lcr\b/g, "L_{cr}")
    .replace(/Iz\b/g, "I_z")
    .replace(/iz\b/g, "i_z");
}

function normalizeEngineeringDisplaySymbols(value: string): string {
  return cleanReportText(value)
    .replace(/\\alpha_z\b|\balpha_z\b|\balphaz\b/g, "αz")
    .replace(/\\alpha\b|\balpha\b/g, "α")
    .replace(/\\lambda_1\b|\blambda_1\b|\blambda1\b/g, "λ1")
    .replace(/\\bar\{\\lambda\}_z|\bbarlambda_z\b|\blambdazbar\b|\blambdabarz\b/g, "λ̄z")
    .replace(/\\phi_z\b|\bphi_z\b|\bphiz\b/g, "φz")
    .replace(/\\chi_z\b|\bchi_z\b|\bchiz\b/g, "χz")
    .replace(/\\gamma_\{M1\}|\bGammaM1\b|\bgammaM1\b/g, "γM1")
    .replace(/\bNbRd\b/g, "Nb,Rd")
    .replace(/\bNBRd\b/g, "Nb,Rd")
    .replace(/\bLcr\b/g, "Lcr")
    .replace(/\bIz\b/g, "Iz")
    .replace(/\biz\b/g, "iz");
}

function normalizeEngineeringUnits(value: string): string {
  return value
    .replace(/mm\^2|mm2/g, "mm²")
    .replace(/cm\^2|cm2/g, "cm²")
    .replace(/cm\^3|cm3/g, "cm³")
    .replace(/cm\^4|cm4/g, "cm⁴")
    .replace(/m\^2|m2/g, "m²")
    .replace(/N\/mm\^2|N\/mm2/g, "N/mm²");
}

function normalizeEngineeringFormulaPlain(value: string): string {
  return normalizeEngineeringUnits(normalizeEngineeringDisplaySymbols(value))
    .replace(/\bsqrt\s*\(([^()]+)\)/gi, "√($1)")
    .replace(/\bpi\b/g, "π")
    .replace(/\btimes\b/g, "×")
    .replace(/\bcdot\b/g, "·")
    .replace(/\^2\b/g, "²")
    .replace(/\^3\b/g, "³")
    .replace(/\^4\b/g, "⁴")
    .replace(/\bλ̄z2\b/g, "λ̄z²")
    .replace(/\bφz2\b/g, "φz²")
    .replace(/\bχz2\b/g, "χz²")
    .replace(/\s+/g, " ")
    .trim();
}

function displayCalculationLabel(label: string, displayLanguage: PilarDisplayLanguage = "nb"): string {
  return localizeResultLabel(normalizeEngineeringDisplaySymbols(displayResultLabel(label)), displayLanguage);
}

function uniqueByLabel<T extends { label: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = row.label.toLowerCase().replace(/[^a-z0-9æøåγψηε]/gi, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function resultToCalculationResult(row: {
  label: string;
  value: string;
  unit: string | null;
}, displayLanguage: PilarDisplayLanguage): CalculationSheetResult {
  const label = displayCalculationLabel(row.label, displayLanguage);
  return {
    label,
    latex: latexForSymbol(label),
    value: cleanReportText(row.value),
    unit: row.unit ? cleanReportText(row.unit) : null,
  };
}

function resultToGiven(row: {
  label: string;
  value: string;
  unit: string | null;
}, displayLanguage: PilarDisplayLanguage): CalculationGiven {
  const label = displayCalculationLabel(row.label, displayLanguage);
  return {
    label,
    latex: latexForSymbol(label),
    value: cleanReportText(row.value),
    unit: row.unit ? cleanReportText(row.unit) : null,
  };
}

function normalizeCalculationSheetPlainText(value: string): string {
  return normalizeEngineeringUnits(normalizeEngineeringDisplaySymbols(value))
    .replace(/\bpsi0\b/gi, "ψ0")
    .replace(/\bgammaG\b/g, "γG")
    .replace(/\bgammaQ\b/g, "γQ")
    .replace(/\bGammaM1\b|\bgammaM1\b/g, "γM1")
    .replace(/\bnors_k\b/g, "norsk")
    .replace(/\s+([,.;:)])/g, "$1")
    .replace(/([(])\s+/g, "$1")
    .trim();
}

function plainTextFromLatexFormula(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  return raw
    .replace(/\\begin\{aligned\}|\\end\{aligned\}/g, "")
    .replace(/\\begin\{align\}|\\end\{align\}/g, "")
    .replace(/\\begin\{array\}[^]*?\}/g, "")
    .replace(/\\end\{array\}/g, "")
    .replace(/\\\\/g, "\n")
    .replace(/&/g, "")
    .replace(/\\text\{([^{}]*)\}/g, "$1 ")
    .replace(/\\mathrm\{([^{}]*)\}/g, "$1")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1) / ($2)")
    .replace(/\{,\}/g, ".")
    .replace(/(?<=\d),(?=\d)/g, ".")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\quad/g, " ")
    .replace(/\\,/g, " ")
    .replace(/\\left|\\right/g, "")
    .replace(/[{}]/g, "")
    .replace(/\\/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function looksLikeBrokenLatexPlain(value: string): boolean {
  return /\bbeginaligned\b|\bendaligned\b|\bfrac[0-9A-Za-z]|\btext[A-Z]/.test(value);
}

function normalizeFormulaPlain(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  if (/\\begin\{|\\frac\{|\\text\{|\\mathrm\{/.test(raw)) {
    const plain = plainTextFromLatexFormula(raw);
    if (plain && !looksLikeBrokenLatexPlain(plain)) return plain;
  }

  const normalized = normalizeEngineeringFormulaPlain(raw)
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1) / ($2)")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√($1)")
    .replace(/\\leq/g, "≤")
    .replace(/\\geq/g, "≥")
    .replace(/\\pi/g, "π")
    .replace(/[{}]/g, "")
    .replace(/\\,/g, " ")
    .replace(/\\left|\\right/g, "")
    .replace(/\\/g, "")
    .replace(/\{,\}/g, ".")
    .replace(/(?<=\d),(?=\d)/g, ".")
    .replace(/\s+/g, " ")
    .trim();

  return looksLikeBrokenLatexPlain(normalized)
    ? plainTextFromLatexFormula(raw)
    : normalized;
}


function collapseDoubleLatexCommands(value: string): string {
  return value
    // Some agent formula strings already contain LaTeX commands. If we then
    // normalise symbols again, commands such as \gamma_G can accidentally turn
    // into \\gamma_G. Collapse repeated command slashes back to one.
    .replace(/\\{2,}(gamma|psi|eta|varepsilon|cdot|times|sqrt|max|text|frac|begin|end|mathrm)(?=[_{\s({]|$)/g, "\\$1")
    .replace(/\\{2,},/g, "\\,");
}


/**
 * Normaliserer agent-formel-tekst til LaTeX for berekningsark.
 * Eksportert for testing — sjaa calculation-sheet-model.test.ts.
 */
export function normalizeFormulaLatex(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  // Agent-output may be a mix of plain text, Unicode math symbols and LaTeX.
  // Keep valid LaTeX commands intact, but normalise PILAR's plain report
  // notation into academic notation for calculation sheets.
  // --- Struktur-normalisering (matematiske strukturar, ikkje symbol) ---
  // Medvite konservativ: ein delvis fiks som aldri bryt, framfor ein
  // full fiks som kan det. Rekkjefoelgja er viktig — sjaa kommentarar.
  const structured = raw
    // Fiks 3: Unicode-kvadrat/kube midt i eit tal-ledd: 3,2711² -> 3,2711^2.
    .replace(/(\d)²/g, "$1^2")
    .replace(/(\d)³/g, "$1^3")
    // Fiks 1: eksponent med parentes: fck^(2/3) -> fck^{2/3}.
    // [^()] => inga noesting. Maa koeyre FOER broek-regelen, slik at
    // "2/3" hamnar trygt inni ^{...} og ikkje blir broek-konvertert.
    .replace(/\^\(([^()]+)\)/g, "^{$1}")
    // Fiks 2: broek — BERRE to trygge moenster.
    //  a) tal / tal: 225,3 / 175,5 -> \frac{225,3}{175,5}.
    //     Negativ lookbehind (?<!\^)(?<!\^{) => roerer ikkje tal rett
    //     etter ein eksponent: L^2/8 tyder (L^2)/8, ikkje L^(2/8).
    .replace(
      /(?<!\^)(?<!\^{)(\b\d[\d.,]*)\s*\/\s*(\d[\d.,]*\b)/g,
      "\\frac{$1}{$2}",
    )
    //  b) enkelt symbol / enkelt symbol: fctm / fyk -> \frac{fctm}{fyk}.
    //     Berre reine identifikatorar paa begge sider — IKKJE uttrykk
    //     med parentes eller mellomrom-ledd, og ikkje etter ^ eller {.
    //     Negativ lookahead vernar kjende einings-par (kN/m, N/mm² ...):
    //     dei er einingar, ikkje brøkar, og normalizeLatexUnits gjer dei
    //     om til \\mathrm{...} seinare. Utan vakta vart "6,0 kN/m"
    //     til ein stabla \\frac{kN}{m}.
    .replace(
      /(?<![\w}^])(?!(?:kN|N|MPa|mm|cm|m|Nmm|kNm)(?:\^?[23])?\s*\/\s*(?:kN|N|MPa|mm|cm|m|Nmm|kNm)(?:\^?[23])?(?![\w]))([A-Za-z][\w]*)\s*\/\s*([A-Za-z][\w]*)(?![\w{])/g,
      "\\frac{$1}{$2}",
    );

  // Agent-output may be a mix of plain text, Unicode math symbols and LaTeX.
  const preprocessed = structured
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/\bsqrt\(([^()]+)\)/g, "\\sqrt{$1}")
    .replace(/\bpi\b/g, "\\pi")
    .replace(/\btext\s+([A-Za-z/]+)\b/g, "\\,\\mathrm{$1}");

  const normalized = preprocessed
    .replace(/F_Ed,dim|FEd,dim|Ed_dim|Ed,dim/g, "E_{d,dim}")
    .replace(/F_Ed,6\.10a|FEd,6\.10a|Ed_6_10a|Ed,6\.10a/g, "E_{d,6.10a}")
    .replace(/F_Ed,6\.10b_q|FEd,6\.10b_q|FEd,6\.10b,q|Ed_6_10b_q|Ed,6\.10b,q/g, "E_{d,6.10b,q}")
    .replace(/F_Ed,6\.10b_s|FEd,6\.10b_s|FEd,6\.10b,s|Ed_6_10b_s|Ed,6\.10b,s/g, "E_{d,6.10b,s}")
    .replace(/M_Ed|MEd/g, "M_{Ed}")
    .replace(/V_Ed|VEd/g, "V_{Ed}")
    .replace(/N_Ed|NEd/g, "N_{Ed}")
    .replace(/Nb_Rd|NbRd|Nb,Rd/g, "N_{b,Rd}")
    .replace(/q_Ed|qEd/g, "q_{Ed}")
    .replace(/M_pl,Rd|Mpl,Rd|M_pl_Rd/g, "M_{pl,Rd}")
    .replace(/V_pl,Rd|Vpl,Rd|V_pl_Rd/g, "V_{pl,Rd}")
    .replace(/M_Rd|MRd/g, "M_{Rd}")
    .replace(/V_Rd|VRd/g, "V_{Rd}")
    .replace(/W_pl,y|Wpl,y/g, "W_{pl,y}")
    .replace(/\bA_v\b|\bAv\b/g, "A_v")
    .replace(/\bf_y\b|\bfy\b/g, "f_y")
    .replace(/\bg_k\b|\bgk\b/g, "g_k")
    .replace(/\bq_k\b|\bqk\b/g, "q_k")
    .replace(/\bs_k\b|\bsk\b/g, "s_k")
    .replace(/GammaM1|gammaM1|γM1/g, "\\gamma_{M1}")
    .replace(/lambda_1|lambda1/g, "\\lambda_1")
    .replace(/barlambda_z|lambdazbar|lambdabarz/g, "\\bar{\\lambda}_z")
    .replace(/alpha_z|alphaz/g, "\\alpha_z")
    .replace(/\balpha\b/g, "\\alpha")
    .replace(/phiz/g, "\\phi_z")
    .replace(/chiz/g, "\\chi_z")
    .replace(/Lcr/g, "L_{cr}")
    .replace(/Iz/g, "I_z")
    .replace(/\biz\b/g, "i_z")
    .replace(/(?<!\\)gamma_G|γG/g, "\\gamma_G")
    .replace(/(?<!\\)gamma_Q|γQ/g, "\\gamma_Q")
    .replace(/(?<!\\)gamma_M0|γM0/g, "\\gamma_{M0}")
    .replace(/(?<!\\)psi_0,q|ψ0,q|ψ₀q|ψ₀,q/g, "\\psi_{0,q}")
    .replace(/(?<!\\)psi_0,s|ψ0,s|ψ₀s|ψ₀,s/g, "\\psi_{0,s}")
    .replace(/(?<!\\)psi_0|ψ0|ψ₀/g, "\\psi_0")
    .replace(/(?<!\\)eta_M|ηM/g, "\\eta_M")
    .replace(/(?<!\\)eta_V|ηV/g, "\\eta_V")
    .replace(/ε/g, "\\varepsilon")
    .replace(/·/g, "\\cdot ")
    .replace(/×/g, "\\times ")
    .replace(/√/g, "\\sqrt")
    .replace(/≤/g, "\\leq")
    .replace(/≥/g, "\\geq")
    .replace(/(?<=\d),(?=\d)/g, "{,}");

  return collapseDoubleLatexCommands(normalized);
}


function startsLikeCalculationExpression(lhs: string): boolean {
  const compact = lhs.trim();
  if (!compact) return true; // continuation line, e.g. "= 1,35 + ..."
  if (compact.length > 48) return false;
  if (/[.!?:;]/.test(compact)) return false;
  return /^[A-Za-zγψηεψ₀\\({0-9][A-Za-z0-9γψηεψ₀\\{}_,.()\-+*/·×\s]*$/u.test(compact);
}

function hasMathDensity(text: string): boolean {
  const operatorCount = (text.match(/[=+\-*/·×≤≥<>]/g) ?? []).length;
  const symbolCount = (text.match(/[A-Za-zγψηεψ₀]|\d/gu) ?? []).length;
  return operatorCount >= 1 && symbolCount >= 2;
}

/**
 * Heuristikk: er denne prosa-linja ei likning som skal display-
 * rendrast? Eksportert for testing.
 */
export function looksLikeEquation(line: string): boolean {
  const text = line.trim();
  if (text.length < 3) return false;

  // Continuation lines in step-by-step calculations often start with "=".
  if (/^[=≤≥<>]/.test(text) && hasMathDensity(text)) return true;

  const operatorMatch = text.match(/=|≤|≥|<|>/);
  if (!operatorMatch || operatorMatch.index === undefined) return false;

  const lhs = text.slice(0, operatorMatch.index).trim();
  if (!startsLikeCalculationExpression(lhs)) return false;

  // Avoid treating ordinary prose with one incidental equality as display math.
  if (/\b(dette|den|det|styrende|ligning|likning|innsetting|for|ved|norsk|useen|maksimal|maksimalt|kontrollør|tolkar)\b/i.test(lhs)) return false;
  if (!hasMathDensity(text)) return false;

  // Prosa-innleiingar endar ofte paa kolon ("Med bt = 300 mm og d = 450
  // mm:"). Ei ekte likning gjer aldri det. Spraak-uavhengig.
  if (text.endsWith(":")) return false;

  const words = text.split(/\s+/).filter(Boolean);
  const hasMathOperators = /[\\^_{}·×/*+]|\d\s*[=≤≥<>]|[=≤≥<>]\s*\d/.test(text);
  if (words.length > 26 && !hasMathOperators) return false;

  // Ord-dominert lang linje er prosa, ikkje likning — sjølv med innbaka
  // "=". Ekte likningar er symbol-dominerte; setningar er ord-dominerte.
  // Maaler forholdet ord-token (>=2 bokstavar, ingen siffer) mot total.
  // Spraak-uavhengig — fangar baade norsk og engelsk.
  const wordishCount = words.filter((w) =>
    /^[A-Za-zæøåÆØÅ]{2,}$/.test(w),
  ).length;
  if (words.length >= 12 && wordishCount / words.length > 0.6) {
    return false;
  }

  return true;
}


function equationGroupsFromProse(prose: string): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];

  for (const rawLine of prose.split("\n")) {
    const line = rawLine.trim();
    if (looksLikeEquation(line)) {
      current.push(line);
      continue;
    }

    if (current.length > 0) {
      groups.push(current);
      current = [];
    }
  }

  if (current.length > 0) groups.push(current);
  return groups;
}

function stripEquationLinesFromProse(prose: string): string {
  const lines = prose.split("\n");
  const cleaned: string[] = [];
  let removedEquationRecently = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (looksLikeEquation(line)) {
      removedEquationRecently = true;
      continue;
    }

    // "Innsetting:" becomes noise when the actual substitution is shown in a
    // formula block immediately afterwards.
    if (removedEquationRecently && /^innsetting:?$/i.test(line)) continue;

    cleaned.push(rawLine);
    if (line) removedEquationRecently = false;
  }

  return normalizeCalculationSheetPlainText(cleaned.join("\n"))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


function normalizeUnitToken(unit: string): string {
  return String(unit)
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/⁴/g, "^4")
    .replace(/mm2/g, "mm^2")
    .replace(/cm2/g, "cm^2")
    .replace(/cm3/g, "cm^3")
    .replace(/cm4/g, "cm^4")
    .replace(/m2/g, "m^2");
}

function normalizeLatexUnits(value: string): string {
  return value
    .replace(/(?<=\d)\s*(N\/mm\^2|N\/mm²|N\/mm2|kN\/m|kNm|kN|Nmm|MPa|mm\^2|mm²|mm2|cm\^4|cm⁴|cm4|cm\^3|cm³|cm3|cm\^2|cm²|cm2|m\^2|m²|m2|m)\b/g, (_match, unit: string) => {
      return `\\,\\mathrm{${normalizeUnitToken(unit)}}`;
    });
}

function latexLineForAligned(line: string): string {
  const normalized = normalizeLatexUnits(normalizeFormulaLatex(line))
    .replace(/(\\bar\{\\lambda\}_z|\\phi_z|\\chi_z|[A-Za-z]_[A-Za-z]+|[A-Za-z])2\b/g, "$1^2")
    .replace(/(\\bar\{\\lambda\}_z|\\phi_z|\\chi_z|[A-Za-z]_[A-Za-z]+|[A-Za-z])3\b/g, "$1^3")
    .replace(/−/g, "-")
    .replace(/\sqrt\{([^{}]+?)\s*\/\s*([^{}]+?)\}/g, "\\sqrt{\\frac{$1}{$2}}")
    .replace(/\text\{\s*([^{}]+?)\s*\}/g, "\\mathrm{$1}")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.replace(/=|\\leq|\\geq|<|>/, (operator) => `&${operator}`);
}

function alignedLatexFromLines(lines: string[]): string {
  const normalized = lines.map(latexLineForAligned).filter(Boolean);
  if (normalized.length === 0) return "";
  if (normalized.length === 1 && !normalized[0].includes("&")) return normalized[0];
  const lineBreak = " \\\\";
  return `\\begin{aligned}\n${normalized.join(`${lineBreak}\n`)}\n\\end{aligned}`;
}

function plainFromEquationLines(lines: string[]): string {
  return lines.map((line) => normalizeFormulaPlain(line)).join("\n");
}


function isBrokenCalculationSheetFormula(formula: CalculationFormula): boolean {
  const plain = String(formula.plain ?? "");
  const latex = String(formula.latex ?? "");

  // Hide known failed LaTeX-to-plain conversions in calculation sheets.
  // Better to show no extra formula block than leaking "frac1.6..." text.
  if (/\bbeginaligned\b|\bendaligned\b|\btextLive\b|\btextDead\b/i.test(plain)) return true;
  if (/\bfrac[0-9A-Za-z]/i.test(plain)) return true;

  // Guard against aligned text-fraction blocks that may still render poorly
  // in the plain calculation-sheet view.
  if (/\\begin\{aligned\}/.test(latex) && /\\text\{/.test(latex) && /\\frac\{/.test(latex)) {
    return true;
  }

  return false;
}

function buildFormulas(step: CalculationStep): CalculationFormula[] {
  const formulas: CalculationFormula[] = [];
  const seen = new Set<string>();
  const equationGroups = equationGroupsFromProse(step.prose);

  // Prefer equations extracted from the prose because they preserve the student's
  // step-by-step substitution. Raw agent formula fields are often compact and can
  // duplicate the same calculation.
  for (const group of equationGroups) {
    const latex = alignedLatexFromLines(group);
    if (!latex || seen.has(latex)) continue;
    seen.add(latex);
    formulas.push({ latex, plain: plainFromEquationLines(group) });
  }

  // Fallback: if the prose had no equation lines, use structured formula fields.
  if (formulas.length === 0) {
    for (const raw of step.formulas) {
      if (/^\s*(GammaM1|gammaM1|γM1)\s*=/i.test(String(raw))) continue;
      const latex = normalizeLatexUnits(normalizeFormulaLatex(raw));
      if (!latex || seen.has(latex)) continue;
      seen.add(latex);
      formulas.push({ latex, plain: normalizeFormulaPlain(latex) });
    }
  }

  return formulas.filter((formula) => !isBrokenCalculationSheetFormula(formula)).slice(0, 6);
}

export function buildCalculationSheetModel(model: ReportModel): CalculationSheetModel {
  const displayProbe = [
    model.cover.title,
    model.cover.subtitle,
    ...model.interpretation.assumptions,
    ...model.assessment.warnings,
    ...model.assessment.limitations,
  ].join("\n");

  const displayLanguage: PilarDisplayLanguage =
    (model.meta.displayLanguage ??
      (inferCalculationEnglishDisplay(displayProbe) ? "en" : model.meta.locale)) as PilarDisplayLanguage;
  const inputRows = uniqueByLabel(
    model.calculation.resultRows
      .filter((row) => row.category === "input")
      .map((row) => resultToGiven(row, displayLanguage)),
  );

  const resultRows = uniqueByLabel(
    model.calculation.resultRows
      .filter((row) => row.category === "dimensjonerande" || row.category === "kontroll")
      .map((row) => resultToCalculationResult(row, displayLanguage)),
  );

  const fallbackGiven = inputRows.length > 0 ? inputRows : model.keyResults.map((row) => resultToGiven(row, displayLanguage));
  const fallbackResults = resultRows.length > 0 ? resultRows : model.keyResults.map((row) => resultToCalculationResult(row, displayLanguage));

  return {
    meta: {
      schemaVersion: CALCULATION_SHEET_MODEL_VERSION,
      runId: model.meta.runId,
      documentId: model.meta.documentId,
      title: model.cover.title || "Beregning",
      subtitle: model.cover.subtitle,
      date: model.meta.displayDate,
      status: model.meta.status,
      displayLanguage,
      locale: model.meta.locale,
      reportUrl: model.meta.reportUrl,
    },
    given: fallbackGiven.slice(0, 12),
    assumptions: model.interpretation.assumptions.map(normalizeCalculationSheetPlainText).slice(0, 10),
    steps: model.calculation.steps.map((step) => ({
      id: step.id,
      number: step.number,
      title: normalizeCalculationSheetPlainText(step.title),
      explanation: stripEquationLinesFromProse(step.prose),
      formulas: buildFormulas(step),
      isControlStep: step.isControlStep,
    })),
    results: fallbackResults.slice(0, 12),
    notes: [
      ...model.assessment.warnings.map(normalizeCalculationSheetPlainText).slice(0, 3),
      ...model.assessment.limitations.map(normalizeCalculationSheetPlainText).slice(0, 3),
    ].slice(0, 6),
  };
}
