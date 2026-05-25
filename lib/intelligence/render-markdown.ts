import { INTELLIGENCE_AGENT_VERSION } from "./types";
import type {
  DailyIntelligenceReport,
  ImprovementAction,
  IntelligenceFinding,
  IntelligenceRecommendation,
} from "./types";

type MarkdownAction = ImprovementAction & {
  metadata?: Record<string, unknown>;
};

function escapePipe(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
}

function bulletList(items: string[]): string {
  if (!items.length) return "- Ingen registrert.";
  return items.map((item) => `- ${item}`).join("\n");
}

function findingSection(title: string, findings: IntelligenceFinding[]): string {
  if (!findings.length) {
    return `## ${title}\n\nIngen funn registrert.\n`;
  }

  return [
    `## ${title}`,
    "",
    "| Alvor | Kategori | Funn | Detalj |",
    "| --- | --- | --- | --- |",
    ...findings.map((finding) =>
      `| ${escapePipe(finding.severity)} | ${escapePipe(finding.category)} | ${escapePipe(finding.title)} | ${escapePipe(finding.detail)} |`,
    ),
    "",
  ].join("\n");
}

function recommendationTable(items: IntelligenceRecommendation[]): string {
  if (!items.length) return "Ingen anbefalingar registrert.";

  return [
    "| Prioritet | Kategori | Tiltak | Effekt | Innsats | Risiko |",
    "| --- | --- | --- | --- | --- | --- |",
    ...items.map((item) =>
      `| ${escapePipe(item.priority)} | ${escapePipe(item.category)} | **${escapePipe(item.title)}**<br>${escapePipe(item.description)} | ${escapePipe(item.expectedImpact)} | ${escapePipe(item.effort)} | ${escapePipe(item.riskLevel)} |`,
    ),
  ].join("\n");
}

function actionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    proposed: "Foreslått",
    approved: "Godkjent",
    rejected: "Avvist",
    planned: "Planlagt",
    implemented: "Implementert",
    verified: "Verifisert",
    deferred: "Utsett",
  };
  return labels[status] ?? status;
}

function actionTable(actions: MarkdownAction[]): string {
  if (!actions.length) return "Ingen forbedringsforslag registrert.";

  return [
    "| Status | Prioritet | Kategori | Tiltak | Risiko | Feedback |",
    "| --- | --- | --- | --- | --- | --- |",
    ...actions.map((action) =>
      `| ${escapePipe(actionStatusLabel(action.status))} | ${escapePipe(action.priority)} | ${escapePipe(action.category)} | **${escapePipe(action.title)}**<br>${escapePipe(action.description)} | ${escapePipe(action.riskLevel)} | ${escapePipe(action.userFeedback ?? "")} |`,
    ),
  ].join("\n");
}

function implementationPlanSummary(actions: MarkdownAction[]): string {
  const planned = actions.filter((action) => {
    const metadata = action.metadata ?? {};
    return Boolean(metadata.implementationPlan);
  });

  if (!planned.length) return "Ingen implementeringsplanar laga endå.";

  return planned
    .map((action) => {
      const metadata = action.metadata ?? {};
      const plan = metadata.implementationPlan as {
        summary?: string;
        riskLevel?: string;
        recommendedBranch?: string;
        filesToInspect?: string[];
        tests?: string[];
        acceptanceCriteria?: string[];
        rollbackPlan?: string[];
      } | undefined;

      return [
        `### ${action.title}`,
        "",
        `- Status: ${actionStatusLabel(action.status)}`,
        `- Risiko: ${plan?.riskLevel ?? action.riskLevel}`,
        `- Branch: \`${plan?.recommendedBranch ?? "ikkje sett"}\``,
        `- Samandrag: ${plan?.summary ?? "Ingen plan-samandrag"}`,
        "- Filer:",
        bulletList((plan?.filesToInspect ?? []).slice(0, 8).map((file) => `\`${file}\``)),
        "- Testar:",
        bulletList(plan?.tests ?? []),
        "- Akseptanse:",
        bulletList(plan?.acceptanceCriteria ?? []),
        "- Rollback:",
        bulletList(plan?.rollbackPlan ?? []),
      ].join("\n");
    })
    .join("\n\n");
}

export function renderDailyIntelligenceMarkdown(
  report: DailyIntelligenceReport,
  actions: MarkdownAction[] = [],
): string {
  const counts = report.metrics.counts;
  const quality = report.metrics.quality;
  const generatedAt = new Date().toISOString();

  return [
    `# PILAR Daily Intelligence Report — ${report.reportDate}`,
    "",
    `**Generert:** ${generatedAt}`,
    `**Agent:** ${INTELLIGENCE_AGENT_VERSION}`,
    "",
    "## Sammendrag",
    "",
    report.summary,
    "",
    "## Nøkkeltal",
    "",
    "| Metrikk | Verdi |",
    "| --- | ---: |",
    `| Pipeline-runs | ${counts.runsTotal} |`,
    `| Fullførte runs | ${counts.runsCompleted} |`,
    `| Rapportar generert | ${counts.reportsGenerated} |`,
    `| Usikker/avvist kontrollør | ${counts.controllerUncertainOrRejected} |`,
    `| A/B-avvik | ${counts.comparisonsWithDeviation} |`,
    `| Feilrapportar | ${counts.errorReportsTotal} |`,
    `| Ca. aktive usear | ${counts.activeUsersApprox} |`,
    `| Gj.snitt tillit | ${quality.avgTillitScore ?? "—"} |`,
    `| Låg tillit | ${quality.lowTillitReports} |`,
    "",
    findingSection("Pipeline-funn", report.pipelineFindings),
    findingSection("Produktfunn", report.productFindings),
    findingSection("Kostnad", report.costFindings),
    findingSection("Marknadsføring", report.marketingFindings),
    findingSection("Prising", report.pricingFindings),
    findingSection("Risiko", report.riskNotes),
    "## Agentens anbefalingar",
    "",
    recommendationTable(report.recommendations),
    "",
    "## Carryover frå førre rapport",
    "",
    recommendationTable(report.carryoverFromPreviousDay),
    "",
    "## Forbedringsboard",
    "",
    actionTable(actions),
    "",
    "## Implementeringsplanar",
    "",
    implementationPlanSummary(actions),
    "",
    "---",
    "",
    "Denne rapporten er generert av PILAR sin interne lærings- og forbedringsagent. Tiltak skal vurderast av ansvarleg person før produksjonsendringar.",
    "",
  ].join("\n");
}
