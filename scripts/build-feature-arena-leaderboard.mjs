// Feature Arena leaderboard builder (Sprint 35.5).
//
// Read-only, deterministic, file-based. No network, no DB, no LLM. It writes
// exactly two snapshot files under qa/feature-arena/ and nothing else:
//   - feature-ratings.snapshot.json   (per-arena ratings)
//   - leaderboard.snapshot.md         (human-readable leaderboard)
//
// Determinism: there is NO wall-clock timestamp in the output, so rerunning the
// build produces byte-identical files (no git diff). `generated_at` is null and
// `source_data_as_of` is derived from the input data.
//
// Rating boundary: Node cannot safely import the TypeScript Elo engine
// (lib/feature-arena/*.ts) without fragile extension handling, so the Elo
// formula and policy below MIRROR lib/feature-arena (the source of truth, tested
// by the Sprint 35.2 gates: scripts/test-feature-arena-elo.mjs + vitest). The
// recompute here is intentionally a faithful copy, kept in sync with 35.2.
//
// This is NOT a roadmap manager: the leaderboard is a static, read-only ranking.
// It carries no write actions, no roadmap buttons, no build_next, and no
// auto-implementation. A rating is evidence-weighted prioritization under one
// arena objective, with uncertainty — not truth and not a build decision. Human
// remains final.
//
// Usage: node scripts/build-feature-arena-leaderboard.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QA = join(ROOT, "qa", "feature-arena");

// ── Elo policy (mirrors lib/feature-arena/rating-policy.ts) ──
const BASE_K = { new: 48, active: 32, established: 16 };
const JUDGE_WEIGHTS = { human: 1.5, hybrid: 1.0, agent_committee: 0.6, single_agent: 0.35, rule_based: 0.75 };
const EVIDENCE_QUALITY_MULTIPLIER = { none: 0.25, weak: 0.5, normal: 1.0, strong: 1.25 };
const UNCERTAINTY_PRIOR = 3;
const START_RATING = 1500;
const clampConfidence = (c) => (Number.isFinite(c) ? Math.min(1, Math.max(0.25, c)) : 0.25);
const judgeWeight = (j) => JUDGE_WEIGHTS[j] ?? JUDGE_WEIGHTS.single_agent;
const maturityFromMatchCount = (n) => (n <= 0 ? "new" : n < 10 ? "active" : "established");
function deriveKFactor({ maturity = "new", evidenceQuality = "normal", arena, safetyEvidenced, safetyUnresolved } = {}) {
  let k = BASE_K[maturity] * EVIDENCE_QUALITY_MULTIPLIER[evidenceQuality];
  if (arena === "safety") {
    if (safetyUnresolved) k *= 0.5;
    else if (safetyEvidenced) k *= 1.25;
  }
  return k;
}
function deriveUncertainty({ evidenceWeight, stalePenalty = 0 }) {
  const w = Math.max(0, evidenceWeight);
  return Math.min(1, Math.max(0, UNCERTAINTY_PRIOR / (UNCERTAINTY_PRIOR + w) + stalePenalty));
}

// ── Elo (mirrors lib/feature-arena/elo.ts) ──
function expectedScore(a, b) {
  const expectedA = 1 / (1 + 10 ** ((b - a) / 400));
  return { expectedA, expectedB: 1 - expectedA };
}
const scoreForOutcome = (o) => (o === "a_win" ? 1 : o === "b_win" ? 0 : 0.5);
function updateElo({ ratingA, ratingB, outcome, k, confidence, judgeWeight: jw }) {
  const { expectedA } = expectedScore(ratingA, ratingB);
  const scoreA = scoreForOutcome(outcome);
  const appliedK = k * clampConfidence(confidence) * jw;
  return { ratingA: ratingA + appliedK * (scoreA - expectedA), ratingB: ratingB + appliedK * (1 - scoreA - (1 - expectedA)) };
}

// ── io ──
function readJsonl(name) {
  return readFileSync(join(QA, name), "utf8").split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
}
const round = (x, n) => Number(x.toFixed(n));

function recompute(matches) {
  const map = new Map();
  const key = (arena, id) => arena + "::" + id;
  const ensure = (arena, id) => {
    let r = map.get(key(arena, id));
    if (!r) {
      r = { hypothesisId: id, arena, rating: START_RATING, uncertainty: 1, matchesCount: 0, wins: 0, losses: 0, draws: 0, evidenceWeight: 0, lastMatchId: null, history: [] };
      map.set(key(arena, id), r);
    }
    return r;
  };
  for (const m of matches) {
    const a = ensure(m.arena, m.hypothesis_a_id);
    const b = ensure(m.arena, m.hypothesis_b_id);
    const eq = m.evidenceQuality ?? "normal";
    const jw = judgeWeight(m.judge_type);
    const k = deriveKFactor({ maturity: maturityFromMatchCount(Math.min(a.matchesCount, b.matchesCount)), evidenceQuality: eq, arena: m.arena, safetyEvidenced: m.safetyEvidenced, safetyUnresolved: m.safetyUnresolved });
    const before = { a: a.rating, b: b.rating };
    const res = updateElo({ ratingA: a.rating, ratingB: b.rating, outcome: m.outcome, k, confidence: m.confidence, judgeWeight: jw });
    a.rating = res.ratingA;
    b.rating = res.ratingB;
    a.matchesCount += 1; b.matchesCount += 1;
    const aRes = m.outcome === "a_win" ? "win" : m.outcome === "b_win" ? "loss" : "draw";
    const bRes = m.outcome === "b_win" ? "win" : m.outcome === "a_win" ? "loss" : "draw";
    if (aRes === "win") { a.wins++; } else if (aRes === "loss") { a.losses++; } else { a.draws++; }
    if (bRes === "win") { b.wins++; } else if (bRes === "loss") { b.losses++; } else { b.draws++; }
    const w = clampConfidence(m.confidence) * jw * EVIDENCE_QUALITY_MULTIPLIER[eq];
    a.evidenceWeight += w; b.evidenceWeight += w;
    a.lastMatchId = m.id; b.lastMatchId = m.id;
    a.history.push({ matchId: m.id, opponent: m.hypothesis_b_id, result: aRes, delta: round(a.rating - before.a, 2) });
    b.history.push({ matchId: m.id, opponent: m.hypothesis_a_id, result: bRes, delta: round(b.rating - before.b, 2) });
    a.uncertainty = deriveUncertainty({ evidenceWeight: a.evidenceWeight });
    b.uncertainty = deriveUncertainty({ evidenceWeight: b.evidenceWeight });
  }
  return map;
}

function movementText(r) {
  const delta = round(r.rating - START_RATING, 2);
  const sign = delta > 0 ? "+" : "";
  const recap = r.history.map((h) => `${h.result} vs ${h.opponent} (${h.matchId}, ${h.delta >= 0 ? "+" : ""}${h.delta})`).join("; ");
  const trend = delta > 0 ? "rose" : delta < 0 ? "fell" : "held";
  return `${trend} ${sign}${delta} from start ${START_RATING} — ${recap}`;
}

function main() {
  // 1) gate: validator must pass before building
  try {
    execSync("node scripts/validate-feature-arena.mjs", { cwd: ROOT, stdio: "pipe" });
    console.log("validator: PASS (pre-build gate)");
  } catch (e) {
    console.error("validator FAILED — not building leaderboard.");
    process.stderr.write((e.stdout && e.stdout.toString()) || "");
    process.stderr.write((e.stderr && e.stderr.toString()) || "");
    process.exit(1);
  }

  // 2) load data
  const arenas = JSON.parse(readFileSync(join(QA, "feature-arenas.json"), "utf8"));
  const arenaOrder = arenas.map((a) => a.key);
  const arenaName = Object.fromEntries(arenas.map((a) => [a.key, a.name]));
  const arenaObjective = Object.fromEntries(arenas.map((a) => [a.key, a.objective]));
  const hyps = readJsonl("feature-hypotheses.seed.jsonl");
  const evidence = readJsonl("feature-evidence.seed.jsonl");
  const matches = readJsonl("feature-matches.sample.jsonl");
  const decisions = readJsonl("feature-decisions.jsonl");

  const hypById = Object.fromEntries(hyps.map((h) => [h.id, h]));
  const evById = Object.fromEntries(evidence.map((e) => [e.id, e]));
  const titleOf = (id) => (hypById[id] ? hypById[id].title : id);

  // hypothesis-level evidence quality (mean strength*reliability over linked evidence)
  const evidenceStats = (h) => {
    const ids = Array.isArray(h.evidence_ids) ? h.evidence_ids : [];
    const recs = ids.map((id) => evById[id]).filter(Boolean);
    const count = recs.length;
    const quality = count === 0 ? 0 : round(recs.reduce((s, e) => s + (e.strength ?? 0) * (e.reliability ?? 0), 0) / count, 3);
    return { count, quality };
  };

  // human decision status (decisions are an append-only log; none yet => not_decided)
  const decisionByHyp = {};
  for (const d of decisions) decisionByHyp[d.hypothesis_id] = d;
  const humanStatus = (id) => (decisionByHyp[id] ? decisionByHyp[id].decision : "not_decided");
  const lastReviewed = (h) => h.last_reviewed_at ?? (decisionByHyp[h.id] ? decisionByHyp[h.id].decided_at : null);

  // source_data_as_of: latest created_at across matches + decisions (deterministic, no wall-clock)
  const dates = [...matches.map((m) => m.created_at), ...decisions.map((d) => d.decided_at)].filter(Boolean).sort();
  const sourceDataAsOf = dates.length ? dates[dates.length - 1] : null;

  // 3) recompute ratings
  const ratingsMap = recompute(matches);

  // 4) build rating records
  const ratings = [];
  for (const r of ratingsMap.values()) {
    const h = hypById[r.hypothesisId] || {};
    const es = evidenceStats(h);
    ratings.push({
      hypothesis_id: r.hypothesisId,
      arena: r.arena,
      rating: round(r.rating, 2),
      uncertainty: round(r.uncertainty, 4),
      matches_count: r.matchesCount,
      wins: r.wins,
      losses: r.losses,
      draws: r.draws,
      evidence_count: es.count,
      evidence_quality: es.quality,
      last_reviewed_at: lastReviewed(h),
      risk_flags: Array.isArray(h.risk_flags) ? h.risk_flags : [],
      human_decision_status: humanStatus(r.hypothesisId),
      delta_from_start: round(r.rating - START_RATING, 2),
      movement: movementText(r),
    });
  }
  // deterministic sort: arena order, then rating desc, then hypothesis_id
  ratings.sort((x, y) => {
    if (x.arena !== y.arena) return arenaOrder.indexOf(x.arena) - arenaOrder.indexOf(y.arena);
    if (y.rating !== x.rating) return y.rating - x.rating;
    return x.hypothesis_id.localeCompare(y.hypothesis_id);
  });

  const snapshot = {
    schema_version: "pilar.feature_ratings_snapshot.v0",
    rating_model: "elo_v0",
    generated_at: null,
    source_data_as_of: sourceDataAsOf,
    deterministic: true,
    note: "Per-arena, evidence-weighted prioritization under uncertainty. Not truth, not a roadmap order, not a build decision. Human remains final. Mirrors lib/feature-arena (Sprint 35.2).",
    rated_hypothesis_arena_pairs: ratings.length,
    ratings,
  };
  writeFileSync(join(QA, "feature-ratings.snapshot.json"), JSON.stringify(snapshot, null, 2) + "\n", "utf8");

  // 5) build leaderboard markdown
  const lines = [];
  lines.push("# Feature Arena — leaderboard (read-only snapshot)");
  lines.push("");
  lines.push("> Generated deterministically from file data by `scripts/build-feature-arena-leaderboard.mjs`. **Read-only.** A rating is evidence-weighted prioritization under one arena objective, with uncertainty — **not** truth, **not** a roadmap order, **not** a build decision. There is **no global score**. **Human remains final.** No write actions, no `build_next`, no auto-roadmap, no auto-implementation.");
  lines.push("");
  lines.push(`- Rating model: \`elo_v0\` (mirrors \`lib/feature-arena\`, Sprint 35.2). Start rating ${START_RATING}.`);
  lines.push(`- Source data as of: \`${sourceDataAsOf}\` · rated pairs: ${ratings.length} · matches: ${matches.length}`);
  lines.push("- Only hypothesis/arena pairs with at least one match are listed; unrated hypotheses stay at the neutral start with maximal uncertainty.");
  lines.push("");
  for (const key of arenaOrder) {
    const rows = ratings.filter((r) => r.arena === key);
    if (rows.length === 0) continue;
    lines.push(`## ${arenaName[key]} (\`${key}\`)`);
    lines.push("");
    lines.push(`_${arenaObjective[key]}_`);
    lines.push("");
    lines.push("| # | Hypothesis | Rating | Uncertainty | W/L/D | Evidence (count · quality) | Risk flags | Human decision | Why it rose/fell |");
    lines.push("|---:|---|---:|---:|:---:|---|---|---|---|");
    rows.forEach((r, i) => {
      const risk = r.risk_flags.length ? r.risk_flags.join(", ") : "none";
      lines.push(`| ${i + 1} | ${titleOf(r.hypothesis_id)} \`${r.hypothesis_id}\` | ${r.rating} | ${r.uncertainty} | ${r.wins}/${r.losses}/${r.draws} | ${r.evidence_count} · ${r.evidence_quality} | ${risk} | ${r.human_decision_status} | ${r.movement} |`);
    });
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push("High rating with high uncertainty means **promising but uncertain**, not **ready to build**. This snapshot proposes nothing and decides nothing; a human reviews the evidence and decides separately (see `qa/feature-arena/feature-decisions.jsonl`).");
  lines.push("");
  writeFileSync(join(QA, "leaderboard.snapshot.md"), lines.join("\n"), "utf8");

  // 6) summary
  console.log(`wrote qa/feature-arena/feature-ratings.snapshot.json (${ratings.length} rated pairs)`);
  console.log(`wrote qa/feature-arena/leaderboard.snapshot.md`);
  console.log("LEADERBOARD BUILT (read-only, deterministic, no roadmap decisions)");
}

main();
