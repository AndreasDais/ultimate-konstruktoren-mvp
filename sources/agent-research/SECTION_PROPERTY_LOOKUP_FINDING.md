# Konstruktør guesses section properties for non-European profiles — handoff to Codex

**Source:** intl sweep, 2026-05-28. **Author:** UI/Landing track (Runtime/agent-lane finding: `lib/profiles/**` + `app/api/agent-a|b`). Surfaced as a handoff per `LANES.md`; not fixed by this track.
**Direction confirmed with owner:** "we already have the same kind of solution for Norwegian tables — build one per standard, as in the pilot." This note pins the exact gap + the pattern to replicate.

## Root cause (confirmed by code trace, deterministic — not a hypothesis)

The authoritative section-property lookup only covers **European** profiles, so for UK/AISC/Canadian profiles the constructors get **no injected data and recall values from memory** → Konstruktør A and B disagree on tabulated geometry.

1. `lib/profiles/extract.ts:4` — `PROFILE_REGEX = /\b(IPE|HEA|HEB)[\s\-]*(\d{2,3})\b/gi`. Cannot match `305x165x40 UB`, `254x146x31 UB`, `W12x26`, `W18x35`, HSS, etc. → those profiles are never extracted.
2. `lib/profiles/steel-profiles.ts:17` — `family: "IPE" | "HEA" | "HEB"`; table `STEEL_PROFILES` (L39–71) has only IPE/HEA/HEB rows (EN 10365). No UK UB/UC, no AISC W, no Canadian W.
3. `lib/profiles/extract.ts:32` — `buildProfileDataPromptBlock([])` returns `""` when nothing is found.
4. The block is injected **unconditionally** in `app/api/agent-a/route.ts:252` and `app/api/agent-b/route.ts:264` — so the wiring is fine; the **data + the regex** are the gap. Add rows + name patterns and they flow through automatically.

## Evidence (run-ids, `GET /api/runs/[id]`)

| Run | Profile | Outcome |
|---|---|---|
| `7de31fdb` (T1) | 305×165×40 UB | A/B disagree on **t_f** (10.2 vs 10.7 mm) → `significant_differences` → `uncertain` |
| `41977bfe` (T5) | 254×146×31 UB | A/B disagree on **W_pl,y** (481 vs 395 cm³, 17.9 %) → `critical_disagreement` → `rejected` |
| `3db5dd46` (T7) | 305×165×40 UB | only `minor_differences` this run — **same profile as T1**, different outcome ⇒ non-deterministic guessing (temp=1) |

The Comparator caught every case (good defence-in-depth). **The silent risk:** if both constructors recall the *same* wrong value, nothing flags it. The lookup removes the guess entirely.

## Existing pattern to replicate (the "Norwegian tables")

- **Profile geometry:** `lib/profiles/steel-profiles.ts` — `SteelProfile` type + `STEEL_PROFILES` + `findProfile()`. `lib/profiles/extract.ts` — regex + `buildProfileDataPromptBlock` (header already says *"bruk desse eksakte verdiane, ikkje hugs frå minnet"*).
- **NA factors (twin gap):** `lib/profiles/na-basis.ts` + `standards-basis.ts`. Note `buildStandardsBasisPromptBlock` (standards-basis.ts:205–210) and `resolveFactorSet` (L315–320) already return `""` / `null` for `eurocode_uk_na | aisc_asce_aci | canada` — *"INGA blokk … ein verifisert UK-blokk er ikkje levert enno."* Same per-standard extension applies to factors.

## Suggested order (highest value / lowest effort first)

1. **UK UB/UC** — metric, *same units & property names* as the current table → add `family: "UB" | "UC"` + rows from SCI P363 / Blue Book, and extend `PROFILE_REGEX` for `305x165x40 UB`-style names. Directly fixes T1/T5/T7 (the bulk of the UK NA sweep). Also wire the UK NA factor block in `standards-basis.ts`.
2. **AISC W/HSS** — ⚠️ imperial units (in², in³, in⁴) and different property names (Z_x, S_x, r_ts, J, C_w). Needs a units-model decision: extend `SteelProfile` with a unit system, or a parallel imperial table — do **not** shoehorn imperial values into the metric `cm³` fields.
3. **Canadian W (CISC)** — metric W-shapes; unit-wise like UK.

**Watch:** profile-naming conventions differ per standard — the extractor needs per-standard regex patterns (UB/UC, AISC `W…x…`, HSS, CHS/SHS), not just more rows.

## Run-id index
`7de31fdb` T1 · `41977bfe` T5 · `3db5dd46` T7 (UK UB profiles). Related sweep notes: `INTL_LANGUAGE_MIRROR_FINDINGS.md`, `DB_WRITE_RESILIENCE_FINDINGS.md`, `LATEX_GENERATION_FINDING.md`.
