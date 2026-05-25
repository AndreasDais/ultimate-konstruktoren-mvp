import { confidenceLabel, decisionStatusLabel, decisionStatusShort, formatPromptVersion, inputStatusLabel, matchPhrase, matchStatusShort, } from "@/lib/format";
import type { Locale } from "@/lib/locale";
import { polishEnglishGeneratedText, sprint335PolishEnglishText } from "@/lib/international/display";
import type { EngineeringContext } from "@/lib/engineering-context";
import {
  inferReportDisplayLanguage,
  localizeGeneratedEngineeringText,
  localizeResultLabel,
  type PilarDisplayLanguage,
} from "@/lib/international/display";
import { tillitVisuals, type TillitBreakdown } from "@/lib/tillit-score";
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
  run: { request: { raw_text: string } };
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
  konstruktorA: { nb: "Engineer A", nn: "Engineer A", en: "Engineer A" },
  konstruktorB: { nb: "Engineer B", nn: "Engineer B", en: "Engineer B" },
  samanlikning: { nb: "Sammenligning", nn: "Samanlikning", en: "Comparison" },
  kontrollor: { nb: "Controller", nn: "Controller", en: "Controller" },
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

function resultRowsFrom(results: Record<string, string> | undefined, currentDisplayLanguage: PilarDisplayLanguage): CalculationResultRow[] {
  const byCanonical = new Map<string, CalculationResultRow>();

  for (const [sourceLabel, raw] of Object.entries(results ?? {})) {
    const cleanedRaw = compactReportText(raw);
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

function numericValue(raw: string): number | null {
  const token = raw.replace(/\s/g, "").match(/-?[\d.,]+/);
  if (!token) return null;
  const parsed = Number.parseFloat(token[0].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function valuesMatch(a: string, b: string): boolean {
  if (a === "-" || b === "-") return false;
  if (a === b) return true;
  const aNum = numericValue(a);
  const bNum = numericValue(b);
  if (aNum === null || bNum === null) return false;
  const diff = Math.abs(aNum - bNum);
  const scale = Math.max(1, Math.abs(aNum), Math.abs(bNum));
  // Små avrundingsforskjellar som 15,075 vs 15,08 skal ikkje gi avvik
  // i kontrolltabellen. Reelle avvik som 2760 vs 2568 blir framleis fanga.
  return diff <= 0.01 || diff / scale <= 0.001;
}

function buildComparisonRows(data: UpstreamReportData, displayLanguage: PilarDisplayLanguage): ComparisonRow[] {
  const resultsA = data.agentA.structured_output.results ?? {};
  const resultsB = data.agentB.structured_output.results ?? {};
  const groups = new Map<string, { label: string; a: string; b: string; score: number }>();

  for (const [sourceLabel, raw] of Object.entries(resultsA)) {
    const canonical = canonicalResultKey(sourceLabel);
    const current = groups.get(canonical);
    const score = resultPriorityScore(sourceLabel);
    groups.set(canonical, {
      label: current && current.score < score ? current.label : displayResultLabel(sourceLabel),
      a: compactReportText(raw),
      b: current?.b ?? "-",
      score: Math.min(score, current?.score ?? score),
    });
  }

  for (const [sourceLabel, raw] of Object.entries(resultsB)) {
    const canonical = canonicalResultKey(sourceLabel);
    const current = groups.get(canonical);
    const score = resultPriorityScore(sourceLabel);
    groups.set(canonical, {
      label: current && current.score < score ? current.label : displayResultLabel(sourceLabel),
      a: current?.a ?? "-",
      b: compactReportText(raw),
      score: Math.min(score, current?.score ?? score),
    });
  }

  return Array.from(groups.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, 12)
    .map((row) => ({
      label: localizeResultLabel(row.label, displayLanguage),
      constructorA: row.a || "-",
      constructorB: row.b || "-",
      match: valuesMatch(row.a || "-", row.b || "-"),
    }));
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
    ? ({ approved: "Approved", approved_with_warnings: "With warnings", uncertain: "Uncertain", rejected: "Rejected", needs_more_input: "Needs input" } as Record<string, string>)[data.controllerDecision?.decision_status ?? ""] ?? "-"
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

function titleFromResults(rows: CalculationResultRow[], rawRequest: string, locale: Locale, displayLanguage: PilarDisplayLanguage = locale): string {
  const has = (canonical: string) => rows.some((row) => canonicalResultKey(row.label) === canonical);
  const request = rawRequest.toLowerCase();

  if (displayLanguage === "en") {
    if (/\bW\d+x\d+\b/i.test(rawRequest) || request.includes("aisc") || request.includes("asce") || request.includes("steel beam")) {
      return "Steel beam — demand and LTB screening";
    }
  }

  const profile = rawRequest.match(/\b(?:IPE|HEA|HEB|HEM|UNP|UPN)\s*\d{2,4}\b/i)?.[0];

  if (has("etam") || has("etav") || has("mplrd") || has("vplrd") || request.includes("kapasitet")) {
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

  const explicitTitle = stringField(parsed, "report_title");
  const explicitSubtitle = stringField(parsed, "report_subtitle");

  const fallbackTitle =
    calculationTypeFallback(calculationType, locale, displayLanguage) ||
    titleFromResults(rows, rawRequest, locale, displayLanguage);

  return {
    title: normalizeTitleTypography(explicitTitle || fallbackTitle || LABELS.title[displayLanguage]),
    subtitle: normalizeTitleTypography(explicitSubtitle || subtitleFromResults(rows) || LABELS.subtitle[displayLanguage]),
  };
}

function reportText(value: string, displayLanguage: "nb" | "nn" | "en"): string {
  return displayLanguage === "en" ? polishEnglishGeneratedText(value) : value;
}


function polishForDisplay(text: string, displayLanguage: string = "nb"): string {
  const base = displayLanguage === "en" ? sprint335PolishEnglishText(text) : text;
  return displayLanguage === "en" ? sprint339FinalNorwegianResidueText(base) : base;
}

export function buildReportModel(data: UpstreamReportData, options: BuildReportModelOptions): ReportModel {
  const locale = options.locale;
  const displayLanguage = inferReportDisplayLanguage({
    locale,
    context: options.engineeringContext,
    text: [data.run.request.raw_text, data.report.executive_summary, data.report.technical_assessment, data.report.conclusion].join("\n"),
  });
  const primary = data.agentA;
  const resultRows = resultRowsFrom(primary.structured_output.results, displayLanguage);
  const keyResults = keyResultsFrom(resultRows);
  const tillit = data.report.tillit_score === null || data.report.tillit_score === undefined
    ? { label: LABELS.ukjent[displayLanguage], labelKey: "unknown" }
    : tillitVisuals(data.report.tillit_score, locale);
  const decisionCode = decisionStatusCode(data);
  const decision = displayLanguage === "en"
    ? ({ approved: "Preliminarily approved", approved_with_warnings: "Approved with warnings", uncertain: "Uncertain", rejected: "Rejected — requires review", needs_more_input: "Needs more input" }[decisionCode] ?? LABELS.ukjent[displayLanguage])
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
      steps: (primary.structured_output.calculation_steps ?? []).map(normalizeCalculationStep).map((step) => ({ ...step, title: localizeGeneratedEngineeringText(step.title, displayLanguage), prose: localizeGeneratedEngineeringText(step.prose, displayLanguage) })),
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
