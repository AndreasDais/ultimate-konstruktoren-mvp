// Deterministic rating policy constants and helpers (v0).
//
// Encodes handoff section 8.2 (K policy) and 8.3 (uncertainty policy).
// No LLM, no DB, no network. Pure functions only.

import type {
  JudgeType,
  EvidenceQuality,
  HypothesisMaturity,
  KFactorInput,
  UncertaintyInput,
} from "./types";

export const BASE_K: Record<HypothesisMaturity, number> = {
  new: 48,
  active: 32,
  established: 16,
};

export const JUDGE_WEIGHTS: Record<JudgeType, number> = {
  human: 1.5,
  hybrid: 1.0,
  agent_committee: 0.6,
  single_agent: 0.35,
  rule_based: 0.75,
};

export const EVIDENCE_QUALITY_MULTIPLIER: Record<EvidenceQuality, number> = {
  none: 0.25,
  weak: 0.5,
  normal: 1.0,
  strong: 1.25,
};

export const CONFIDENCE_MIN = 0.25;
export const CONFIDENCE_MAX = 1.0;
export const SAFETY_EVIDENCED_MULTIPLIER = 1.25;
export const SAFETY_UNRESOLVED_MULTIPLIER = 0.5;

/** Prior weight C in the uncertainty formula C / (C + evidenceWeight). */
export const UNCERTAINTY_PRIOR = 3;

/** Clamp judge/match confidence to [0.25, 1.0]. */
export function clampConfidence(confidence: number): number {
  if (!Number.isFinite(confidence)) return CONFIDENCE_MIN;
  return Math.min(CONFIDENCE_MAX, Math.max(CONFIDENCE_MIN, confidence));
}

export function judgeWeight(judge: JudgeType): number {
  return JUDGE_WEIGHTS[judge] ?? JUDGE_WEIGHTS.single_agent;
}

export function maturityFromMatchCount(count: number): HypothesisMaturity {
  if (count <= 0) return "new";
  if (count < 10) return "active";
  return "established";
}

/**
 * Structural K factor: hypothesis maturity x evidence quality x safety.
 * Confidence and judgeWeight are applied separately in updateElo so they can
 * vary per match. Higher K = more volatile rating.
 */
export function deriveKFactor(input: KFactorInput = {}): number {
  const maturity = input.maturity ?? "new";
  const evidenceQuality = input.evidenceQuality ?? "normal";
  let k = BASE_K[maturity] * EVIDENCE_QUALITY_MULTIPLIER[evidenceQuality];
  if (input.arena === "safety") {
    if (input.safetyUnresolved) {
      k *= SAFETY_UNRESOLVED_MULTIPLIER;
    } else if (input.safetyEvidenced) {
      k *= SAFETY_EVIDENCED_MULTIPLIER;
    }
  }
  return k;
}

/**
 * Uncertainty in [0, 1] (1 = very uncertain). Starts at 1.0 with no evidence,
 * decreases as high-quality match weight accumulates, and is never hidden.
 * A high rating with high uncertainty means "promising but uncertain", not
 * "ready to build".
 */
export function deriveUncertainty(input: UncertaintyInput): number {
  const weight = Math.max(0, input.evidenceWeight);
  let uncertainty = UNCERTAINTY_PRIOR / (UNCERTAINTY_PRIOR + weight);
  uncertainty += input.stalePenalty ?? 0;
  if (uncertainty < 0) return 0;
  if (uncertainty > 1) return 1;
  return uncertainty;
}
