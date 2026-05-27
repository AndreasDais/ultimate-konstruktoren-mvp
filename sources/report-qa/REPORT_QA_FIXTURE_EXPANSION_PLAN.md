# PILAR Report QA Fixture Expansion Plan

**Sprint:** 50.0  
**Status:** planning checkpoint  
**Owner:** Report QA track  
**Purpose:** Define the next fixture set for Report QA before connecting dry-run checks to real PILAR runtime output.

---

## 1. Why this exists

Report QA now has a registry, a dry-run foundation, one sample fixture, one realistic steel beam fixture, npm aliases, agent hub integration, health snapshot coverage and final checkpoints.

The next risk is expanding too quickly into runtime output without enough fixture coverage.

This plan keeps the next steps fixture-first:

```txt
fixture -> validator -> dry-run -> coverage report -> exported real reports -> runtime-safe preview
```

No user-facing report output should change in this phase.

---

## 2. Current baseline

Current Report QA foundation:

```txt
sources/report-qa/report-qa-checks.json
sources/report-qa/REPORT_QA_CHECK_REGISTRY.md
scripts/validate-report-qa-checks.mjs
scripts/run-report-qa-dry-run.mjs
scripts/validate-report-qa-real-fixture.mjs
sources/report-qa/dry-run/sample-report.md
sources/report-qa/dry-run/fixtures/realistic-steel-beam-report.md
```

Current commands:

```bash
npm run report-qa:check
npm run report-qa:dry-run:check
npm run report-qa:fixture:check
npm run agent:hub -- report-qa-dry-run-check
npm run agent:hub -- report-qa-fixture-check
npm run agent:all
node scripts/write-agent-ecosystem-health-snapshot.mjs --check
```

---

## 3. Expansion principles

1. Add fixtures before adding runtime behavior.
2. Keep each fixture static, reviewable and deterministic.
3. Every fixture should have a clear reason for existence.
4. Every fixture should map to at least one Report QA check.
5. Include both positive and negative examples.
6. Do not rely on AI-generated live output as the first source of truth.
7. Do not connect dry-run results to user-visible UI until fixture coverage is broader.
8. Keep check-mode non-writing for normal sprint tests.
9. Keep generated dry-run reports out of unrelated commits.
10. Prefer small fixture clusters over one huge fixture sprint.

---

## 4. Recommended fixture families

### 4.1 Minimal valid report

**Purpose:** Confirm the dry-run can identify a small but acceptable report.

Should cover:

```txt
answers_user_request
assumptions_explicit
conclusion_strength_appropriate
disclaimer_present
controller_decision_visible
```

Expected result:

```txt
mostly_pass
```

---

### 4.2 Missing input report

**Purpose:** Ensure Report QA catches reports that answer too confidently despite missing data.

Should include:

```txt
missing span
missing load assumptions
missing material grade
missing support condition
```

Expected issues:

```txt
missing_data_acknowledged
conclusion_strength_appropriate
warnings_visible
```

---

### 4.3 Unit inconsistency report

**Purpose:** Catch mixed or unclear units.

Examples:

```txt
kN mixed with N without conversion
mm mixed with m in formulas
area values without units
moment values missing kNm/Nmm distinction
```

Expected issues:

```txt
formulas_units_symbols_consistent
values_traceable
```

---

### 4.4 Overconfident conclusion report

**Purpose:** Catch reports that present preliminary AI output as final engineering approval.

Examples:

```txt
"verified final compliance"
"approved for construction"
"no human review needed"
```

Expected issues:

```txt
conclusion_strength_appropriate
disclaimer_present
controller_decision_visible
```

---

### 4.5 Missing disclaimer report

**Purpose:** Ensure legal/professional-review language is visible.

Expected issues:

```txt
disclaimer_present
warnings_visible
professional_reviewer_needed
```

---

### 4.6 Norwegian/Nynorsk report

**Purpose:** Check language shell and role labels in Norwegian mode.

Should include:

```txt
Konstruktør A
Konstruktør B
Samanliknar
Kontrollør
Førebels godkjent
HØG/LAV
```

Expected issues if English shell leaks:

```txt
language_shell_consistent
standard_context_consistent
```

---

### 4.7 English/AISC diagnostic report

**Purpose:** Check that international/AISC-style output does not leak Norwegian labels or pretend to verify unavailable AISC section properties.

Expected issues if violated:

```txt
language_shell_consistent
no_hallucinated_standard_values
standard_context_consistent
```

---

### 4.8 Concrete example report

**Purpose:** Ensure Report QA is not overfit to steel beam language.

Should include:

```txt
concrete strength
reinforcement assumptions
moment/shear checks
serviceability notes
preliminary conclusion
```

Expected coverage:

```txt
formulas_units_symbols_consistent
assumptions_explicit
values_traceable
```

---

### 4.9 Load combination / Eurocode mismatch report

**Purpose:** Catch reports that mix characteristic and design loads or use unclear load-combination language.

Expected issues:

```txt
standard_context_consistent
values_traceable
formulas_units_symbols_consistent
```

---

### 4.10 PDF/Word parity placeholder fixture

**Purpose:** Prepare for later artifact parity checks without implementing PDF/Word parsing yet.

Expected status in this phase:

```txt
planned_not_active
```

---

## 5. Suggested sprint sequence

```txt
50.0  Fixture expansion plan
50.1  Fixture registry seed
50.2  Multi-fixture validator
50.3  Add minimal valid + missing input fixtures
50.4  Add unit inconsistency + overconfident conclusion fixtures
50.5  Add missing disclaimer fixture
50.6  Add Norwegian/Nynorsk fixture
50.7  Add English/AISC diagnostic fixture
50.8  Add concrete example fixture
50.9  Fixture coverage report
51.0  Report QA multi-fixture final checkpoint
```

Keep this flexible. Do not start runtime integration until the fixture bank covers both pass and fail cases.

---

## 6. Acceptance criteria before runtime-adjacent Report QA

Report QA should not move toward runtime previews until these are true:

```txt
- At least 8 fixtures exist.
- Fixtures include both positive and negative cases.
- Fixture registry validates.
- Multi-fixture validator passes.
- Fixture coverage report maps fixtures to Report QA checks.
- agent:all includes registry, dry-run and fixture validation.
- health snapshot includes registry, dry-run and fixture validation.
- release:readiness:check remains fast.
```

---

## 7. Stop conditions

Stop and fix before continuing if:

```txt
- fixture validator becomes slow or flaky
- fixture files become too large to review
- dry-run writes artifacts during normal check mode
- Report QA starts changing user-visible output
- agent:all becomes slow again
- health snapshot enters nested full-gate behavior
- fixture language/standard context is ambiguous
```

---

## 8. Explicitly out of scope for Sprint 50.0

```txt
runtime Report QA agent
UI integration
Supabase writes
database schema changes
PDF/DOCX parsing
automatic report rejection
LLM grading
real user report ingestion
```

---

## 9. Recommended next sprint

```txt
Sprint 50.1 — Report QA fixture registry seed
```

Goal:

```txt
Create a small JSON registry that lists fixture ids, purpose, expected result, mapped Report QA checks and file path.
```
