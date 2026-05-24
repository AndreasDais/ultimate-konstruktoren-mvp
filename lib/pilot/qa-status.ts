export type QaRubricTally = {
  korrekt: number;
  trygt_feil: number;
  farleg_feil: number;
  klassifiseringsfeil: number;
};

export type QaCaseSummary = {
  caseId: string;
  passed: boolean;
  correctRuns: number;
  totalRuns: number;
  worstVerdict: string;
};

export type QaStatusSummary = {
  hasReport: boolean;
  reportId: string | null;
  timestamp: string | null;
  mode: string | null;
  runsPerCase: number | null;
  port1Pct: number | null;
  port1Pass: boolean | null;
  port2Count: number | null;
  port2Pass: boolean | null;
  rubricTally: QaRubricTally | null;
  casesPassed: number;
  casesTotal: number;
  failingCases: QaCaseSummary[];
  regressedFindings: string[];
  latestReportPath: string | null;
  command: string;
};

export type DailyMonitoringSummary = {
  hasReport: boolean;
  reportId: string | null;
  date: string | null;
  runs: number | null;
  disagreementRate: number | null;
  shadowHitRate: number | null;
  dangerousCandidates: number | null;
  anomalies: { signal: string; severity: string; current: number; baseline: number }[];
  topClusters: { type: string; count: number; note: string }[];
  latestReportPath: string | null;
  command: string;
};

export type PilotReadinessOpsResponse = {
  ok: boolean;
  generatedAt: string;
  qa: QaStatusSummary;
  daily: DailyMonitoringSummary;
  readiness: {
    qaGreen: boolean | null;
    dailyAvailable: boolean;
    dangerousFindingsClear: boolean | null;
    recommendation: string;
  };
  errors: string[];
};
