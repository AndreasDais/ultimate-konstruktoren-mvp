// Framework-free gate for the deterministic Feature Arena rating engine (Sprint 35.2).
//
// Plain `node scripts/test-feature-arena-elo.mjs` — zero dependencies, no test
// framework. Node cannot import the .ts library directly (no .js->.ts mapping),
// so this script re-implements the SAME deterministic formula and policy as
// lib/feature-arena/{elo,rating-policy,recompute-ratings}.ts and asserts the
// required behaviour. The vitest suite (tests/feature-arena/elo.test.ts)
// exercises the actual TypeScript library. Keep both in sync.
//
// No LLM, no DB, no network, no randomness.

// ── policy (mirrors lib/feature-arena/rating-policy.ts) ──
const BASE_K = { new: 48, active: 32, established: 16 };
const JUDGE_WEIGHTS = { human: 1.5, hybrid: 1.0, agent_committee: 0.6, single_agent: 0.35, rule_based: 0.75 };
const EVIDENCE_QUALITY_MULTIPLIER = { none: 0.25, weak: 0.5, normal: 1.0, strong: 1.25 };
const UNCERTAINTY_PRIOR = 3;
const clampConfidence = (c) => (Number.isFinite(c) ? Math.min(1, Math.max(0.25, c)) : 0.25);
const judgeWeight = (j) => JUDGE_WEIGHTS[j] ?? JUDGE_WEIGHTS.single_agent;
const maturityFromMatchCount = (n) => (n <= 0 ? "new" : n < 10 ? "active" : "established");
function deriveKFactor(i = {}) {
  let k = BASE_K[i.maturity ?? "new"] * EVIDENCE_QUALITY_MULTIPLIER[i.evidenceQuality ?? "normal"];
  if (i.arena === "safety") {
    if (i.safetyUnresolved) k *= 0.5;
    else if (i.safetyEvidenced) k *= 1.25;
  }
  return k;
}
function deriveUncertainty(i) {
  const w = Math.max(0, i.evidenceWeight);
  let u = UNCERTAINTY_PRIOR / (UNCERTAINTY_PRIOR + w) + (i.stalePenalty ?? 0);
  return Math.min(1, Math.max(0, u));
}

// ── elo (mirrors lib/feature-arena/elo.ts) ──
function expectedScore(a, b) {
  const expectedA = 1 / (1 + 10 ** ((b - a) / 400));
  return { expectedA, expectedB: 1 - expectedA };
}
const scoreForOutcome = (o) => (o === "a_win" ? 1 : o === "b_win" ? 0 : 0.5);
function updateElo({ ratingA, ratingB, outcome, k, confidence, judgeWeight }) {
  const { expectedA } = expectedScore(ratingA, ratingB);
  const scoreA = scoreForOutcome(outcome);
  const appliedK = k * clampConfidence(confidence) * judgeWeight;
  return {
    ratingA: ratingA + appliedK * (scoreA - expectedA),
    ratingB: ratingB + appliedK * (1 - scoreA - (1 - expectedA)),
    expectedA,
    scoreA,
    appliedK,
  };
}

// ── recompute (mirrors lib/feature-arena/recompute-ratings.ts) ──
function recomputeRatingsFromMatches(matches, options = {}) {
  const start = options.startRating ?? 1500;
  const map = new Map();
  const ensure = (id, arena) => {
    const key = arena + "::" + id;
    let r = map.get(key);
    if (!r) {
      r = { hypothesisId: id, arena, rating: start, uncertainty: 1, matchesCount: 0, wins: 0, losses: 0, draws: 0, evidenceWeight: 0, lastMatchId: null };
      map.set(key, r);
    }
    return r;
  };
  for (const m of matches) {
    const a = ensure(m.aId, m.arena);
    const b = ensure(m.bId, m.arena);
    const eq = m.evidenceQuality ?? "normal";
    const jw = judgeWeight(m.judgeType);
    const k = deriveKFactor({ maturity: maturityFromMatchCount(Math.min(a.matchesCount, b.matchesCount)), evidenceQuality: eq, arena: m.arena, safetyEvidenced: m.safetyEvidenced, safetyUnresolved: m.safetyUnresolved });
    const res = updateElo({ ratingA: a.rating, ratingB: b.rating, outcome: m.outcome, k, confidence: m.confidence, judgeWeight: jw });
    a.rating = res.ratingA;
    b.rating = res.ratingB;
    a.matchesCount += 1; b.matchesCount += 1;
    if (m.outcome === "a_win") { a.wins += 1; b.losses += 1; }
    else if (m.outcome === "b_win") { b.wins += 1; a.losses += 1; }
    else { a.draws += 1; b.draws += 1; }
    const w = clampConfidence(m.confidence) * jw * EVIDENCE_QUALITY_MULTIPLIER[eq];
    a.evidenceWeight += w; b.evidenceWeight += w;
    a.lastMatchId = m.id; b.lastMatchId = m.id;
    a.uncertainty = deriveUncertainty({ matchesCount: a.matchesCount, evidenceWeight: a.evidenceWeight });
    b.uncertainty = deriveUncertainty({ matchesCount: b.matchesCount, evidenceWeight: b.evidenceWeight });
  }
  return Array.from(map.values()).sort((p, q) => (p.arena === q.arena ? p.hypothesisId.localeCompare(q.hypothesisId) : p.arena.localeCompare(q.arena)));
}

// ── assertions ──
let failures = 0;
function check(name, condition) {
  if (condition) console.log("PASS  " + name);
  else { console.error("FAIL  " + name); failures += 1; }
}
const approx = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

check("expectedScore: equal => 0.5", approx(expectedScore(1500, 1500).expectedA, 0.5));
const es = expectedScore(1632, 1411);
check("expectedScore: A+B === 1", approx(es.expectedA + es.expectedB, 1));
check("scoreForOutcome 1/0.5/0", scoreForOutcome("a_win") === 1 && scoreForOutcome("draw") === 0.5 && scoreForOutcome("b_win") === 0);

const base = { ratingA: 1500, ratingB: 1500, k: 32, confidence: 1, judgeWeight: 1 };
const aWin = updateElo({ ...base, outcome: "a_win" });
const bWin = updateElo({ ...base, outcome: "b_win" });
const draw = updateElo({ ...base, outcome: "draw" });
check("a_win increases A", aWin.ratingA > 1500);
check("a_win decreases B", aWin.ratingB < 1500);
check("b_win increases B", bWin.ratingB > 1500);
check("b_win decreases A", bWin.ratingA < 1500);
check("draw equal unchanged", approx(draw.ratingA, 1500) && approx(draw.ratingB, 1500));
check("zero-sum: A delta === -B delta", approx(aWin.ratingA - 1500, 1500 - aWin.ratingB));

const hiConf = updateElo({ ...base, outcome: "a_win", confidence: 1 });
const loConf = updateElo({ ...base, outcome: "a_win", confidence: 0.25 });
check("confidence affects magnitude", hiConf.ratingA - 1500 > loConf.ratingA - 1500);
check("updateElo deterministic", JSON.stringify(updateElo({ ...base, outcome: "a_win" })) === JSON.stringify(updateElo({ ...base, outcome: "a_win" })));

check("K new>active>established", deriveKFactor({ maturity: "new" }) > deriveKFactor({ maturity: "active" }) && deriveKFactor({ maturity: "active" }) > deriveKFactor({ maturity: "established" }));
check("K strong>none", deriveKFactor({ evidenceQuality: "strong" }) > deriveKFactor({ evidenceQuality: "none" }));
check("K safety unresolved dampens", deriveKFactor({ arena: "safety", safetyUnresolved: true }) < deriveKFactor({ arena: "safety" }));

check("uncertainty no evidence => 1.0", approx(deriveUncertainty({ matchesCount: 0, evidenceWeight: 0 }), 1));
check("uncertainty decreases with evidence", deriveUncertainty({ matchesCount: 6, evidenceWeight: 12 }) < deriveUncertainty({ matchesCount: 1, evidenceWeight: 1 }));
const u = deriveUncertainty({ matchesCount: 100, evidenceWeight: 1000 });
check("uncertainty within [0,1]", u >= 0 && u <= 1);

const matches = [
  { id: "m1", arena: "safety", aId: "fh-a", bId: "fh-b", outcome: "a_win", confidence: 0.9, judgeType: "agent_committee", evidenceQuality: "normal" },
  { id: "m2", arena: "trust", aId: "fh-a", bId: "fh-c", outcome: "draw", confidence: 0.8, judgeType: "human", evidenceQuality: "strong" },
  { id: "m3", arena: "safety", aId: "fh-b", bId: "fh-c", outcome: "b_win", confidence: 0.7, judgeType: "single_agent" },
];
const out = recomputeRatingsFromMatches(matches);
const safetyA = out.find((r) => r.arena === "safety" && r.hypothesisId === "fh-a");
const trustA = out.find((r) => r.arena === "trust" && r.hypothesisId === "fh-a");
check("rated separately per arena", Boolean(safetyA) && Boolean(trustA));
check("safety a_win raised A", Boolean(safetyA) && safetyA.rating > 1500);
check("no global/total/overall score", out.every((r) => !("global_score" in r) && !("total_score" in r) && !("overall_score" in r)));
check("uncertainty present on every rating", out.every((r) => typeof r.uncertainty === "number" && r.uncertainty >= 0 && r.uncertainty <= 1));
check("recompute deterministic", JSON.stringify(recomputeRatingsFromMatches(matches)) === JSON.stringify(out));

if (failures > 0) {
  console.error("\n" + failures + " feature-arena Elo check(s) FAILED");
  process.exit(1);
}
console.log("\nAll feature-arena Elo gate checks passed.");
