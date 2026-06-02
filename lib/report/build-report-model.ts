import { confidenceLabel, decisionStatusLabel, decisionStatusShort, formatPromptVersion, inputStatusLabel, matchPhrase, matchStatusShort, } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import { compareResults } from "@/lib/compare/result-compare";
import { polishEnglishGeneratedText, sprint335PolishEnglishText,
  polishNorwegianRoleText
} from "@/lib/international/display";
import type { EngineeringContext } from "@/lib/engineering-context";
import {
  inferReportDisplayLanguage,
  localizeGeneratedEngineeringText,
  localizeResultLabel,
  type PilarDisplayLanguage,
} from "@/lib/international/display";
import { tillitVisuals, type TillitBreakdown } from "@/lib/tillit-score";
import {
  buildEc3SteelBeamCapacityReportArtifacts,
  extractEc3SteelBeamCapacityInput,
  screenEc3SteelBeamCapacity,
} from "@/lib/result/ec3-steel-beam-capacity";
import {
  REPORT_DISCLAIMER,
  REPORT_MODEL_VERSION,
  type CalculationResultRow,
  type ComparisonRow,
  type KeyResult,
  type PipelineStatusRow,
  type ReportAudience,
  type ReportModel,
} from "./report-model";
import {
  canonicalResultKey,
  categorizeResultKey,
  cleanReportText,
  compactReportText,
  displayResultLabel,
  limitText,
  normalizeCalculationStep,
  normalizeReportModel,
  normalizeTitleTypography,
  resultPriorityScore,
  splitValueUnit, cleanReportTextPreserveUserInput } from "./normalize-report-model";

function sprint339FinalNorwegianResidueText(value: string): string {
  return String(value ?? "")
    .replace(/FORELØPIG GODKJENT/g, "PRELIMINARILY APPROVED")
    .replace(/MINDRE FORSKJELLER/g, "MINOR DIFFERENCES")
    .replace(/BEGGE KONSTRUKTØRER ER ENIGE/g, "BOTH ENGINEERS AGREE")
    .replace(/ØVRIG/g, "OTHER")
    .replace(/GOD/g, "GOOD")
    .replace(/Beregningen er godkjent for visning. Forutsetter manuell verifikasjon av ansvarlig fagperson før bruk i prosjektering./g, "The calculation is approved for display as a preliminary result. Manual verification by a qualified professional is required before use in design work.")
    .replace(/De kom frem til samme resultat./g, "They reached the same result.")
    .replace(/Engineer A and B er fullstendig enige om alle dimensjonerende verdier./g, "Engineer A and Engineer B fully agree on all design values.")
    .replace(/Engineer A og B har minor differences/g, "Engineer A and Engineer B have minor differences")
    .replace(/Engineer B reports HIGH confidence på sin uavhengige løsning./g, "Engineer B reports HIGH confidence in its independent solution.")
    .replace(/HIGH her betyr at B er trygg på egen metode — at A and B er enige er en separat sjekk (se verdikt over)./g, "HIGH means that Engineer B is confident in its own method — agreement between Engineer A and Engineer B is a separate check (see verdict above).")
    .replace(/Self-assessment — ikke en uavhengig verifikasjon./g, "Self-assessment — not an independent verification.")
    .replace(/Engineer A og Engineer B/g, "Engineer A and Engineer B")
    .replace(/Engineer A og B/g, "Engineer A and Engineer B")
    .replace(/A og B/g, "Engineer A and Engineer B")
    .replace(/er fullstendig enige/g, "fully agree")
    .replace(/dimensjonerende verdier/g, "design values")
    .replace(/på sin uavhengige løsning/g, "in its independent solution")
    .replace(/HIGH her betyr/g, "HIGH means")
    .replace(/egen metode/g, "its own method")
    .replace(/se verdikt over/g, "see verdict above")
    .replace(/same grunnleggjande metode/g, "the same basic method")
    .replace(/brukar/g, "use")
    .replace(/bruker/g, "use")
    .replace(/medan/g, "while")
    .replace(/berre/g, "only")
    .replace(/hovudformelen/g, "the main formula")
    .replace(/utrekningsrute/g, "calculation route")
    .replace(/ein alternativ/g, "an alternative")
    .replace(/som ein intern kryssjekk/g, "as an internal cross-check")
    .replace(/Dette er ei forskjell i presentasjonsform, ikkje i metode./g, "This is a presentation difference, not a methodological difference.")
    .replace(/lastfaktorane/g, "load factors")
    .replace(/som eigne resultatfelt/g, "as separate result fields")
    .replace(/tekstbeskrivinga/g, "the text description")
    .replace(/Innhaldet er likeverdig men strukturen er ulik./g, "The content is equivalent, but the structure differs.")
    .replace(/Begge konstruktørar/g, "Both engineers")
    .replace(/Begge konstruktører/g, "Both engineers")
    .replace(/konstruktørar/g, "engineers")
    .replace(/konstruktører/g, "engineers")
    .replace(/Konstruktør A/g, "Engineer A")
    .replace(/Konstruktør B/g, "Engineer B")
    .replace(/Konstruktør/g, "Engineer")
    .replace(/Cb-antaginga/g, "The Cb assumption")
    .replace(/antaginga/g, "assumption")
    .replace(/føresetnad/g, "assumption")
    .replace(/føresetnader/g, "assumptions")
    .replace(/sjølve/g, "itself")
    .replace(/Ingen forskjell/g, "No difference")
    .replace(/ingen forskjell/g, "no difference")
    .replace(/mellomledd/g, "intermediate value");
}


export type UpstreamAgentOutput = {
  agent_name: string;
  structured_output: {
    short_conclusion?: string;
    assumptions?: string[];
    calculation_steps?: { title: string; text: string; latex_formula?: string | string[] | null }[];
    results?: Record<string, string>;
    limitations?: string[];
    warnings?: string[];
    confidence?: string;
  };
  prompt_version: string;
};

export type UpstreamReportData = {
  report: {
    id: string;
    document_id: string;
    executive_summary: string;
    technical_assessment: string;
    conclusion: string;
    prompt_version: string;
    created_at: string;
    tillit_score: number | null;
    tillit_breakdown: TillitBreakdown | null;
  };
  cached?: boolean;
  run: { request: { raw_text: string }; display_language?: string | null };
  inputReview: {
    input_status: string;
    parsed_data?: unknown;
    prompt_version: string;
  } | null;
  agentA: UpstreamAgentOutput;
  agentB: UpstreamAgentOutput;
  comparison: { match_status: string; comparison_data: unknown } | null;
  controllerDecision: {
    decision_status: string;
    risk_level?: string;
    reason?: string;
    user_message: string;
    blocked_outputs?: string[];
  } | null;
};

export type BuildReportModelOptions = {
  locale: Locale;
  reportUrl: string;
  engineeringContext?: EngineeringContext | null;
  audience?: ReportAudience;
};

const LABELS: Record<string, Record<PilarDisplayLanguage, string>> = {
  title: { nb: "Beregningsnotat", nn: "Berekningsnotat", en: "Calculation note" },
  subtitle: { nb: "AI-generert beregningsnotat", nn: "AI-generert berekningsnotat", en: "AI-generated calculation note" },
  qrLabel: { nb: "Skann for nettversjon", nn: "Skann for nettversjon", en: "Scan for web version" },
  qrDescription: {
    nb: "Åpner rapporten med kontrollstatus, pipeline og delbar lenke for medstudenter eller kollegaer.",
    nn: "Opnar rapporten med kontrollstatus, pipeline og delbar lenkje for medstudentar eller kollegaer.",
    en: "Opens the report with control status, pipeline trace and a shareable link for classmates or colleagues.",
  },
  inputTolking: { nb: "Input-tolkning", nn: "Input-tolking", en: "Input interpretation" },
  konstruktorA: { nb: "Konstruktør A", nn: "Konstruktør A", en: "Engineer A" },
  konstruktorB: { nb: "Konstruktør B", nn: "Konstruktør B", en: "Engineer B" },
  samanlikning: { nb: "Sammenligning", nn: "Samanlikning", en: "Comparison" },
  kontrollor: { nb: "Kontrollør", nn: "Kontrollør", en: "Controller" },
  fagperson: { nb: "Fagperson", nn: "Fagperson", en: "Professional reviewer" },
  ikkjeKontrollert: { nb: "Ikke kontrollert", nn: "Ikkje kontrollert", en: "Not reviewed" },
  ukjent: { nb: "Ukjent", nn: "Ukjent", en: "Unknown" },
};

function statusTone(value: string | undefined | null): PipelineStatusRow["status"] {
  const normalized = (value ?? "").toLowerCase();
  if (["approved", "match", "klar", "high", "ok", "godkjent"].some((token) => normalized.includes(token))) return "ok";
  if (["warning", "warnings", "minor", "medium", "delvis", "foreløpig"].some((token) => normalized.includes(token))) return "warning";
  if (["rejected", "critical", "low", "avvist", "mangelfull"].some((token) => normalized.includes(token))) return "danger";
  return "unknown";
}


function isDescriptiveResultValue(sourceLabel: string, raw: string): boolean {
  const label = String(sourceLabel ?? "").toLowerCase();
  const text = String(raw ?? "").trim();

  if (!text) return false;
  if (/^\s*[-+]?\d/.test(text)) return false;

  return (
    /\b(risk|status|warning|assessment|conclusion|note|ltb)\b/i.test(label) ||
    /\b(high|medium|low|critical|requires|required|verified|preliminary|not determined)\b/i.test(text)
  );
}

function formatEnglishNumericText(value: string): string {
  return String(value ?? "")
    .replace(/\bkip\s*[·⋅]\s*ft\b/gi, "kip-ft")
    .replace(/\bkip\s*-\s*ft\b/gi, "kip-ft")
    .replace(/(\d),(\d{1,2})(?=\D|$)/g, "$1.$2")
    .replace(
      /(\d),(\d{3,4})(?=\s*(?:kip\/ft|kip-ft|kip|ft|ksi|lb\/ft|psf|ksf|in)\b)/gi,
      (match, whole: string, fraction: string) =>
        /^0+$/.test(fraction) ? match : `${whole}.${fraction}`,
    )
    .replace(
      /(\d),(\d{3,4})(?=\s*(?:[*/+\-=)]|$))/g,
      (match, whole: string, fraction: string) =>
        /^0+$/.test(fraction) ? match : `${whole}.${fraction}`,
    );
}

function polishEnglishReportText(value: string): string {
  return formatEnglishNumericText(
    sprint339FinalNorwegianResidueText(polishEnglishGeneratedText(value))
      .replace(/Kapasitetskontroll er (?:ikke|ikkje) utf\u00f8rt\.?/gi, "Capacity check is not performed.")
      .replace(/Kapasitetskontroll er ikkje rekna\.?/gi, "Capacity check is not calculated.")
      .replace(/q m\u00e5 bekreftes som dimensjonerende last\.?/gi, "q must be confirmed as the governing load.")
      .replace(/q m\u00e5 stadfestast som dimensjonerande last\.?/gi, "q must be confirmed as the governing load."),
  );
}

function polishEnglishReportTextFinal(value: string): string {
  return polishEnglishReportText(value)
    .replace(/\bBeregning av\b/gi, "Calculation of")
    .replace(/\bBerekning av\b/gi, "Calculation of")
    .replace(/\blast og moment\b/gi, "load and moment")
    .replace(/\bog\b/g, "and")
    .replace(/\ber einige\b/gi, "agree")
    .replace(/\bfann ingen kritiske avvik, men\b/gi, "found no critical deviations, but")
    .replace(/\bhar f\u00f8rebels godkjent visning, men\b/gi, "has allowed provisional display, but")
    .replace(/\bkapasitet\b/gi, "capacity")
    .replace(/\bReporter minner om at dette er preliminary\b/gi, "Reporter notes that this is preliminary")
    .replace(/\bReporter minner om at dette er f\u00f8rebels\b/gi, "Reporter notes that this is preliminary")
    .replace(/\bminner om at dette er preliminary\b/gi, "notes that this is preliminary")
    .replace(/\bminner om at dette er f\u00f8rebels\b/gi, "notes that this is preliminary")
    .replace(/\band m\u00e5 kontrollerast av\b/gi, "and must be checked by")
    .replace(/\bm\u00e5 kontrollerast av\b/gi, "must be checked by")
    .replace(/\bf\u00f8rebels\b/gi, "preliminary")
    .replace(/\bikkje\b/gi, "not")
    .replace(/\ber (?:ikkje|ikke|not) berekna\b/gi, "is not calculated")
    .replace(/\ber (?:ikkje|ikke|not) beregnet\b/gi, "is not calculated")
    .replace(/\bCb and capacity is not calculated\b/gi, "Cb and capacity are not calculated")
    .replace(/q m\u00e5 bekreftes som dimensjonerende last\.?/gi, "q must be confirmed as the governing load.")
    .replace(/q m\u00e5 stadfestast som dimensjonerande last\.?/gi, "q must be confirmed as the governing load.");
}

function displayTextForLanguage(
  value: string,
  displayLanguage: PilarDisplayLanguage,
): string {
  return displayLanguage === "en"
    ? polishEnglishReportTextFinal(value)
    : polishNorwegianRoleText(value, displayLanguage);
}

function resultRowsFrom(results: Record<string, string> | undefined, currentDisplayLanguage: PilarDisplayLanguage): CalculationResultRow[] {
  const byCanonical = new Map<string, CalculationResultRow>();

  for (const [sourceLabel, raw] of Object.entries(results ?? {})) {
    const cleanedRaw = displayTextForLanguage(
      compactReportText(raw),
      currentDisplayLanguage,
    );
    if (!cleanedRaw) continue;

    const canonical = canonicalResultKey(sourceLabel);
    const descriptiveResult = isDescriptiveResultValue(sourceLabel, cleanedRaw);
    const { value, unit } = descriptiveResult
      ? { value: cleanedRaw, unit: null }
      : splitValueUnit(cleanedRaw);
    const category = categorizeResultKey(sourceLabel);
    const row = {
      label: localizeResultLabel(displayResultLabel(sourceLabel), currentDisplayLanguage),
      value,
      unit,
      raw: cleanedRaw,
      category,
    };

    const existing = byCanonical.get(canonical);
    if (!existing || resultPriorityScore(sourceLabel) < resultPriorityScore(existing.label)) {
      byCanonical.set(canonical, row);
    }
  }

  return Array.from(byCanonical.values()).sort((a, b) => resultPriorityScore(a.label) - resultPriorityScore(b.label));
}

function keyResultsFrom(rows: CalculationResultRow[]): KeyResult[] {
  const byCanonical = new Map<string, CalculationResultRow>();
  for (const row of rows) {
    const canonical = canonicalResultKey(row.label);
    if (!byCanonical.has(canonical)) byCanonical.set(canonical, row);
  }

  const preferredCoverOrder = [
    "eddim",
    "med",
    "ved",
    "etam",
    "etav",
    "mplrd",
    "vplrd",
    "ned",
    "qed",
    "l",
    "qk",
    "gk",
    "sk",
  ];

  const selected: KeyResult[] = [];
  const seen = new Set<string>();

  for (const canonical of preferredCoverOrder) {
    const row = byCanonical.get(canonical);
    if (!row || seen.has(canonical)) continue;
    seen.add(canonical);
    selected.push({ ...row });
    if (selected.length >= 4) return selected;
  }

  const fallbacks = rows
    .filter((row) => row.category !== "anna")
    .filter((row) => {
      const canonical = canonicalResultKey(row.label);
      // Cover should communicate main engineering results and basic input, not
      // internal comparison variants or partial-/combination factors.
      if (/^(psi0|gamma)/.test(canonical)) return false;
      if (/^ed610/.test(canonical) && byCanonical.has("eddim")) return false;
      return !seen.has(canonical);
    })
    .sort((a, b) => resultPriorityScore(a.label) - resultPriorityScore(b.label));

  for (const row of fallbacks) {
    const canonical = canonicalResultKey(row.label);
    if (seen.has(canonical)) continue;
    seen.add(canonical);
    selected.push({ ...row });
    if (selected.length >= 4) break;
  }

  return selected.length > 0 ? selected : rows.slice(0, 4).map((row) => ({ ...row }));
}

const REPORT_MATCH_TOLERANCE_PCT = 0.1; // ~0,1 % — bevarer gamal valuesMatch-terskel (diff/scale <= 0,001)
// Generøs øvre grense slik at comparisonRows.length er ærleg for «+N til»-
// indikatoren (web + DOCX kappar til 8 for visning). Tidlegare 12 gav for låg
// total for utrekningar med mange nøklar. Bound mot patologiske tilfelle.
const MAX_REPORT_COMPARISON_ROWS = 40;

/**
 * Byggjer kontrolltabellens A/B-rader med DETERMINISTISK nøkkel-paring
 * (compareResults / normalizeResultKey) — same kjelde som Samanliknaren og
 * Mission Control. Erstattar den tidlegare ad-hoc paringa (canonicalResultKey
 * + ikkje-eining-aware valuesMatch + tusenskilje-stripping i numericValue) som
 * (a) ikkje para greek-symbol som σ/φ, (b) flagga cm³ vs mm³ som avvik, og
 * (c) mis-parsa engelsk desimal (2.880 → 2880). Nøklar berre éin konstruktør
 * rapporterte blir eigne rader med «-» på motsett side (ikkje skjult, ikkje
 * falsk match).
 */
export function buildComparisonRowsFromResults(
  resultsA: Record<string, string>,
  resultsB: Record<string, string>,
  displayLanguage: PilarDisplayLanguage,
): ComparisonRow[] {
  const cmp = compareResults(resultsA, resultsB);
  const display = (v: string): string =>
    v && v !== "-" ? displayTextForLanguage(compactReportText(v), displayLanguage) : "-";

  type Raw = { key: string; a: string; b: string; match: boolean };
  const rows: Raw[] = [];

  for (const p of cmp.paired) {
    const a = p.aValue || "-";
    const b = p.bValue || "-";
    // Match: eksakt lik streng (dekkjer ikkje-numeriske verdiar) ELLER eining-
    // aware kode-rekna avvik under terskel. compareResults gjer cm³/mm³, kN/N
    // likeverdige, og parsar både norsk og engelsk desimal korrekt.
    const match =
      a !== "-" &&
      b !== "-" &&
      (a === b || (p.percentDiff !== null && p.percentDiff <= REPORT_MATCH_TOLERANCE_PCT));
    rows.push({ key: p.key, a, b, match });
  }
  for (const key of cmp.onlyA) {
    rows.push({ key, a: resultsA[key] || "-", b: "-", match: false });
  }
  for (const key of cmp.onlyB) {
    rows.push({ key, a: "-", b: resultsB[key] || "-", match: false });
  }

  return rows
    .sort((x, y) => resultPriorityScore(x.key) - resultPriorityScore(y.key))
    .slice(0, MAX_REPORT_COMPARISON_ROWS)
    .map((row) => ({
      label: localizeResultLabel(displayResultLabel(row.key), displayLanguage),
      constructorA: display(row.a),
      constructorB: display(row.b),
      match: row.match,
    }));
}

function buildComparisonRows(data: UpstreamReportData, displayLanguage: PilarDisplayLanguage): ComparisonRow[] {
  const resultsA = isBlockedOutput(data, "results_a")
    ? {}
    : data.agentA.structured_output.results ?? {};
  const resultsB = isBlockedOutput(data, "results_b")
    ? {}
    : data.agentB.structured_output.results ?? {};

  return buildComparisonRowsFromResults(
    resultsA,
    resultsB,
    displayLanguage,
  );
}

function buildPipelineStatus(data: UpstreamReportData, locale: Locale, displayLanguage: PilarDisplayLanguage): PipelineStatusRow[] {
  const input = displayLanguage === "en"
    ? ({ klar: "Ready", delvis_klar: "Partly ready", mangelfull: "Incomplete", avvist: "Rejected", relevant_ikkje_stotta: "Not supported", uklar: "Unclear", uklart: "Unclear" } as Record<string, string>)[data.inputReview?.input_status ?? ""] ?? "-"
    : data.inputReview ? inputStatusLabel(data.inputReview.input_status, locale) : "-";
  const a = displayLanguage === "en"
    ? ({ high: "High", medium: "Medium", low: "Low" } as Record<string, string>)[data.agentA.structured_output.confidence ?? ""] ?? "-"
    : confidenceLabel(data.agentA.structured_output.confidence ?? "", locale);
  const b = displayLanguage === "en"
    ? ({ high: "High", medium: "Medium", low: "Low" } as Record<string, string>)[data.agentB.structured_output.confidence ?? ""] ?? "-"
    : confidenceLabel(data.agentB.structured_output.confidence ?? "", locale);
  const comp = displayLanguage === "en"
    ? ({ match: "Agreement", minor_differences: "Minor differences", significant_differences: "Significant differences", critical_disagreement: "Critical disagreement" } as Record<string, string>)[data.comparison?.match_status ?? ""] ?? "-"
    : matchStatusShort(data.comparison?.match_status ?? "", locale);
  const ctrl = displayLanguage === "en"
    ? ({ approved: "Provisionally accepted", approved_with_warnings: "Provisionally accepted with warnings", uncertain: "Uncertain", rejected: "Rejected", needs_more_input: "Needs input" } as Record<string, string>)[data.controllerDecision?.decision_status ?? ""] ?? "-"
    : decisionStatusShort(data.controllerDecision?.decision_status ?? "", locale);

  return [
    { label: LABELS.inputTolking[displayLanguage], value: input, status: statusTone(input) },
    { label: LABELS.konstruktorA[displayLanguage], value: a, status: statusTone(data.agentA.structured_output.confidence) },
    { label: LABELS.konstruktorB[displayLanguage], value: b, status: statusTone(data.agentB.structured_output.confidence) },
    { label: LABELS.samanlikning[displayLanguage], value: comp, status: statusTone(data.comparison?.match_status) },
    { label: LABELS.kontrollor[displayLanguage], value: ctrl, status: statusTone(data.controllerDecision?.decision_status) },
    { label: LABELS.fagperson[displayLanguage], value: LABELS.ikkjeKontrollert[displayLanguage], status: "warning" },
  ];
}

function decisionStatusCode(data: UpstreamReportData): string {
  return data.controllerDecision?.decision_status ?? "unknown";
}

function isBlockedOutput(data: UpstreamReportData, output: string): boolean {
  return (data.controllerDecision?.blocked_outputs ?? []).includes(output);
}

function buildEc3CapacityArtifactsForReport(
  data: UpstreamReportData,
  options: BuildReportModelOptions,
  displayLanguage: PilarDisplayLanguage,
) {
  const extraction = extractEc3SteelBeamCapacityInput({
    text: data.run.request.raw_text,
    structured: data.inputReview ?? undefined,
    standardFamily: options.engineeringContext?.standards?.family,
  });
  if (!extraction.computable) return null;

  const screening = screenEc3SteelBeamCapacity(extraction.screeningInput);
  if (!screening.computable) return null;

  return buildEc3SteelBeamCapacityReportArtifacts(screening, displayLanguage);
}

function displayDate(createdAt: string, locale: Locale, displayLanguage: PilarDisplayLanguage = locale): string {
  const dateTag = displayLanguage === "en" ? "en-US" : locale === "nb" ? "nb-NO" : "nn-NO";
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return createdAt;
  return parsed.toLocaleDateString(dateTag, { year: "numeric", month: "long", day: "numeric" });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringField(source: Record<string, unknown> | null, key: string): string {
  const value = source?.[key];
  return typeof value === "string" ? cleanReportText(value) : "";
}

function calculationTypeFallback(type: string, locale: Locale, displayLanguage: PilarDisplayLanguage = locale): string {
  const labels: Record<string, Record<PilarDisplayLanguage, string>> = {
    lastkombinasjon: {
      nb: "Lastkombinasjon i bruddgrense",
      nn: "Lastkombinasjon i brotgrense",
      en: "LRFD/ULS load combination",
    },
    bjelke_lastverknad: {
      nb: "Bjelke — moment og skjær",
      nn: "Bjelke — moment og skjerkraft",
      en: "Beam — moment and shear",
    },
    armering_betongbjelke: {
      nb: "Armeringsberegning av betongbjelke",
      nn: "Armeringsberekning av betongbjelke",
      en: "Reinforced concrete beam calculation",
    },
    stalkapasitet: {
      nb: "Kapasitetskontroll av stålbjelke",
      nn: "Kapasitetskontroll av stålbjelke",
      en: "Steel beam capacity check",
    },
  };
  return labels[type]?.[displayLanguage] ?? labels[type]?.[locale] ?? "";
}

function formatSteelProfileName(value: string): string {
  return value.replace(/\b(IPE|HEA|HEB|HEM|UNP|UPN)\s*(\d{2,4})\b/gi, (_, profile: string, number: string) => `${profile.toUpperCase()} ${number}`);
}

function hasCapacityResult(rows: CalculationResultRow[]): boolean {
  return rows.some((row) =>
    /^(etam|etav|mplrd|vplrd|mrd|vrd|nrd|utilization|dcr)$/.test(
      canonicalResultKey(row.label),
    ),
  );
}

function titleImpliesCapacity(title: string): boolean {
  return /\b(kapasitetskontroll|capacity check)\b/i.test(title);
}

function titleFromResults(rows: CalculationResultRow[], rawRequest: string, locale: Locale, displayLanguage: PilarDisplayLanguage = locale): string {
  const has = (canonical: string) => rows.some((row) => canonicalResultKey(row.label) === canonical);
  const request = rawRequest.toLowerCase();
  const capacityCalculated = hasCapacityResult(rows);

  if (displayLanguage === "en") {
    if (/\bW\d+x\d+\b/i.test(rawRequest) || request.includes("aisc") || request.includes("asce") || request.includes("steel beam")) {
      return "Steel beam — demand and LTB screening";
    }
  }

  const profile = rawRequest.match(/\b(?:IPE|HEA|HEB|HEM|UNP|UPN)\s*\d{2,4}\b/i)?.[0];

  if (capacityCalculated) {
    const base = locale === "nn" ? "Kapasitetskontroll av stålbjelke" : "Kapasitetskontroll av stålbjelke";
    return profile ? `${base} ${formatSteelProfileName(profile)}` : base;
  }

  if (has("eddim") || has("ed610a") || has("ed610bq") || request.includes("lastkombinasjon")) {
    return calculationTypeFallback("lastkombinasjon", locale, displayLanguage);
  }

  if ((has("med") && has("ved")) || request.includes("fritt opplagd") || request.includes("fritt opplag")) {
    if (request.includes("stål")) {
      return locale === "nn"
        ? "Fritt opplagd stålbjelke — moment og skjerkraft"
        : "Fritt opplagd stålbjelke — moment og skjær";
    }
    return calculationTypeFallback("bjelke_lastverknad", locale, displayLanguage);
  }

  return displayLanguage === "en" ? "Technical calculation" : locale === "nn" ? "Teknisk berekning" : "Teknisk beregning";
}

function calculationTypeFallbackForScope(
  type: string,
  rows: CalculationResultRow[],
  locale: Locale,
  displayLanguage: PilarDisplayLanguage,
): string {
  if (type === "stalkapasitet" && !hasCapacityResult(rows)) return "";
  return calculationTypeFallback(type, locale, displayLanguage);
}

function explicitTitleForScope(
  title: string,
  rows: CalculationResultRow[],
  rawRequest: string,
  locale: Locale,
  displayLanguage: PilarDisplayLanguage,
): string {
  if (!title) return "";
  if (titleImpliesCapacity(title) && !hasCapacityResult(rows)) {
    return titleFromResults(rows, rawRequest, locale, displayLanguage);
  }
  return title;
}

function subtitleFromResults(rows: CalculationResultRow[]): string {
  const candidates = ["l", "qed", "gk", "qk", "sk", "fy", "gammam0"];
  const parts: string[] = [];
  for (const canonical of candidates) {
    const row = rows.find((item) => canonicalResultKey(item.label) === canonical);
    if (!row) continue;
    const value = row.unit ? `${row.value} ${row.unit}` : row.value;
    parts.push(`${row.label} = ${value}`);
    if (parts.length >= 3) break;
  }
  return parts.join(" · ");
}

function buildCoverText(
  data: UpstreamReportData,
  rows: CalculationResultRow[],
  locale: Locale,
  displayLanguage: PilarDisplayLanguage,
): { title: string; subtitle: string } {
  const parsed = asRecord(data.inputReview?.parsed_data);
  const rawRequest = cleanReportText(data.run.request.raw_text);
  const calculationType = stringField(parsed, "calculation_type");

  const explicitTitle = explicitTitleForScope(
    stringField(parsed, "report_title"),
    rows,
    rawRequest,
    locale,
    displayLanguage,
  );
  const explicitSubtitle = stringField(parsed, "report_subtitle");

  const fallbackTitle =
    calculationTypeFallbackForScope(calculationType, rows, locale, displayLanguage) ||
    titleFromResults(rows, rawRequest, locale, displayLanguage);

  return {
    title: sprint3310hTitleDashSpacing(normalizeTitleTypography(explicitTitle || fallbackTitle || LABELS.title[displayLanguage])),
    subtitle: sprint3310hTitleDashSpacing(normalizeTitleTypography(explicitSubtitle || subtitleFromResults(rows) || LABELS.subtitle[displayLanguage])),
  };
}


function sprint3310hTitleDashSpacing(value: string): string {
  return String(value ?? "")
    .replace(/\s*(?:\u2014|\u2013|ÔÇö|–|—)\s*/g, " — ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function reportText(value: string, displayLanguage: "nb" | "nn" | "en"): string {
  return displayTextForLanguage(value, displayLanguage);
}


function polishForDisplay(text: string, displayLanguage: string = "nb"): string {
  return displayLanguage === "en"
    ? polishEnglishReportTextFinal(text)
    : polishNorwegianRoleText(text, displayLanguage as "nb" | "nn" | "en");
}

export function buildReportModel(data: UpstreamReportData, options: BuildReportModelOptions): ReportModel {
  const locale = options.locale;
  const displayLanguage = inferReportDisplayLanguage({
    locale,
    context: options.engineeringContext,
    persisted: data.run.display_language,
    text: [data.run.request.raw_text, data.report.executive_summary, data.report.technical_assessment, data.report.conclusion].join("\n"),
  });
  const primary = data.agentA;
  const ec3CapacityArtifacts = buildEc3CapacityArtifactsForReport(
    data,
    options,
    displayLanguage,
  );
  const ec3CapacityResultsBlocked =
    isBlockedOutput(data, "results_a") || isBlockedOutput(data, "results_b");
  const primaryResults = isBlockedOutput(data, "results_a")
    ? {}
    : {
        ...(primary.structured_output.results ?? {}),
        ...(!ec3CapacityResultsBlocked ? ec3CapacityArtifacts?.results ?? {} : {}),
      };
  const resultRows = resultRowsFrom(primaryResults, displayLanguage);
  const keyResults = keyResultsFrom(resultRows);
  const tillit = data.report.tillit_score === null || data.report.tillit_score === undefined
    ? { label: LABELS.ukjent[displayLanguage], labelKey: "unknown" }
    : tillitVisuals(data.report.tillit_score, locale);
  const decisionCode = decisionStatusCode(data);
  const decision = displayLanguage === "en"
    ? ({ approved: "Provisionally accepted", approved_with_warnings: "Provisionally accepted with warnings", uncertain: "Uncertain", rejected: "Rejected — requires review", needs_more_input: "Needs more input" }[decisionCode] ?? LABELS.ukjent[displayLanguage])
    : decisionStatusLabel(decisionCode, locale) ?? LABELS.ukjent[displayLanguage];
  const comparisonStatus = data.comparison?.match_status ?? "unknown";
  const comparisonText = matchPhrase(comparisonStatus, locale) ?? "";
  const summary = cleanReportText(data.report.executive_summary);
  const coverText = buildCoverText(data, resultRows, locale, displayLanguage);

  return normalizeReportModel({
    meta: {
      schemaVersion: REPORT_MODEL_VERSION,
      documentId: cleanReportText(data.report.document_id),
      runId: cleanReportText(data.report.id),
      createdAt: cleanReportText(data.report.created_at),
      displayDate: displayDate(data.report.created_at, locale, displayLanguage),
      status: decision,
      statusCode: decisionCode,
      version: displayLanguage === "en" ? formatPromptVersion(data.report.prompt_version).replace(/\bRapportør\b/g, "Reporter") : formatPromptVersion(data.report.prompt_version),
      locale,
      displayLanguage,
      reportUrl: options.reportUrl,
      audience: options.audience ?? "engineer",
    },
    cover: {
      title: coverText.title,
      subtitle: coverText.subtitle,
      shortSummary: limitText(summary, 340),
      qrLabel: LABELS.qrLabel[displayLanguage],
      qrDescription: LABELS.qrDescription[displayLanguage],
      qrUrl: options.reportUrl,
    },
    keyResults,
    summary: {
      text: polishForDisplay(summary, displayLanguage),
      request: cleanReportTextPreserveUserInput(data.run.request.raw_text),
    },
    interpretation: {
      status: displayLanguage === "en" ? ({ klar: "Ready", delvis_klar: "Partly ready", mangelfull: "Incomplete", avvist: "Rejected", uklar: "Unclear", uklart: "Unclear", relevant_ikkje_stotta: "Not supported" }[data.inputReview?.input_status ?? ""] ?? "Unknown") : data.inputReview ? inputStatusLabel(data.inputReview.input_status, locale) : "-",
      statusCode: data.inputReview?.input_status ?? "unknown",
      assumptions: (primary.structured_output.assumptions ?? []).map((text) => reportText(text, displayLanguage)),
    },
    calculation: {
      resultRows,
      steps: isBlockedOutput(data, "calculation_steps_a")
        ? []
        : [
            ...(primary.structured_output.calculation_steps ?? []),
            ...(!isBlockedOutput(data, "calculation_steps_b") && ec3CapacityArtifacts
              ? [ec3CapacityArtifacts.calculationStep]
              : []),
          ].map(normalizeCalculationStep).map((step) => ({
            ...step,
            title: displayTextForLanguage(
              localizeGeneratedEngineeringText(step.title, displayLanguage),
              displayLanguage,
            ),
            prose: displayTextForLanguage(
              localizeGeneratedEngineeringText(step.prose, displayLanguage),
              displayLanguage,
            ),
            formulas: displayLanguage === "en"
              ? step.formulas.map((formula) => displayTextForLanguage(formula, displayLanguage))
              : step.formulas,
          })),
    },
    assessment: {
      professionalAssessment: polishForDisplay(localizeGeneratedEngineeringText(reportText(cleanReportText(data.report.technical_assessment), displayLanguage), displayLanguage), displayLanguage),
      limitations: (primary.structured_output.limitations ?? []).map((text) => reportText(text, displayLanguage)),
      warnings: (primary.structured_output.warnings ?? []).map((text) => reportText(text, displayLanguage)),
    },
    control: {
      decision,
      decisionCode,
      controllerText: polishForDisplay(
        localizeGeneratedEngineeringText(
          cleanReportText(
            data.controllerDecision?.user_message ??
              data.controllerDecision?.reason ??
              "",
          ),
          displayLanguage,
        ),
        displayLanguage,
      ),
      comparisonStatus,
      comparisonText: polishForDisplay(comparisonText, displayLanguage),
      comparisonRows: buildComparisonRows(data, displayLanguage),
      pipelineStatus: buildPipelineStatus(data, locale, displayLanguage),
    },
    trust: {
      score: data.report.tillit_score ?? null,
      label: displayLanguage === "en" ? sprint339FinalNorwegianResidueText(sprint335PolishEnglishText(tillit.label)) : tillit.label,
      tone: displayLanguage === "en" ? sprint339FinalNorwegianResidueText(sprint335PolishEnglishText(tillit.labelKey)) : tillit.labelKey,
      breakdown: data.report.tillit_breakdown ?? null,
    },
    conclusion: polishForDisplay(
      localizeGeneratedEngineeringText(
        reportText(cleanReportText(data.report.conclusion), displayLanguage),
        displayLanguage,
      ),
      displayLanguage,
    ),
    disclaimer: REPORT_DISCLAIMER[displayLanguage],
  });
}
