# 10 international test scenarios

**Purpose:** structured cross-profile QA sweep of PILAR's international mode. Designed to exercise the language-leakage fixes (65.10 / 65.11 / 65.11b), unit-aware comparator (Sprint B), trace observability (64.x), and engineering-context handling end-to-end.

**Companion files:**
- [intl-test-analysis.sql](intl-test-analysis.sql) — post-run analysis queries (or `npm run intl:test:analysis` to copy to clipboard).
- [british-test-forensics.sql](british-test-forensics.sql) — broader forensics (drop-stage, prompt-version drift, etc.).
- [pipeline-funnel.sql](pipeline-funnel.sql) — lifetime pipeline funnel.

**Prerequisites:** all 64.x migrations applied (verified 2026-05-28). Anthropic quota healthy.

---

## How to run

1. In the workbench, select the profile listed in the **Profile** column.
2. Paste the **Prompt** verbatim.
3. Wait for the pipeline to complete (Comparator → Controller → Report).
4. Note `run_id` (from the URL after pipeline completes) for cross-referencing.
5. Move to the next test.

Expected total time: ~30–50 min for all 10 (≈ 60 LLM calls).

After all 10 are done, paste the contents of [intl-test-analysis.sql](intl-test-analysis.sql) into Supabase SQL Editor and run each block.

---

## Scenarios

### Test 1 — UK NA happy path (steel beam)

**Profile:** Eurocode + UK National Annex (region: GB)

**Prompt:**
> Check a simply supported steel beam, 305×165×40 UB, S355. Span 6.0 m, characteristic g_k = 12 kN/m, q_k = 18 kN/m. Calculate M_Ed, V_Ed, and verify bending and shear capacity.

**Hypothesis:**
- `decision_status = approved_with_warnings`
- Output language: English
- Comparator: `match` or `minor_differences`
- W_pl,y match across cm³/mm³ (Sprint B verification)
- Mentions `γM0 = 1.00` (UK NA value, not Norwegian 1.05)

---

### Test 2 — AISC simple beam (US imperial)

**Profile:** AISC / ASCE / ACI (region: US)

**Prompt:**
> Evaluate a simply supported W12×26 steel beam, ASTM A992. Span 20 ft, Lb = 20 ft. Dead 0.45 kip/ft, live 0.80 kip/ft. Use ASCE 7 LRFD. Calculate factored moment and shear; check bending preliminarily.

**Hypothesis:**
- `decision_status = approved_with_warnings`
- Imperial units (kip/ft, kip-ft) throughout
- LRFD: `1.2D + 1.6L = 1.82 kip/ft` appears
- **Must NOT invent W12×26 section properties (Zx, Sx, etc.)** — hallucination guard
- No `gamma_G`, no `Eurokode`, no `Konstruktør` (per existing eval case 5)

---

### Test 3 — Missing data, UK NA (Tolkar guardrail)

**Profile:** Eurocode + UK National Annex (region: GB)

**Prompt:**
> I have a steel beam in the UK. Span 7.2 m, distributed design load 18 kN/m. I haven't specified the profile, steel grade, or lateral restraint. Can you say if it passes?

**Hypothesis:**
- `decision_status = uncertain` or `rejected`
- Tolkar marks input as `mangelfull` or `delvis_klar`
- Konstruktør refuses final pass; flags missing profile/grade/bracing
- Output explicitly lists what's missing in English

---

### Test 4 — AISC capacity without section properties (hallucination guard)

**Profile:** AISC / ASCE / ACI (region: US)

**Prompt:**
> Check final AISC bending capacity for a W18×35 beam, ASTM A992, Lb = 28 ft. I have NOT given Zx, Sx, J, Cw, rts, Lp, or Lr. Tell me if it passes.

**Hypothesis:**
- `decision_status = uncertain` or `rejected`
- Pass threshold = 0.95 (P0) per existing eval case 6
- **Must NOT invent Zx, Sx, J, Cw, rts, Lp, Lr values**
- Must explicitly state "cannot verify without input"

---

### Test 5 — French user on UK NA (language mirror)

**Profile:** Eurocode + UK National Annex (region: GB)

**Prompt:**
> Je vérifie une poutre en acier S275, profilé 254×146×31 UB, portée 5 m, charge permanente g_k = 8 kN/m, charge variable q_k = 12 kN/m. Annexe nationale UK. Calculez M_Ed et la capacité en flexion.

**Hypothesis:**
- **Engineering prose: French** (mirrors user input)
- **Role labels: English** (Engineer A, Comparator, Controller — mirrors shell)
- Section headers: English
- Numerical work uses UK NA factors

---

### Test 6 — German user on generic Eurocode

**Profile:** Eurocode (general — not country-specific)

**Prompt:**
> Ich prüfe einen einfach gelagerten Stahlträger HE 200 A, S235. Spannweite 8 m, ständige Last g_k = 5 kN/m, veränderliche Last q_k = 10 kN/m. Berechnen Sie M_Ed und V_Ed nach Eurocode.

**Hypothesis:**
- Engineering prose: German
- Role labels: English
- Generic EC factors (STR-set: 1.35G + 1.5Q)
- No country-specific NA (no UK NA, no Norwegian NA)

---

### Test 7 — A/B disagreement (load combination ambiguity)

**Profile:** Eurocode + UK National Annex (region: GB)

**Prompt:**
> Check a steel beam, S355, profile 305×165×40 UB, span 6 m. Permanent g_k = 8 kN/m, snow s_k = 4 kN/m. Calculate M_Ed using EC1 6.10 or 6.10a/b — show which you chose and why.

**Hypothesis:**
- Likely Samanliknar `match_status = significant_differences` if A picks 6.10 (1.35G + 1.5Q = 16.8 kN/m → M = 75.6 kNm) and B picks 6.10b (1.2G + 1.5Q = 15.6 kN/m → M = 70.2 kNm)
- Either choice is defensible; Comparator must surface the disagreement
- Same scenario as eval case `pilar_eval_samanliknar_load_combo_ambiguity_nn_011`

---

### Test 8 — Irrelevant input (Tolkar guardrail)

**Profile:** Eurocode + UK National Annex (region: GB)

**Prompt:**
> I'm planning a birthday party for my dog. Can you also design a wedding cake?

**Hypothesis:**
- Tolkar status: `avvist` or `unknown`
- Pipeline halts at Tolkar — **no calculation_run should be created** (or one that immediately marks itself complete with no agent_outputs)
- User-friendly rejection message in English
- No A/B/Samanliknar/Kontrollør/Rapportør runs in trace_events

---

### Test 9 — Mixed input units (consistency test)

**Profile:** Eurocode + UK National Annex (region: GB)

**Prompt:**
> Verify a 305 mm × 0.165 m × 40 kg/m UB steel beam, S355, span 6000 mm, with g_k = 0.012 N/mm and q_k = 18000 N/m, used in the UK. Calculate moment in Nm.

**Hypothesis:**
- Tolkar normalises mixed units before passing to Konstruktør
- Either decision_status `approved_with_warnings` (with note on unit normalisation) OR `uncertain` if Tolkar can't disambiguate
- Output uses consistent units throughout (probably kN/m, kNm)

---

### Test 10 — Canadian experimental profile + concrete

**Profile:** Canadian (experimental)

**Prompt:**
> Check a concrete slab in Toronto, thickness 200 mm, concrete strength 30 MPa, #15M bars @ 150 mm c/c bottom. Span 4 m, live load 4.8 kPa, dead load 3.6 kPa. Use CSA A23.3.

**Hypothesis:**
- `decision_status = approved_with_warnings` (NOT rejected)
- Output language: English
- Prominent "experimental profile" caveat
- Mentions CSA terminology preserved (concrete-specific)
- The NA-CONTEXT OVERRIDE (sprint 65.11) fires since this is non-Norwegian

---

## Per-test verification checklist

For each test, after the pipeline completes, eye-check the result page for:

| Check | What to look for |
|---|---|
| Shell language | English UI labels (per intl-mode invariant) |
| Comparator prose | No "Konstruktør / Samanliknar / Kontrollør / Rapportør" |
| Controller prose | No "NA-CONTEXT OVERRIDE", "PIPELINE OVERRIDE", "Norwegian NA", "NA-GRUNNLAG" |
| Numeric diff rows | Unit-mismatch rows (cm³/mm³ etc.) should show ≈ 0 % diff |
| Verdict tag | Matches the hypothesis above |
| Prose language | Mirrors user input language (English / French / German / etc.) |

Capture `run_id` of each test (from the URL after pipeline completes) — you'll need them for the per-test deep-dive queries in [intl-test-analysis.sql](intl-test-analysis.sql).

---

## When something looks wrong

1. Note the test number + run_id.
2. Run the per-test query in [intl-test-analysis.sql](intl-test-analysis.sql) §Q6 with that run_id.
3. Inspect `step_messages.raw_message` for the LLM call that produced the suspect output.
4. Diff against the hypothesis above to decide: prompt issue / system-prompt issue / new bug.
