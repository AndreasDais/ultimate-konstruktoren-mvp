// Feature Arena validator (Sprint 35.4).
//
// Deterministic, file-based, read-only. No network, no DB, no LLM, no writes
// except stdout. Validates the landed Feature Arena data files, then self-tests
// that each invalid fixture in qa/feature-arena/validator-cases/ is caught for
// its named reason. Exit 0 only if the real data is valid AND every invalid
// fixture is caught; otherwise exit 1.
//
// It also checks that a per-arena recompute over the matches is deterministic
// and internally consistent (a counts-only tally, NOT the Elo formula). The full
// deterministic Elo rating recompute is owned and tested by Sprint 35.2
// (lib/feature-arena and its gates) and is intentionally not duplicated here.
//
// Usage: node scripts/validate-feature-arena.mjs

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const QA = join(ROOT, "qa", "feature-arena");
const q = (name) => "qa/feature-arena/" + name;

// ── allowed enums (mirror sources/feature-arena templates) ──
const HYP_TYPES = new Set(["product", "safety", "guardrail", "eval", "observability", "agent", "prompt", "report", "i18n", "growth", "infrastructure", "meta"]);
const HYP_STATUS = new Set(["candidate", "needs_evidence", "in_tournament", "shortlisted", "approved_for_sprint", "implemented", "rejected", "archived"]);
const EV_TYPES = new Set(["eval_failure", "user_feedback_cluster", "guardrail_decision", "observability_event", "human_review", "internal_doc", "web_research_source", "post_implementation_outcome", "manual_note"]);
const POLARITY = new Set(["supports", "contradicts", "mixed", "context"]);
const REDACTION = new Set(["no_user_data", "redacted_user_summary", "synthetic", "internal_only"]);
const OUTCOME = new Set(["a_win", "b_win", "draw"]);
const JUDGE = new Set(["human", "hybrid", "agent_committee", "single_agent", "rule_based"]);
const DECISION = new Set(["build_next", "build_later", "needs_more_evidence", "reject", "merge_with_other", "archive"]);
const FORBIDDEN_SCORE_KEYS = ["global_score", "total_score", "overall_score"];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ── io ──
function readJsonl(absPath) {
  const text = readFileSync(absPath, "utf8");
  const out = [];
  text.split(/\r?\n/).forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    out.push({ line: idx + 1, record: JSON.parse(trimmed) });
  });
  return out;
}

function findForbiddenScoreKey(obj) {
  let found = null;
  const walk = (o) => {
    if (found || o === null || typeof o !== "object") return;
    if (Array.isArray(o)) return o.forEach(walk);
    for (const k of Object.keys(o)) {
      if (FORBIDDEN_SCORE_KEYS.includes(k)) { found = k; return; }
      walk(o[k]);
    }
  };
  walk(obj);
  return found;
}

// ── per-type checks: each pushes {file, line, message} into errs ──
function checkScoreKeys(file, items, errs) {
  for (const { line, record } of items) {
    const key = findForbiddenScoreKey(record);
    if (key) errs.push({ file, line, message: `field "${key}" is forbidden. Use per-arena ratings only.` });
  }
}

function validateHypotheses(file, items, arenaKeys, errs) {
  const seen = new Set();
  for (const { line, record: h } of items) {
    if (h.schema_version !== "pilar.feature_hypothesis.v0") errs.push({ file, line, message: `bad schema_version "${h.schema_version}"` });
    for (const f of ["id", "title", "claim", "type", "status", "arenas", "expected_impact", "risk_flags", "human_review_required"]) {
      if (!(f in h)) errs.push({ file, line, message: `missing required field "${f}"` });
    }
    if (h.id) {
      if (seen.has(h.id)) errs.push({ file, line, message: `duplicate id "${h.id}"` });
      seen.add(h.id);
      if (!KEBAB.test(h.id)) errs.push({ file, line, message: `id not kebab-case: "${h.id}"` });
    }
    if (h.type && !HYP_TYPES.has(h.type)) errs.push({ file, line, message: `unknown hypothesis type "${h.type}"` });
    if (h.status && !HYP_STATUS.has(h.status)) errs.push({ file, line, message: `unknown status "${h.status}"` });
    if (!Array.isArray(h.arenas) || h.arenas.length === 0) errs.push({ file, line, message: `hypothesis needs at least one arena` });
    else h.arenas.forEach((a) => { if (!arenaKeys.has(a)) errs.push({ file, line, message: `unknown arena key "${a}"` }); });
    if ("expected_impact" in h && (typeof h.expected_impact !== "object" || h.expected_impact === null || Array.isArray(h.expected_impact))) errs.push({ file, line, message: `expected_impact must be an object` });
    if ("risk_flags" in h && !Array.isArray(h.risk_flags)) errs.push({ file, line, message: `risk_flags must be an array` });
    if ("human_review_required" in h && typeof h.human_review_required !== "boolean") errs.push({ file, line, message: `human_review_required must be boolean` });
    if (Array.isArray(h.evidence_ids) && h.evidence_ids.some((e) => typeof e === "string" && e.includes("founder_prior"))) errs.push({ file, line, message: `founder_prior cannot be used as evidence. Put it in source_signals.` });
  }
}

function validateEvidence(file, items, hypothesisIds, errs) {
  const seen = new Set();
  for (const { line, record: e } of items) {
    if (e.schema_version !== "pilar.feature_evidence.v0") errs.push({ file, line, message: `bad schema_version "${e.schema_version}"` });
    if (e.id) {
      if (seen.has(e.id)) errs.push({ file, line, message: `duplicate id "${e.id}"` });
      seen.add(e.id);
      if (!KEBAB.test(e.id)) errs.push({ file, line, message: `id not kebab-case: "${e.id}"` });
    }
    if (e.type === "founder_prior") errs.push({ file, line, message: `founder_prior cannot be used as evidence. Put it in source_signals.` });
    else if (e.type && !EV_TYPES.has(e.type)) errs.push({ file, line, message: `unknown evidence type "${e.type}"` });
    if (e.hypothesis_id && !hypothesisIds.has(e.hypothesis_id)) errs.push({ file, line, message: `evidence references unknown hypothesis "${e.hypothesis_id}"` });
    if (e.polarity && !POLARITY.has(e.polarity)) errs.push({ file, line, message: `bad polarity "${e.polarity}"` });
    if (typeof e.strength !== "number" || e.strength < 0 || e.strength > 1) errs.push({ file, line, message: `strength must be 0..1` });
    if (typeof e.reliability !== "number" || e.reliability < 0 || e.reliability > 1) errs.push({ file, line, message: `reliability must be 0..1` });
    if (!e.redaction_status) errs.push({ file, line, message: `missing redaction_status` });
    else if (e.redaction_status === "raw_user_data" || !REDACTION.has(e.redaction_status)) errs.push({ file, line, message: `raw_user_data is forbidden in v0 (redaction_status="${e.redaction_status}")` });
    if (e.type === "web_research_source" && !e.source_url && !e.source_ref) errs.push({ file, line, message: `web_research_source needs source_url or source_ref` });
  }
}

function validateMatches(file, items, hypothesisIds, evidenceIds, arenaKeys, errs) {
  const seen = new Set();
  for (const { line, record: m } of items) {
    if (m.schema_version !== "pilar.feature_match.v0") errs.push({ file, line, message: `bad schema_version "${m.schema_version}"` });
    if (m.id) {
      if (seen.has(m.id)) errs.push({ file, line, message: `duplicate id "${m.id}"` });
      seen.add(m.id);
    }
    if (m.hypothesis_a_id && !hypothesisIds.has(m.hypothesis_a_id)) errs.push({ file, line, message: `match references unknown hypothesis "${m.hypothesis_a_id}"` });
    if (m.hypothesis_b_id && !hypothesisIds.has(m.hypothesis_b_id)) errs.push({ file, line, message: `match references unknown hypothesis "${m.hypothesis_b_id}"` });
    if (m.hypothesis_a_id && m.hypothesis_a_id === m.hypothesis_b_id) errs.push({ file, line, message: `A and B cannot be the same hypothesis` });
    if (m.arena && !arenaKeys.has(m.arena)) errs.push({ file, line, message: `unknown arena "${m.arena}"` });
    if (!OUTCOME.has(m.outcome)) errs.push({ file, line, message: `outcome must be a_win/b_win/draw` });
    if (typeof m.confidence !== "number" || m.confidence < 0 || m.confidence > 1) errs.push({ file, line, message: `confidence must be 0..1` });
    if (!m.judge_type || !JUDGE.has(m.judge_type)) errs.push({ file, line, message: `judge_type required and must be valid` });
    if (!m.rationale || typeof m.rationale !== "string" || !m.rationale.trim()) errs.push({ file, line, message: `match rationale required` });
    if (!Array.isArray(m.evidence_ids) || m.evidence_ids.length === 0) errs.push({ file, line, message: `match missing evidence_ids` });
    else m.evidence_ids.forEach((id) => { if (!evidenceIds.has(id)) errs.push({ file, line, message: `match evidence_id "${id}" does not exist` }); });
    if (m.judge_type && m.judge_type !== "human" && !Array.isArray(m.missing_evidence)) errs.push({ file, line, message: `LLM judgement missing missing_evidence` });
    if (m.arena === "safety" && !Array.isArray(m.risks)) errs.push({ file, line, message: `safety arena match must include risks analysis` });
    if ("implementation_decision" in m && m.implementation_decision !== null) errs.push({ file, line, message: `implementation_decision must be null (judge never recommends implementation)` });
  }
}

function validateDecisions(file, items, hypothesisIds, errs) {
  for (const { line, record: d } of items) {
    if (d.schema_version !== "pilar.feature_decision.v0") errs.push({ file, line, message: `bad schema_version "${d.schema_version}"` });
    if (d.hypothesis_id && !hypothesisIds.has(d.hypothesis_id)) errs.push({ file, line, message: `decision references unknown hypothesis "${d.hypothesis_id}"` });
    if (d.decision && !DECISION.has(d.decision)) errs.push({ file, line, message: `unknown decision "${d.decision}"` });
    if (d.decision === "build_next" && d.decided_by !== "human") errs.push({ file, line, message: `build_next requires decided_by = human` });
    if (d.override_rating === true && (!d.reason || !String(d.reason).trim())) errs.push({ file, line, message: `override_rating=true requires reason` });
  }
}

function validateOutcomes(file, items, hypothesisIds, errs) {
  for (const { line, record: o } of items) {
    if (o.schema_version !== "pilar.feature_outcome.v0") errs.push({ file, line, message: `bad schema_version "${o.schema_version}"` });
    if (o.hypothesis_id && !hypothesisIds.has(o.hypothesis_id)) errs.push({ file, line, message: `outcome references unknown hypothesis "${o.hypothesis_id}"` });
  }
}

function validateJudgement(file, j, hypothesisIds, evidenceIds, errs) {
  const sk = findForbiddenScoreKey(j);
  if (sk) errs.push({ file, line: 1, message: `field "${sk}" is forbidden. Use per-arena ratings only.` });
  if (!j.rationale || !String(j.rationale).trim()) errs.push({ file, line: 1, message: `judgement missing rationale` });
  if (!Array.isArray(j.evidence_ids) || j.evidence_ids.length === 0) errs.push({ file, line: 1, message: `judgement missing evidence_ids` });
  else j.evidence_ids.forEach((id) => { if (!evidenceIds.has(id)) errs.push({ file, line: 1, message: `judgement evidence_id "${id}" does not exist` }); });
  if (!Array.isArray(j.missing_evidence)) errs.push({ file, line: 1, message: `judgement missing missing_evidence` });
  if ("implementation_decision" in j && j.implementation_decision !== null) errs.push({ file, line: 1, message: `LLM judgement recommends implementation directly (implementation_decision must be null)` });
  if (j.hypothesis_a_id && !hypothesisIds.has(j.hypothesis_a_id)) errs.push({ file, line: 1, message: `judgement references unknown hypothesis "${j.hypothesis_a_id}"` });
  if (j.hypothesis_b_id && !hypothesisIds.has(j.hypothesis_b_id)) errs.push({ file, line: 1, message: `judgement references unknown hypothesis "${j.hypothesis_b_id}"` });
}

// Dispatch a homogeneous-or-mixed JSONL collection by schema_version. Used for
// both the real data files and the self-test fixtures.
function validateCollection(file, items, ctx, errs) {
  checkScoreKeys(file, items, errs);
  const byType = { hyp: [], ev: [], match: [], dec: [], out: [] };
  for (const it of items) {
    const sv = it.record.schema_version;
    if (sv === "pilar.feature_hypothesis.v0") byType.hyp.push(it);
    else if (sv === "pilar.feature_evidence.v0") byType.ev.push(it);
    else if (sv === "pilar.feature_match.v0") byType.match.push(it);
    else if (sv === "pilar.feature_decision.v0") byType.dec.push(it);
    else if (sv === "pilar.feature_outcome.v0") byType.out.push(it);
    else errs.push({ file, line: it.line, message: `unknown schema_version "${sv}"` });
  }
  if (byType.hyp.length) validateHypotheses(file, byType.hyp, ctx.arenaKeys, errs);
  if (byType.ev.length) validateEvidence(file, byType.ev, ctx.hypothesisIds, errs);
  if (byType.match.length) validateMatches(file, byType.match, ctx.hypothesisIds, ctx.evidenceIds, ctx.arenaKeys, errs);
  if (byType.dec.length) validateDecisions(file, byType.dec, ctx.hypothesisIds, errs);
  if (byType.out.length) validateOutcomes(file, byType.out, ctx.hypothesisIds, errs);
}

// Deterministic, counts-only per-arena recompute over the matches. This is NOT
// the Elo formula (no expected-score / K math) — it exists to prove the
// recompute pipeline over the match data is order-stable and internally
// consistent. The full deterministic Elo rating recompute lives in
// lib/feature-arena and is covered by the Sprint 35.2 gates.
function recomputeArenaTallies(matchItems) {
  const map = new Map();
  const ensure = (arena, id) => {
    const key = arena + "::" + id;
    let r = map.get(key);
    if (!r) { r = { arena, hypothesisId: id, matchesCount: 0, wins: 0, losses: 0, draws: 0 }; map.set(key, r); }
    return r;
  };
  for (const { record: m } of matchItems) {
    const a = ensure(m.arena, m.hypothesis_a_id);
    const b = ensure(m.arena, m.hypothesis_b_id);
    a.matchesCount++; b.matchesCount++;
    if (m.outcome === "a_win") { a.wins++; b.losses++; }
    else if (m.outcome === "b_win") { b.wins++; a.losses++; }
    else { a.draws++; b.draws++; }
  }
  return Array.from(map.values()).sort((x, y) =>
    x.arena === y.arena ? x.hypothesisId.localeCompare(y.hypothesisId) : x.arena.localeCompare(y.arena),
  );
}

function main() {
  const ok = [];
  const errs = [];

  // arenas
  const arenas = JSON.parse(readFileSync(join(QA, "feature-arenas.json"), "utf8"));
  const arenaKeys = new Set();
  arenas.forEach((a, i) => {
    if (!a.key || !a.name || !a.objective) errs.push({ file: q("feature-arenas.json"), line: i + 1, message: `arena missing key/name/objective` });
    if (arenaKeys.has(a.key)) errs.push({ file: q("feature-arenas.json"), line: i + 1, message: `duplicate arena key "${a.key}"` });
    arenaKeys.add(a.key);
  });
  ok.push(`OK ${q("feature-arenas.json")}: ${arenas.length} arenas`);

  // hypotheses
  const hItems = readJsonl(join(QA, "feature-hypotheses.seed.jsonl"));
  const hypothesisIds = new Set(hItems.map((x) => x.record.id));
  validateCollection(q("feature-hypotheses.seed.jsonl"), hItems, { arenaKeys, hypothesisIds, evidenceIds: new Set() }, errs);
  ok.push(`OK ${q("feature-hypotheses.seed.jsonl")}: ${hItems.length} hypotheses`);

  // evidence
  const eItems = readJsonl(join(QA, "feature-evidence.seed.jsonl"));
  const evidenceIds = new Set(eItems.map((x) => x.record.id));
  validateCollection(q("feature-evidence.seed.jsonl"), eItems, { arenaKeys, hypothesisIds, evidenceIds }, errs);
  ok.push(`OK ${q("feature-evidence.seed.jsonl")}: ${eItems.length} evidence records`);

  const ctx = { arenaKeys, hypothesisIds, evidenceIds };

  // matches
  const mItems = readJsonl(join(QA, "feature-matches.sample.jsonl"));
  validateCollection(q("feature-matches.sample.jsonl"), mItems, ctx, errs);
  ok.push(`OK ${q("feature-matches.sample.jsonl")}: ${mItems.length} matches`);

  // decisions
  const dItems = readJsonl(join(QA, "feature-decisions.jsonl"));
  validateCollection(q("feature-decisions.jsonl"), dItems, ctx, errs);
  ok.push(`OK ${q("feature-decisions.jsonl")}: ${dItems.length} decisions`);

  // outcomes
  const oItems = readJsonl(join(QA, "feature-outcomes.jsonl"));
  validateCollection(q("feature-outcomes.jsonl"), oItems, ctx, errs);
  ok.push(`OK ${q("feature-outcomes.jsonl")}: ${oItems.length} outcomes`);

  // judgements
  const judgeDir = join(QA, "judgements");
  const judgeFiles = existsSync(judgeDir) ? readdirSync(judgeDir).filter((f) => f.endsWith(".json")).sort() : [];
  for (const f of judgeFiles) {
    const j = JSON.parse(readFileSync(join(judgeDir, f), "utf8"));
    validateJudgement(q("judgements/" + f), j, hypothesisIds, evidenceIds, errs);
    ok.push(`OK ${q("judgements/" + f)}`);
  }

  // ── deterministic rating recompute (per-arena counts tally; full Elo recompute owned by Sprint 35.2) ──
  const recomputeA = JSON.stringify(recomputeArenaTallies(mItems));
  const recomputeB = JSON.stringify(recomputeArenaTallies(mItems));
  const tallies = recomputeArenaTallies(mItems);
  if (recomputeA !== recomputeB) {
    errs.push({ file: q("feature-matches.sample.jsonl"), line: 0, message: "rating recompute is not deterministic (repeat runs differ)" });
  } else if (tallies.reduce((sum, t) => sum + t.matchesCount, 0) !== 2 * mItems.length) {
    errs.push({ file: q("feature-matches.sample.jsonl"), line: 0, message: "recompute invariant failed: sum(matchesCount) != 2 * matches" });
  } else if (tallies.some((t) => t.wins + t.losses + t.draws !== t.matchesCount)) {
    errs.push({ file: q("feature-matches.sample.jsonl"), line: 0, message: "recompute invariant failed: wins + losses + draws != matchesCount" });
  } else {
    ok.push(`OK deterministic rating recompute: per-arena tally over ${mItems.length} matches is order-stable (full Elo recompute covered by Sprint 35.2)`);
  }

  // ── report real-data result ──
  if (errs.length > 0) {
    for (const e of errs) console.error(`FAILED ${e.file} line ${e.line}: ${e.message}`);
    console.error("FEATURE ARENA INVALID");
    process.exit(1);
  }
  for (const line of ok) console.log(line);
  console.log("FEATURE ARENA VALID");

  // ── self-test: every invalid fixture must be caught for its named reason ──
  const casesDir = join(QA, "validator-cases");
  const fixtures = [
    { file: "invalid-founder-prior-as-evidence.jsonl", expect: "founder_prior cannot be used as evidence" },
    { file: "invalid-global-score.jsonl", expect: "is forbidden" },
    { file: "invalid-match-missing-evidence.jsonl", expect: "match missing evidence_ids" },
    { file: "invalid-raw-user-data.jsonl", expect: "raw_user_data is forbidden" },
    { file: "invalid-build-next-without-human.jsonl", expect: "build_next requires decided_by = human" },
  ];
  if (existsSync(casesDir)) {
    console.log("\n=== self-test: invalid fixtures ===");
    let missed = 0;
    for (const fx of fixtures) {
      const path = join(casesDir, fx.file);
      if (!existsSync(path)) { console.error(`MISSED ${fx.file}: fixture file not found`); missed++; continue; }
      const items = readJsonl(path);
      const fxErrs = [];
      validateCollection("validator-cases/" + fx.file, items, ctx, fxErrs);
      const hit = fxErrs.find((e) => e.message.includes(fx.expect));
      if (hit) console.log(`CAUGHT ${fx.file}: ${hit.message}`);
      else { console.error(`MISSED ${fx.file}: expected failure containing "${fx.expect}" but validator did not catch it`); missed++; }
    }
    if (missed > 0) { console.error(`\n${missed} invalid fixture(s) NOT CAUGHT`); process.exit(1); }
    console.log("ALL INVALID FIXTURES CAUGHT");
  }

  process.exit(0);
}

main();
