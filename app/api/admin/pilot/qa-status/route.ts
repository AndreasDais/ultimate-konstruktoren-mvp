import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type {
  DailyMonitoringSummary,
  PilotReadinessOpsResponse,
  QaCaseSummary,
  QaRubricTally,
  QaStatusSummary,
} from "@/lib/pilot/qa-status";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type LatestJsonResult = {
  record: JsonRecord | null;
  relPath: string | null;
  error?: string;
};

const QA_COMMAND = "npm run test:golden -- --case A1 --runs 3";
const DAILY_COMMAND = "npm run daily:report";

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function readLatestJsonReport(relativeDir: string): Promise<LatestJsonResult> {
  const absoluteDir = path.join(process.cwd(), relativeDir);

  try {
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    const jsonFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a));

    if (jsonFiles.length === 0) {
      return { record: null, relPath: null, error: `${relativeDir}: no JSON reports found` };
    }

    const latestName = jsonFiles[0];
    const relPath = `${relativeDir}/${latestName}`.replace(/\\/g, "/");
    const raw = await readFile(path.join(absoluteDir, latestName), "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      return { record: null, relPath, error: `${relPath}: report is not a JSON object` };
    }

    return { record: parsed, relPath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { record: null, relPath: null, error: `${relativeDir}: ${message}` };
  }
}

function parseRubricTally(value: unknown): QaRubricTally | null {
  if (!isRecord(value)) return null;

  return {
    korrekt: asNumber(value.korrekt) ?? 0,
    trygt_feil: asNumber(value.trygt_feil) ?? 0,
    farleg_feil: asNumber(value.farleg_feil) ?? 0,
    klassifiseringsfeil: asNumber(value.klassifiseringsfeil) ?? 0,
  };
}

function parseQa(record: JsonRecord | null, relPath: string | null): QaStatusSummary {
  if (!record) {
    return {
      hasReport: false,
      reportId: null,
      timestamp: null,
      mode: null,
      runsPerCase: null,
      port1Pct: null,
      port1Pass: null,
      port2Count: null,
      port2Pass: null,
      rubricTally: null,
      casesPassed: 0,
      casesTotal: 0,
      failingCases: [],
      regressedFindings: [],
      latestReportPath: relPath,
      command: QA_COMMAND,
    };
  }

  const cases = asArray(record.per_case);
  const caseSummaries: QaCaseSummary[] = cases.map((item) => {
    const row = isRecord(item) ? item : {};
    return {
      caseId: asString(row.case_id) ?? "ukjend",
      passed: asBoolean(row.bestatt) ?? false,
      correctRuns: asNumber(row.korrekt_av_n) ?? 0,
      totalRuns: asNumber(row.runs_total) ?? 0,
      worstVerdict: asString(row.verdikt_verst) ?? "ukjend",
    };
  });

  const findings = asArray(record.findings_observed);
  const regressedFindings = findings
    .map((item) => (isRecord(item) ? item : null))
    .filter((item): item is JsonRecord => item !== null)
    .filter((item) => item.delta === "regressert")
    .map((item) => asString(item.id) ?? "ukjend");

  return {
    hasReport: true,
    reportId: asString(record.report_id),
    timestamp: asString(record.ts),
    mode: asString(record.mode),
    runsPerCase: asNumber(record.runs_per_case),
    port1Pct: asNumber(record.port1_pct),
    port1Pass: asBoolean(record.port1_pass),
    port2Count: asNumber(record.port2_count),
    port2Pass: asBoolean(record.port2_pass),
    rubricTally: parseRubricTally(record.rubric_tally),
    casesPassed: caseSummaries.filter((item) => item.passed).length,
    casesTotal: caseSummaries.length,
    failingCases: caseSummaries.filter((item) => !item.passed).slice(0, 8),
    regressedFindings,
    latestReportPath: relPath,
    command: QA_COMMAND,
  };
}

function parseDaily(record: JsonRecord | null, relPath: string | null): DailyMonitoringSummary {
  if (!record) {
    return {
      hasReport: false,
      reportId: null,
      date: null,
      runs: null,
      disagreementRate: null,
      shadowHitRate: null,
      dangerousCandidates: null,
      anomalies: [],
      topClusters: [],
      latestReportPath: relPath,
      command: DAILY_COMMAND,
    };
  }

  const summary = isRecord(record.signal_summary) ? record.signal_summary : {};
  const anomalies = asArray(record.anomaliar)
    .map((item) => (isRecord(item) ? item : null))
    .filter((item): item is JsonRecord => item !== null)
    .map((item) => ({
      signal: asString(item.signal) ?? "ukjend",
      severity: asString(item.alvor) ?? "ukjend",
      current: asNumber(item.i_dag) ?? 0,
      baseline: asNumber(item.baseline) ?? 0,
    }))
    .slice(0, 8);

  const topClusters = asArray(record.klynger)
    .map((item) => (isRecord(item) ? item : null))
    .filter((item): item is JsonRecord => item !== null)
    .map((item) => ({
      type: asString(item.berekningstype) ?? "ukjend",
      count: asNumber(item.n) ?? 0,
      note: asString(item.signal_notat) ?? "",
    }))
    .slice(0, 5);

  return {
    hasReport: true,
    reportId: asString(record.report_id),
    date: asString(record.dato),
    runs: asNumber(record.n_runs),
    disagreementRate: asNumber(summary.samanliknar_usemje_rate),
    shadowHitRate: asNumber(summary.shadow_check_treff_rate),
    dangerousCandidates: asNumber(summary.farleg_feil_kandidatar),
    anomalies,
    topClusters,
    latestReportPath: relPath,
    command: DAILY_COMMAND,
  };
}

export async function GET() {
  const [qaResult, dailyResult] = await Promise.all([
    readLatestJsonReport("qa/reports"),
    readLatestJsonReport("daily/reports"),
  ]);

  const qa = parseQa(qaResult.record, qaResult.relPath);
  const daily = parseDaily(dailyResult.record, dailyResult.relPath);
  const errors = [qaResult.error, dailyResult.error].filter(Boolean) as string[];
  const qaGreen = qa.hasReport ? qa.port1Pass === true && qa.port2Pass === true : null;
  const dangerousFindingsClear = qa.hasReport ? qa.regressedFindings.length === 0 && qa.port2Count === 0 : null;

  const response: PilotReadinessOpsResponse = {
    ok: true,
    generatedAt: new Date().toISOString(),
    qa,
    daily,
    readiness: {
      qaGreen,
      dailyAvailable: daily.hasReport,
      dangerousFindingsClear,
      recommendation:
        qaGreen && dangerousFindingsClear
          ? "Pilot-readiness ser god ut. Hald fram med manuell kontroll før ekstern pilot."
          : "Køyr test-agenten og sjekk eventuelle feila case før du inviterer fleire pilotbrukarar.",
    },
    errors,
  };

  return NextResponse.json(response);
}
