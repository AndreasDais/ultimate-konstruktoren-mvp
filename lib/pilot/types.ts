import type { EngineeringStandardFamily } from "@/lib/engineering-context";

export type PilotLocale = "nb" | "nn" | "en";

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
  /**
   * Kva standard-profil(ar) dette eksempelet høyrer til. Brukt for å
   * filtrere kva som visast på /pilot basert på brukar sin valde profil
   * (frå /international + engineering-context i localStorage).
   */
  profiles: EngineeringStandardFamily[];
  /**
   * Partial fordi eit eksempel kan vere språkspesifikt: norske
   * EC+NA-eksempel har berre nb/nn, internasjonale profilar har berre en.
   * PilotClient gjer fallback ved rendering om aktivt språk manglar.
   */
  title: Partial<Record<PilotLocale, string>>;
  description: Partial<Record<PilotLocale, string>>;
  prompt: Partial<Record<PilotLocale, string>>;
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
