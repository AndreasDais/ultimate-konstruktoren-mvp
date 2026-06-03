// Pure types for the deterministic Feature Arena rating engine (v0).
//
// No LLM, no DB, no network. Ratings are computed PER ARENA — there is
// intentionally no global / total / overall score (see SAFETY_POLICY.md).
// A rating is evidence-weighted prioritization under one explicit goal, with
// uncertainty. It is not truth and not a build decision. Human remains final.

export type ArenaKey =
  | "safety"
  | "trust"
  | "eval"
  | "product"
  | "moat"
  | "effort"
  | "international";

export type MatchOutcome = "a_win" | "b_win" | "draw";

export type JudgeType =
  | "human"
  | "hybrid"
  | "agent_committee"
  | "single_agent"
  | "rule_based";

export type EvidenceQuality = "none" | "weak" | "normal" | "strong";

export type HypothesisMaturity = "new" | "active" | "established";

/** One match as consumed by the rating engine (derived from a pairwise match record). */
export interface RatingMatch {
  id: string;
  arena: ArenaKey;
  aId: string;
  bId: string;
  outcome: MatchOutcome;
  /** 0..1; clamped to [0.25, 1] when applied. */
  confidence: number;
  judgeType: JudgeType;
  /** Default "normal". */
  evidenceQuality?: EvidenceQuality;
  /** Safety arena: risk reduction directly evidenced. */
  safetyEvidenced?: boolean;
  /** Safety arena: unresolved safety concern dampens the update. */
  safetyUnresolved?: boolean;
}

export interface ExpectedScore {
  expectedA: number;
  expectedB: number;
}

export interface UpdateEloInput {
  ratingA: number;
  ratingB: number;
  outcome: MatchOutcome;
  /** Structural K (see deriveKFactor). */
  k: number;
  /** 0..1, clamped to [0.25, 1]. */
  confidence: number;
  /** See JUDGE_WEIGHTS. */
  judgeWeight: number;
}

export interface UpdateEloResult {
  ratingA: number;
  ratingB: number;
  expectedA: number;
  scoreA: number;
  /** The effective weighted K used for this update. */
  appliedK: number;
}

export interface KFactorInput {
  /** Default "new". */
  maturity?: HypothesisMaturity;
  /** Default "normal". */
  evidenceQuality?: EvidenceQuality;
  arena?: ArenaKey;
  safetyEvidenced?: boolean;
  safetyUnresolved?: boolean;
}

export interface UncertaintyInput {
  matchesCount: number;
  /** Accumulated confidence * judgeWeight * evidenceQualityMultiplier. */
  evidenceWeight: number;
  /** 0..1, default 0. */
  stalePenalty?: number;
}

/** Per-arena rating record. There is intentionally NO global/total/overall score. */
export interface ArenaRating {
  hypothesisId: string;
  arena: ArenaKey;
  rating: number;
  /** 0..1, always present and visible. 1 = very uncertain. */
  uncertainty: number;
  matchesCount: number;
  wins: number;
  losses: number;
  draws: number;
  evidenceWeight: number;
  lastMatchId: string | null;
}

export interface RecomputeOptions {
  /** Default 1500. */
  startRating?: number;
}
