export type PilotLocale = "nb" | "nn";

export type PilotExampleCategory =
  | "beam"
  | "load_combination"
  | "steel_capacity"
  | "buckling"
  | "own_task";

export type PilotDifficulty = "easy" | "medium" | "hard";

export type PilotExample = {
  id: string;
  category: PilotExampleCategory;
  difficulty: PilotDifficulty;
  title: Record<PilotLocale, string>;
  description: Record<PilotLocale, string>;
  prompt: Record<PilotLocale, string>;
  tags: string[];
};

export type PilotFeedbackRating = "useful" | "partly" | "not_useful";
export type PilotTrustLevel = "trusted" | "partly_trusted" | "not_trusted" | "not_sure";
export type PilotUseCase =
  | "understand_task"
  | "check_answer"
  | "report_writing"
  | "calculation_sheet"
  | "latex_overleaf"
  | "word_report"
  | "other";

export type PilotFeedbackPayload = {
  runId?: string | null;
  rating: PilotFeedbackRating;
  trustLevel: PilotTrustLevel;
  useCase: PilotUseCase;
  comment?: string | null;
  wantsFollowup?: boolean;
  reportUrl?: string | null;
  source?: "report" | "calculation_sheet" | "pilot_page" | "admin";
  metadata?: Record<string, unknown>;
};

export type PilotMetricCard = {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
};

export type PilotFeedbackRow = {
  id: string;
  run_id: string | null;
  rating: PilotFeedbackRating;
  trust_level: PilotTrustLevel;
  use_case: PilotUseCase;
  comment: string | null;
  source: string | null;
  report_url: string | null;
  created_at: string;
};
