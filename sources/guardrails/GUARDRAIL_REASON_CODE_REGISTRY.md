# PILAR Guardrail Reason-Code Registry

**Status:** proposal / source-of-truth candidate  
**Sprint:** 37.0  
**Owner:** PILAR Guardrail Agent track  
**Runtime impact:** none in Sprint 37.0

---

## 1. Purpose

This registry defines canonical reason codes for future PILAR guardrail decisions.

The goal is to avoid ad-hoc strings such as `bad input`, `unsafe`, `language issue`, or `blocked` being invented across the app, agent prompts, reports and logs. A guardrail decision should eventually refer to a known `reason_code` from:

```txt
sources/guardrails/guardrail-reason-codes.json
```

Sprint 37.0 is intentionally documentation/data only. It does not block runtime output, change Supabase, alter prompts or modify the application UI.

---

## 2. Relationship to existing schema proposals

This registry complements the earlier guardrail decision schema proposal.

The future runtime shape is expected to look roughly like:

```json
{
  "guardrail_status": "pass|warn|block",
  "reason_codes": ["missing_verified_section_properties"],
  "user_message": "The result is preliminary because verified section properties are missing.",
  "developer_message": "Prevent final capacity conclusion without verified section data.",
  "allowed_next_step": "show_preliminary_with_warning"
}
```

The schema says *where* reason codes are stored. This registry says *which* codes are valid and what each code means.

---

## 3. Categories

The v0.1 registry uses these categories:

| Category | Meaning |
|---|---|
| `input_quality` | Input is irrelevant, incomplete or insufficient. |
| `standard_context` | Eurocode/AISC/other standard context is unclear or mixed. |
| `engineering_data` | Required verified engineering data is missing or invented. |
| `calculation_integrity` | Units, values, equations or assumptions are inconsistent. |
| `output_claim` | Conclusion or approval language is too strong. |
| `report_artifact` | Report, PDF, Word or calculation sheet issues. |
| `language_i18n` | Shell/prose language leakage or role-name drift. |
| `system_safety` | Release, schema, patch or registry integrity. |

---

## 4. Status and severity

Each code has:

```txt
default_status: warn | block
severity: low | medium | high | critical
```

Use `warn` when PILAR can still show a clearly preliminary result with visible caveats.

Use `block` when the output would likely mislead the user or create a false impression of verified engineering compliance.

---

## 5. Current registry

The current v0.1 reason-code registry lives in JSON so it can be validated locally and later reused by scripts, tests, Supabase seed data or runtime guardrail logic.

Run:

```bash
node scripts/validate-guardrail-reason-codes.mjs
```

Expected:

```txt
OK sources/guardrails/guardrail-reason-codes.json: 14 guardrail reason codes validated, 0 errors, 0 warnings
```

---

## 6. Sprint 37.0 acceptance criteria

Sprint 37.0 is accepted when:

```txt
1. JSON registry validates.
2. Reason codes are unique.
3. Required fields are present.
4. Categories, default_status and severity values are valid.
5. No app/runtime code is changed.
6. TypeScript remains green.
```

---

## 7. What not to do in Sprint 37.0

Do not:

```txt
- add Supabase migrations
- enforce guardrails at runtime
- change agent prompts
- change report rendering
- change app UI
- add blocking behavior
- wire reason codes into production runs
```

Those belong to later sprints.

---

## 8. Suggested follow-up sprints

```txt
37.1 — Guardrail reason-code npm alias
37.2 — Guardrail reason-code docs index
37.3 — Guardrail decision fixture set
37.4 — Guardrail decision validator
37.5 — Guardrail registry connected into agent hub
37.6 — Guardrail Agent final checkpoint
```

Runtime enforcement should wait until the registry, fixtures and validators are stable.
