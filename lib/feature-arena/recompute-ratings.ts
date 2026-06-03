// Deterministic per-arena rating recompute from an ordered match list (v0).
//
// No LLM, no DB, no network. Same input -> same output. Ratings are keyed by
// (arena, hypothesisId): a hypothesis can be strong in one arena and weak in
// another. There is no global / total / overall score.

import type {
  RatingMatch,
  ArenaRating,
  ArenaKey,
  EvidenceQuality,
  RecomputeOptions,
} from "./types";
import {
  deriveKFactor,
  deriveUncertainty,
  judgeWeight,
  clampConfidence,
  maturityFromMatchCount,
  EVIDENCE_QUALITY_MULTIPLIER,
} from "./rating-policy";
import { updateElo } from "./elo";

const DEFAULT_START_RATING = 1500;

function ratingKey(arena: ArenaKey, hypothesisId: string): string {
  return arena + "::" + hypothesisId;
}

/**
 * Recompute per-arena ratings from matches processed in array order.
 * Deterministic: the output array is sorted by (arena, hypothesisId).
 */
export function recomputeRatingsFromMatches(
  matches: readonly RatingMatch[],
  options: RecomputeOptions = {},
): ArenaRating[] {
  const startRating = options.startRating ?? DEFAULT_START_RATING;
  const ratings = new Map<string, ArenaRating>();

  const ensure = (hypothesisId: string, arena: ArenaKey): ArenaRating => {
    const key = ratingKey(arena, hypothesisId);
    let record = ratings.get(key);
    if (!record) {
      record = {
        hypothesisId,
        arena,
        rating: startRating,
        uncertainty: 1,
        matchesCount: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        evidenceWeight: 0,
        lastMatchId: null,
      };
      ratings.set(key, record);
    }
    return record;
  };

  for (const match of matches) {
    const a = ensure(match.aId, match.arena);
    const b = ensure(match.bId, match.arena);
    const evidenceQuality: EvidenceQuality = match.evidenceQuality ?? "normal";
    const jw = judgeWeight(match.judgeType);

    // Single structural K per match, using the less-mature pair member.
    const maturity = maturityFromMatchCount(
      Math.min(a.matchesCount, b.matchesCount),
    );
    const k = deriveKFactor({
      maturity,
      evidenceQuality,
      arena: match.arena,
      safetyEvidenced: match.safetyEvidenced,
      safetyUnresolved: match.safetyUnresolved,
    });

    const result = updateElo({
      ratingA: a.rating,
      ratingB: b.rating,
      outcome: match.outcome,
      k,
      confidence: match.confidence,
      judgeWeight: jw,
    });
    a.rating = result.ratingA;
    b.rating = result.ratingB;

    a.matchesCount += 1;
    b.matchesCount += 1;
    if (match.outcome === "a_win") {
      a.wins += 1;
      b.losses += 1;
    } else if (match.outcome === "b_win") {
      b.wins += 1;
      a.losses += 1;
    } else {
      a.draws += 1;
      b.draws += 1;
    }

    const matchWeight =
      clampConfidence(match.confidence) *
      jw *
      EVIDENCE_QUALITY_MULTIPLIER[evidenceQuality];
    a.evidenceWeight += matchWeight;
    b.evidenceWeight += matchWeight;

    a.lastMatchId = match.id;
    b.lastMatchId = match.id;

    a.uncertainty = deriveUncertainty({
      matchesCount: a.matchesCount,
      evidenceWeight: a.evidenceWeight,
    });
    b.uncertainty = deriveUncertainty({
      matchesCount: b.matchesCount,
      evidenceWeight: b.evidenceWeight,
    });
  }

  return Array.from(ratings.values()).sort((x, y) =>
    x.arena === y.arena
      ? x.hypothesisId.localeCompare(y.hypothesisId)
      : x.arena.localeCompare(y.arena),
  );
}
