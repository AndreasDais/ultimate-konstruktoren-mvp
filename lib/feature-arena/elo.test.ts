import { describe, it, expect } from "vitest";
import { expectedScore, scoreForOutcome, updateElo } from "@/lib/feature-arena/elo";
import {
  deriveKFactor,
  deriveUncertainty,
  judgeWeight,
} from "@/lib/feature-arena/rating-policy";
import { recomputeRatingsFromMatches } from "@/lib/feature-arena/recompute-ratings";
import type { RatingMatch } from "@/lib/feature-arena/types";

describe("expectedScore", () => {
  it("equal ratings give 0.5", () => {
    expect(expectedScore(1500, 1500).expectedA).toBeCloseTo(0.5, 10);
  });
  it("expectedA + expectedB === 1", () => {
    const e = expectedScore(1632, 1411);
    expect(e.expectedA + e.expectedB).toBeCloseTo(1, 10);
  });
  it("higher rating implies higher expected score", () => {
    expect(expectedScore(1700, 1500).expectedA).toBeGreaterThan(0.5);
  });
});

describe("scoreForOutcome", () => {
  it("maps outcomes to 1 / 0.5 / 0", () => {
    expect(scoreForOutcome("a_win")).toBe(1);
    expect(scoreForOutcome("draw")).toBe(0.5);
    expect(scoreForOutcome("b_win")).toBe(0);
  });
});

describe("updateElo", () => {
  const base = { ratingA: 1500, ratingB: 1500, k: 32, confidence: 1, judgeWeight: 1 };

  it("a_win increases A and decreases B", () => {
    const r = updateElo({ ...base, outcome: "a_win" });
    expect(r.ratingA).toBeGreaterThan(1500);
    expect(r.ratingB).toBeLessThan(1500);
  });
  it("b_win increases B and decreases A", () => {
    const r = updateElo({ ...base, outcome: "b_win" });
    expect(r.ratingB).toBeGreaterThan(1500);
    expect(r.ratingA).toBeLessThan(1500);
  });
  it("draw with equal ratings leaves both unchanged", () => {
    const r = updateElo({ ...base, outcome: "draw" });
    expect(r.ratingA).toBeCloseTo(1500, 10);
    expect(r.ratingB).toBeCloseTo(1500, 10);
  });
  it("is zero-sum: A delta equals minus B delta", () => {
    const r = updateElo({ ...base, outcome: "a_win" });
    expect(r.ratingA - 1500).toBeCloseTo(1500 - r.ratingB, 10);
  });
  it("confidence affects update magnitude", () => {
    const high = updateElo({ ...base, outcome: "a_win", confidence: 1 });
    const low = updateElo({ ...base, outcome: "a_win", confidence: 0.25 });
    expect(high.ratingA - 1500).toBeGreaterThan(low.ratingA - 1500);
  });
  it("judgeWeight affects update magnitude", () => {
    const heavy = updateElo({ ...base, outcome: "a_win", judgeWeight: 1.5 });
    const light = updateElo({ ...base, outcome: "a_win", judgeWeight: 0.35 });
    expect(heavy.ratingA - 1500).toBeGreaterThan(light.ratingA - 1500);
  });
  it("is deterministic: same input gives same output", () => {
    expect(updateElo({ ...base, outcome: "a_win" })).toEqual(
      updateElo({ ...base, outcome: "a_win" }),
    );
  });
});

describe("deriveKFactor", () => {
  it("new > active > established", () => {
    expect(deriveKFactor({ maturity: "new" })).toBeGreaterThan(
      deriveKFactor({ maturity: "active" }),
    );
    expect(deriveKFactor({ maturity: "active" })).toBeGreaterThan(
      deriveKFactor({ maturity: "established" }),
    );
  });
  it("strong evidence raises K above no evidence", () => {
    expect(deriveKFactor({ evidenceQuality: "strong" })).toBeGreaterThan(
      deriveKFactor({ evidenceQuality: "none" }),
    );
  });
  it("unresolved safety concern dampens K in the safety arena", () => {
    expect(deriveKFactor({ arena: "safety", safetyUnresolved: true })).toBeLessThan(
      deriveKFactor({ arena: "safety" }),
    );
  });
  it("is deterministic", () => {
    expect(deriveKFactor({ maturity: "active", evidenceQuality: "normal" })).toBe(
      deriveKFactor({ maturity: "active", evidenceQuality: "normal" }),
    );
  });
});

describe("deriveUncertainty", () => {
  it("no evidence gives uncertainty 1.0", () => {
    expect(deriveUncertainty({ matchesCount: 0, evidenceWeight: 0 })).toBeCloseTo(1, 10);
  });
  it("more evidence weight lowers uncertainty", () => {
    expect(deriveUncertainty({ matchesCount: 6, evidenceWeight: 12 })).toBeLessThan(
      deriveUncertainty({ matchesCount: 1, evidenceWeight: 1 }),
    );
  });
  it("stays within [0, 1]", () => {
    const u = deriveUncertainty({ matchesCount: 100, evidenceWeight: 1000 });
    expect(u).toBeGreaterThanOrEqual(0);
    expect(u).toBeLessThanOrEqual(1);
  });
});

describe("recomputeRatingsFromMatches", () => {
  const matches: RatingMatch[] = [
    { id: "m1", arena: "safety", aId: "fh-a", bId: "fh-b", outcome: "a_win", confidence: 0.9, judgeType: "agent_committee", evidenceQuality: "normal" },
    { id: "m2", arena: "trust", aId: "fh-a", bId: "fh-c", outcome: "draw", confidence: 0.8, judgeType: "human", evidenceQuality: "strong" },
    { id: "m3", arena: "safety", aId: "fh-b", bId: "fh-c", outcome: "b_win", confidence: 0.7, judgeType: "single_agent" },
  ];

  it("rates a hypothesis separately per arena", () => {
    const out = recomputeRatingsFromMatches(matches);
    const safetyA = out.find((r) => r.arena === "safety" && r.hypothesisId === "fh-a");
    const trustA = out.find((r) => r.arena === "trust" && r.hypothesisId === "fh-a");
    expect(safetyA).toBeTruthy();
    expect(trustA).toBeTruthy();
    expect(safetyA!.rating).toBeGreaterThan(1500);
  });
  it("never emits a global/total/overall score and always carries uncertainty", () => {
    const out = recomputeRatingsFromMatches(matches);
    for (const r of out) {
      expect(r).not.toHaveProperty("global_score");
      expect(r).not.toHaveProperty("total_score");
      expect(r).not.toHaveProperty("overall_score");
      expect(typeof r.uncertainty).toBe("number");
      expect(r.uncertainty).toBeGreaterThanOrEqual(0);
      expect(r.uncertainty).toBeLessThanOrEqual(1);
    }
  });
  it("tracks win/loss/draw counts", () => {
    const out = recomputeRatingsFromMatches(matches);
    const safetyA = out.find((r) => r.arena === "safety" && r.hypothesisId === "fh-a")!;
    expect(safetyA.wins).toBe(1);
    expect(safetyA.matchesCount).toBe(1);
  });
  it("is deterministic: same input gives same output", () => {
    expect(recomputeRatingsFromMatches(matches)).toEqual(
      recomputeRatingsFromMatches(matches),
    );
  });
});

describe("judgeWeight", () => {
  it("orders human > hybrid > rule_based > agent_committee > single_agent", () => {
    expect(judgeWeight("human")).toBeGreaterThan(judgeWeight("hybrid"));
    expect(judgeWeight("hybrid")).toBeGreaterThan(judgeWeight("rule_based"));
    expect(judgeWeight("rule_based")).toBeGreaterThan(judgeWeight("agent_committee"));
    expect(judgeWeight("agent_committee")).toBeGreaterThan(judgeWeight("single_agent"));
  });
});
