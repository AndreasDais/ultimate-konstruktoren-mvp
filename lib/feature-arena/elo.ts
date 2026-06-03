// Deterministic Elo update (v0). Encodes handoff section 8.1.
//
// No LLM, no DB, no network, no randomness. Same input -> same output.

import type {
  MatchOutcome,
  ExpectedScore,
  UpdateEloInput,
  UpdateEloResult,
} from "./types";
import { clampConfidence } from "./rating-policy";

/**
 * Expected score for A vs B on the 400-point logistic scale.
 * expectedA + expectedB === 1. Deterministic.
 */
export function expectedScore(ratingA: number, ratingB: number): ExpectedScore {
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  return { expectedA, expectedB: 1 - expectedA };
}

/** Actual score for A: 1 (a_win), 0.5 (draw), 0 (b_win). */
export function scoreForOutcome(outcome: MatchOutcome): number {
  if (outcome === "a_win") return 1;
  if (outcome === "b_win") return 0;
  return 0.5;
}

/**
 * Deterministic Elo update for one match.
 *
 *   weightedK = k * clampConfidence(confidence) * judgeWeight
 *   newA = ratingA + weightedK * (scoreA - expectedA)
 *   newB = ratingB + weightedK * ((1 - scoreA) - (1 - expectedA))
 *
 * A win raises A and lowers B by the same amount; a draw nudges both toward the
 * expectation; confidence and judge weight scale the update magnitude.
 */
export function updateElo(input: UpdateEloInput): UpdateEloResult {
  const { ratingA, ratingB, outcome, k, confidence, judgeWeight } = input;
  const { expectedA } = expectedScore(ratingA, ratingB);
  const scoreA = scoreForOutcome(outcome);
  const appliedK = k * clampConfidence(confidence) * judgeWeight;
  const newA = ratingA + appliedK * (scoreA - expectedA);
  const newB = ratingB + appliedK * (1 - scoreA - (1 - expectedA));
  return { ratingA: newA, ratingB: newB, expectedA, scoreA, appliedK };
}
