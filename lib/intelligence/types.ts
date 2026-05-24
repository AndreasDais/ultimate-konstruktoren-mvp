export const INTELLIGENCE_AGENT_VERSION = "pilar_intelligence_v0.3";

export type IntelligenceFindingCategory =
  | "pipeline"
  | "pipeline_quality"
  | "product"
  | "product_usage"
  | "input_validation"
  | "quality_control"
  | "report_export"
  | "cost"
  | "unit_economics"
  | "marketing"
  | "growth"
  | "pricing"
  | "timing"
  | "risk"
  | "technical_debt"
  | "security"
  | "other";
  
export type ImprovementPriority = "low" | "medium" | "high" | "critical";
export type ImprovementEffort = "small" | "medium" | "large";
export type ImprovementRisk = "low" | "medium" | "high";

export type ImprovementActionStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "planned"
  | "implemented"
  | "verified"
  | "deferred";

export type DailyMetric = {
  key: string;
  value: number;
  sourceTable: string;
  dimension?: Record<string, unknown>;
};

export type IntelligenceFinding = {
  category: IntelligenceFindingCategory;
  title: string;
  detail: string;
  severity: ImprovementPriority;
  metricKey?: string;
};

export type IntelligenceRecommendation = {
  title: string;
  description: string;
  category: IntelligenceFindingCategory;
  priority: ImprovementPriority;
  expectedImpact: string;
  effort: ImprovementEffort;
  riskLevel: ImprovementRisk;
};

export type ImprovementAction = IntelligenceRecommendation & {
  id: string;
  reportId: string | null;
  status: ImprovementActionStatus;
  proposedByAgent: boolean;
  approvedByUser: boolean;
  implementedAt: string | null;
  resultSummary: string | null;
  userFeedback: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AgentLearningFeedback = {
  id: string;
  actionId: string | null;
  feedbackType: string;
  userRating: number | null;
  userComment: string | null;
  actualOutcome: string | null;
  shouldRepeatPattern: boolean | null;
  createdAt: string;
};

export type LearningFeedbackSummary = {
  feedbackCount: number;
  avgRating: number | null;
  repeatPatternCount: number;
  doNotRepeatPatternCount: number;
  recentPositiveSignals: string[];
  recentNegativeSignals: string[];
};

export type IntelligenceSnapshot = {
  reportDate: string;
  windowStart: string;
  windowEnd: string;
  metrics: DailyMetric[];
  counts: {
    runsTotal: number;
    runsCompleted: number;
    reportsGenerated: number;
    inputReviewsTotal: number;
    inputBlockedOrIncomplete: number;
    controllerTotal: number;
    controllerApproved: number;
    controllerUncertainOrRejected: number;
    comparisonsTotal: number;
    comparisonsWithDeviation: number;
    errorReportsTotal: number;
    activeUsersApprox: number;
  };
  distributions: {
    runStatus: Record<string, number>;
    calculationTypes: Record<string, number>;
    inputStatus: Record<string, number>;
    controllerStatus: Record<string, number>;
    comparisonStatus: Record<string, number>;
    errorTypes: Record<string, number>;
  };
  quality: {
    avgTillitScore: number | null;
    lowTillitReports: number;
  };
  instrumentation: {
    hasCostEvents: boolean;
    hasMarketingEvents: boolean;
    hasPricingEvents: boolean;
    hasExportEvents: boolean;
  };
};

export type DailyIntelligenceReport = {
  id?: string;
  reportDate: string;
  summary: string;
  pipelineFindings: IntelligenceFinding[];
  productFindings: IntelligenceFinding[];
  costFindings: IntelligenceFinding[];
  marketingFindings: IntelligenceFinding[];
  pricingFindings: IntelligenceFinding[];
  recommendations: IntelligenceRecommendation[];
  proposedActions: IntelligenceRecommendation[];
  carryoverFromPreviousDay: IntelligenceRecommendation[];
  riskNotes: IntelligenceFinding[];
  metrics: IntelligenceSnapshot;
  sourceWindowStart: string;
  sourceWindowEnd: string;
  previousReportId?: string | null;
};

export type GenerateDailyReportOptions = {
  reportDate?: string;
  force?: boolean;
};
