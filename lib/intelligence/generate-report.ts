import type { SupabaseClient } from "@supabase/supabase-js";
import {
  INTELLIGENCE_AGENT_VERSION,
  type DailyIntelligenceReport,
  type GenerateDailyReportOptions,
  type IntelligenceFinding,
  type IntelligenceRecommendation,
} from "./types";
import { collectDailyIntelligenceSnapshot, getDayWindow } from "./metrics";
import { getLearningFeedbackSummary, getOpenImprovementActionsForCarryover } from "./actions";

type ExistingReportRow = {
  id: string;
  report_date: string;
  summary: string;
  recommendations: IntelligenceRecommendation[] | null;
  proposed_actions: IntelligenceRecommendation[] | null;
};

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function topDistribution(distribution: Record<string, number>): string | null {
  const entries = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const [label, count] = entries[0];
  return `${label} (${count})`;
}

function finding(
  category: IntelligenceFinding["category"],
  title: string,
  detail: string,
  severity: IntelligenceFinding["severity"] = "medium",
  metricKey?: string,
): IntelligenceFinding {
  return { category, title, detail, severity, metricKey };
}

function recommendation(
  category: IntelligenceRecommendation["category"],
  title: string,
  description: string,
  priority: IntelligenceRecommendation["priority"],
  expectedImpact: string,
  effort: IntelligenceRecommendation["effort"],
  riskLevel: IntelligenceRecommendation["riskLevel"],
): IntelligenceRecommendation {
  return { category, title, description, priority, expectedImpact, effort, riskLevel };
}

async function getPreviousReport(
  supabase: SupabaseClient,
  reportDate: string,
): Promise<ExistingReportRow | null> {
  const previousDate = new Date(`${reportDate}T00:00:00.000Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  const dateKey = previousDate.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_intelligence_reports")
    .select("id, report_date, summary, recommendations, proposed_actions")
    .eq("report_date", dateKey)
    .maybeSingle();

  if (error) {
    console.warn("[intelligence] Klarte ikkje hente gårsdagens rapport:", error.message);
    return null;
  }

  return (data ?? null) as ExistingReportRow | null;
}

function buildFindingsAndRecommendations(
  snapshot: Awaited<ReturnType<typeof collectDailyIntelligenceSnapshot>>,
  previousReport: ExistingReportRow | null,
  learningSummary: Awaited<ReturnType<typeof getLearningFeedbackSummary>>,
  openCarryover: IntelligenceRecommendation[],
): {
  pipelineFindings: IntelligenceFinding[];
  productFindings: IntelligenceFinding[];
  costFindings: IntelligenceFinding[];
  marketingFindings: IntelligenceFinding[];
  pricingFindings: IntelligenceFinding[];
  riskNotes: IntelligenceFinding[];
  recommendations: IntelligenceRecommendation[];
  carryoverFromPreviousDay: IntelligenceRecommendation[];
} {
  const pipelineFindings: IntelligenceFinding[] = [];
  const productFindings: IntelligenceFinding[] = [];
  const costFindings: IntelligenceFinding[] = [];
  const marketingFindings: IntelligenceFinding[] = [];
  const pricingFindings: IntelligenceFinding[] = [];
  const riskNotes: IntelligenceFinding[] = [];
  const recommendations: IntelligenceRecommendation[] = [];

  const completionRate = pct(snapshot.counts.runsCompleted, snapshot.counts.runsTotal);
  const uncertaintyRate = pct(
    snapshot.counts.controllerUncertainOrRejected,
    snapshot.counts.controllerTotal,
  );
  const deviationRate = pct(snapshot.counts.comparisonsWithDeviation, snapshot.counts.comparisonsTotal);
  const inputIssueRate = pct(snapshot.counts.inputBlockedOrIncomplete, snapshot.counts.inputReviewsTotal);

  pipelineFindings.push(
    finding(
      "pipeline",
      "Dagleg pipeline-volum",
      `${snapshot.counts.runsTotal} køyringar vart registrert. ${snapshot.counts.runsCompleted} er fullførte (${completionRate} %).`,
      snapshot.counts.runsTotal === 0 ? "low" : "medium",
      "runs.total",
    ),
  );

  if (snapshot.counts.inputBlockedOrIncomplete > 0) {
    pipelineFindings.push(
      finding(
        "pipeline",
        "Input-agenten stoppa eller avgrensa fleire saker",
        `${snapshot.counts.inputBlockedOrIncomplete} av ${snapshot.counts.inputReviewsTotal} input-vurderingar var mangelfulle, avviste eller only delvis klare (${inputIssueRate} %).`,
        inputIssueRate > 25 ? "high" : "medium",
        "input_reviews.total",
      ),
    );
    recommendations.push(
      recommendation(
        "pipeline",
        "Forbetre input-hjelp før køyring",
        "Legg til meir målretta eksempel og mangellister for dei oppgåvetypane som oftast blir stoppa av Tolkar. Målet er færre avviste køyringar og betre datagrunnlag før agent A/B startar.",
        inputIssueRate > 25 ? "high" : "medium",
        "Færre blokkeringar, høgare fullføringsrate og betre useoppleving.",
        "medium",
        "low",
      ),
    );
  }

  if (snapshot.counts.controllerUncertainOrRejected > 0) {
    riskNotes.push(
      finding(
        "risk",
        "Usikre eller avviste kontrollørvedtak",
        `${snapshot.counts.controllerUncertainOrRejected} av ${snapshot.counts.controllerTotal} kontrollørvedtak var usikre eller avviste (${uncertaintyRate} %).`,
        uncertaintyRate > 20 ? "high" : "medium",
        "controller.uncertain_or_rejected",
      ),
    );
    recommendations.push(
      recommendation(
        "pipeline",
        "Analyser usikre kontrollørvedtak",
        "Gå gjennom usikre og avviste rapportar frå dagen. Finn om årsaka er manglande input, feil standarddata, agent-usemje eller for streng/for mild kontrollørlogikk.",
        uncertaintyRate > 20 ? "high" : "medium",
        "Reduserer fagleg risiko og gjer kontrolløragenten meir presis over tid.",
        "medium",
        "low",
      ),
    );
  }

  if (snapshot.counts.comparisonsWithDeviation > 0) {
    pipelineFindings.push(
      finding(
        "pipeline",
        "Engineer A/B hadde avvik",
        `${snapshot.counts.comparisonsWithDeviation} av ${snapshot.counts.comparisonsTotal} samanlikningar hadde avvik (${deviationRate} %).`,
        deviationRate > 20 ? "high" : "medium",
        "comparisons.with_deviation",
      ),
    );
    recommendations.push(
      recommendation(
        "pipeline",
        "Lag avviksoversikt for A/B",
        "Samle dei vanlegaste variablane der Engineer Engineer A and Engineer B er usamde. Prioriter variablar som materialfaktorar, lastkombinasjonar, skjærareal og LTB-relaterte antakingar.",
        deviationRate > 20 ? "high" : "medium",
        "Gir raskare fagleg debugging og betre prompt-/regelgrunnlag.",
        "medium",
        "low",
      ),
    );
  }

  if (snapshot.quality.avgTillitScore !== null) {
    productFindings.push(
      finding(
        "product",
        "Gjennomsnittleg tillit-score",
        `Gjennomsnittleg tillit-score for rapportar i dag var ${snapshot.quality.avgTillitScore}/100. ${snapshot.quality.lowTillitReports} rapportar låg under 70.`,
        snapshot.quality.avgTillitScore < 70 ? "high" : "low",
        "reports.avg_tillit_score",
      ),
    );
  }

  const topCalcType = topDistribution(snapshot.distributions.calculationTypes);
  if (topCalcType) {
    productFindings.push(
      finding(
        "product",
        "Mest brukte oppgåvetype",
        `Den mest registrerte oppgåvetypen var ${topCalcType}. Dette er ein kandidat for eigen mal, betre eksempel og målretta onboarding.`,
        "medium",
        "calculation_type",
      ),
    );
  }

  if (snapshot.counts.errorReportsTotal > 0) {
    const topErrorType = topDistribution(snapshot.distributions.errorTypes) ?? "ukjent feiltype";
    riskNotes.push(
      finding(
        "risk",
        "Brukarar rapporterte feil",
        `${snapshot.counts.errorReportsTotal} feilrapportar vart registrerte. Vanlegaste type: ${topErrorType}.`,
        snapshot.counts.errorReportsTotal > 3 ? "high" : "medium",
        "error_reports.total",
      ),
    );
    recommendations.push(
      recommendation(
        "product",
        "Prioriter manuell gjennomgang av feilrapportar",
        "Gå gjennom nye feilrapportar og knyt dei til konkrete pipeline-steg: input, A/B, samanliknar, kontrollør, rapport eller eksport.",
        "high",
        "Hindrar at same feil gjentek seg og byggjer datasett for læringsagenten.",
        "small",
        "low",
      ),
    );
  }

  if (!snapshot.instrumentation.hasCostEvents) {
    costFindings.push(
      finding(
        "cost",
        "Kostnadsdata er ikkje instrumentert",
        "Agenten fann ikkje tabell for cost_events. Kostnad per run, per agent og per godkjent rapport kan difor ikkje analyserast enno.",
        "medium",
      ),
    );
    recommendations.push(
      recommendation(
        "cost",
        "Instrumenter kostnad per agentkall",
        "Logg modell, input-tokens, output-tokens, estimert kostnad, run_id og agent_name for kvart agentkall.",
        "high",
        "Gjer det mogleg å optimalisere pris, margin og promptlengde basert på faktiske kostnader.",
        "medium",
        "low",
      ),
    );
  }

  if (!snapshot.instrumentation.hasMarketingEvents) {
    marketingFindings.push(
      finding(
        "marketing",
        "Marknadsdata er ikkje instrumentert",
        "Agenten fann ikkje marketing_events. Trafikk, CTA-klikk, delingslenker og konvertering til pipeline kan ikkje analyserast enno.",
        "medium",
      ),
    );
  }

  if (!snapshot.instrumentation.hasPricingEvents) {
    pricingFindings.push(
      finding(
        "pricing",
        "Prisingssignal er ikkje instrumentert",
        "Agenten fann ikkje pricing_events. Gratisbruk, betalingsvilje, plan-limits og margin kan ikkje analyserast enno.",
        "medium",
      ),
    );
    recommendations.push(
      recommendation(
        "pricing",
        "Start enkel prisingslogg",
        "Logg rapportvolum per use, eksportbruk og estimert kostnad per use. Dette er grunnlaget for å setje gratisgrenser og student-/proff-prising.",
        "medium",
        "Gjer framtidig prising meir datadriven og mindre gjetting.",
        "small",
        "low",
      ),
    );
  }

  if (learningSummary.feedbackCount > 0) {
    productFindings.push(
      finding(
        "product",
        "Feedback-loop aktiv",
        `Agenten fann ${learningSummary.feedbackCount} feedback-punkt frå tidlegare forbedringsforslag. Gjennomsnittleg rating: ${learningSummary.avgRating ?? "ikkje nok data"}.`,
        learningSummary.avgRating !== null && learningSummary.avgRating < 3 ? "high" : "medium",
      ),
    );

    if (learningSummary.doNotRepeatPatternCount > learningSummary.repeatPatternCount) {
      riskNotes.push(
        finding(
          "risk",
          "Fleire forslag vart markerte som lite nyttige",
          "Nyare feedback indikerer at agenten bør vere meir forsiktig med å gjenta same type forslag. Prioriter meir konkret evidens frå dagens data før nye tiltak blir foreslått.",
          "medium",
        ),
      );
    }
  }

  const carryoverFromPreviousDay = openCarryover.length
    ? openCarryover
    : [...((previousReport?.proposed_actions ?? []) as IntelligenceRecommendation[])].slice(0, 5);

  return {
    pipelineFindings,
    productFindings,
    costFindings,
    marketingFindings,
    pricingFindings,
    riskNotes,
    recommendations: dedupeRecommendations(recommendations),
    carryoverFromPreviousDay,
  };
}

function dedupeRecommendations(items: IntelligenceRecommendation[]): IntelligenceRecommendation[] {
  const seen = new Set<string>();
  const result: IntelligenceRecommendation[] = [];
  for (const item of items) {
    const key = `${item.category}:${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result.slice(0, 8);
}

function buildSummary(
  snapshot: Awaited<ReturnType<typeof collectDailyIntelligenceSnapshot>>,
  recommendationCount: number,
): string {
  if (snapshot.counts.runsTotal === 0) {
    return "Ingen pipeline-køyringar vart registrerte i dag. Rapporten fokuserer difor på instrumentering, manglande datakjelder og kva som bør loggast for at PILAR kan lære meir systematisk framover.";
  }

  return [
    `PILAR hadde ${snapshot.counts.runsTotal} pipeline-køyringar i dag, der ${snapshot.counts.runsCompleted} vart fullførte og ${snapshot.counts.reportsGenerated} rapportar vart genererte.`,
    `${snapshot.counts.controllerUncertainOrRejected} kontrollørvedtak var usikre eller avviste, og ${snapshot.counts.comparisonsWithDeviation} A/B-samanlikningar hadde avvik.`,
    `Agenten har laga ${recommendationCount} forslag til forbedring basert på dagens data og eventuell carryover frå førre rapport.`,
  ].join(" ");
}

async function saveMetricSnapshots(
  supabase: SupabaseClient,
  reportDate: string,
  metrics: Awaited<ReturnType<typeof collectDailyIntelligenceSnapshot>>["metrics"],
) {
  if (metrics.length === 0) return;

  const rows = metrics.map((m) => ({
    snapshot_date: reportDate,
    metric_key: m.key,
    metric_value: m.value,
    source_table: m.sourceTable,
    diwhileion: m.diwhileion ?? {},
  }));

  const { error } = await supabase.from("daily_metrics_snapshots").upsert(rows, {
    onConflict: "snapshot_date,metric_key,source_table,diwhileion",
  });

  if (error) {
    console.warn("[intelligence] Klarte ikkje lagre metric snapshots:", error.message);
  }
}

async function saveImprovementActions(
  supabase: SupabaseClient,
  reportId: string,
  recommendations: IntelligenceRecommendation[],
) {
  if (recommendations.length === 0) return;

  await supabase
    .from("improvement_actions")
    .delete()
    .eq("report_id", reportId)
    .eq("proposed_by_agent", true)
    .eq("status", "proposed");

  const rows = recommendations.map((item) => ({
    report_id: reportId,
    title: item.title,
    description: item.description,
    category: item.category,
    priority: item.priority,
    expected_impact: item.expectedImpact,
    effort: item.effort,
    risk_level: item.riskLevel,
    status: "proposed",
    proposed_by_agent: true,
    approved_by_user: false,
    metadata: { agent_version: INTELLIGENCE_AGENT_VERSION },
  }));

  const { error } = await supabase.from("improvement_actions").insert(rows);
  if (error) {
    console.warn("[intelligence] Klarte ikkje lagre improvement actions:", error.message);
  }
}

export async function generateDailyIntelligenceReport(
  supabase: SupabaseClient,
  options: GenerateDailyReportOptions = {},
): Promise<DailyIntelligenceReport> {
  const { reportDate } = getDayWindow(options.reportDate);

  if (!options.force) {
    const { data: existing, error } = await supabase
      .from("daily_intelligence_reports")
      .select("*")
      .eq("report_date", reportDate)
      .maybeSingle();

    if (error) {
      console.warn("[intelligence] Klarte ikkje sjekke eksisterande rapport:", error.message);
    } else if (existing) {
      return mapDbReport(existing as Record<string, unknown>);
    }
  }

  const snapshot = await collectDailyIntelligenceSnapshot(supabase, reportDate);
  const previousReport = await getPreviousReport(supabase, reportDate);
  const [learningSummary, openCarryover] = await Promise.all([
    getLearningFeedbackSummary(supabase),
    getOpenImprovementActionsForCarryover(supabase, 5),
  ]);
  const findings = buildFindingsAndRecommendations(snapshot, previousReport, learningSummary, openCarryover);
  const summary = buildSummary(snapshot, findings.recommendations.length);

  const payload = {
    report_date: reportDate,
    summary,
    pipeline_findings: findings.pipelineFindings,
    product_findings: findings.productFindings,
    cost_findings: findings.costFindings,
    marketing_findings: findings.marketingFindings,
    pricing_findings: findings.pricingFindings,
    recommendations: findings.recommendations,
    proposed_actions: findings.recommendations,
    carryover_from_previous_day: findings.carryoverFromPreviousDay,
    risk_notes: findings.riskNotes,
    metrics: snapshot,
    source_window_start: snapshot.windowStart,
    source_window_end: snapshot.windowEnd,
    previous_report_id: previousReport?.id ?? null,
    generated_by: INTELLIGENCE_AGENT_VERSION,
  };

  const query = supabase
    .from("daily_intelligence_reports")
    .upsert(payload, { onConflict: "report_date" })
    .select("*")
    .single();

  const { data, error } = await query;
  if (error || !data) {
    throw new Error(error?.message ?? "Klarte ikkje lagre daily intelligence report");
  }

  const saved = mapDbReport(data as Record<string, unknown>);
  await saveMetricSnapshots(supabase, reportDate, snapshot.metrics);
  await saveImprovementActions(supabase, saved.id!, findings.recommendations);

  return saved;
}

export function mapDbReport(row: Record<string, unknown>): DailyIntelligenceReport {
  const metrics = row.metrics as DailyIntelligenceReport["metrics"];
  return {
    id: String(row.id),
    reportDate: String(row.report_date),
    summary: String(row.summary ?? ""),
    pipelineFindings: (row.pipeline_findings ?? []) as DailyIntelligenceReport["pipelineFindings"],
    productFindings: (row.product_findings ?? []) as DailyIntelligenceReport["productFindings"],
    costFindings: (row.cost_findings ?? []) as DailyIntelligenceReport["costFindings"],
    marketingFindings: (row.marketing_findings ?? []) as DailyIntelligenceReport["marketingFindings"],
    pricingFindings: (row.pricing_findings ?? []) as DailyIntelligenceReport["pricingFindings"],
    recommendations: (row.recommendations ?? []) as DailyIntelligenceReport["recommendations"],
    proposedActions: (row.proposed_actions ?? []) as DailyIntelligenceReport["proposedActions"],
    carryoverFromPreviousDay: (row.carryover_from_previous_day ?? []) as DailyIntelligenceReport["carryoverFromPreviousDay"],
    riskNotes: (row.risk_notes ?? []) as DailyIntelligenceReport["riskNotes"],
    metrics,
    sourceWindowStart: String(row.source_window_start ?? metrics?.windowStart ?? ""),
    sourceWindowEnd: String(row.source_window_end ?? metrics?.windowEnd ?? ""),
    previousReportId: row.previous_report_id ? String(row.previous_report_id) : null,
  };
}
