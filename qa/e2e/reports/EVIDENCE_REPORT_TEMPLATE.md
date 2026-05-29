# PILAR Synthetic User Evidence Report Template

Use this template for Synthetic User / E2E evidence reports before a run is
promoted into a gate. It is intentionally mode-explicit so dry-run, cached,
fixture, and live evidence are never mixed.

---

## Run metadata

```txt
Sprint:
Tester:
Date:
Commit/branch:
Target URL:
Evidence mode: live / cached / fixture / dry-run
Original run ID:
Original run date:
Prompt/checklist source:
Command, if any:
```

Evidence mode definitions:

```txt
live     real browser against a running local, preview, or production target
cached   previously captured report/run evidence re-checked without new agent execution
fixture  static local fixture used to validate the harness or checklist only
dry-run  no user journey executed; planning, selector validation, or checklist review only
```

Required honesty check:

```txt
If mode is dry-run: state "No live product behavior was verified."
If mode is fixture: state whether the fixture came from a real run.
If mode is cached: link or name the original run evidence.
If mode is live: save text, screenshot, and relevant API trace paths.
```

---

## User journey

```txt
Flow ID:
Flow name:
Locale / standard:
Input source:
Start surface opened: yes/no/not applicable
Interpret step completed: yes/no/not applicable
Run step completed: yes/no/not applicable
Report opened: yes/no/not applicable
Calculation view opened: yes/no/not available
Word export checked: yes/no/not available
PDF export checked: yes/no/not available
```

Notes:

```txt
Do not run writing production operations.
Do not edit app, runtime, prompts, schema, eval cases, or ops gates.
Do not describe AI output as professional approval.
```

---

## Assertions

Must-show:

```txt
professional review / disclaimer language:
preliminary or provisional trust wording:
blocked fields shown as blocked, if present:
generated report prose preserved in original report locale:
```

Must-not-show:

```txt
"Godkjent" or "Approved" as unqualified final approval:
blocked values as normal approved report prose:
raw provider errors, stack traces, or secrets:
dry-run evidence described as live proof:
```

Locale evidence:

```txt
Original report locale:
Current UI locale:
Generated prose preserved: yes/no/not applicable
Shell labels follow UI locale: yes/no/not applicable
Schema keys translated in evidence: yes/no
```

Blocked-fields evidence:

```txt
blocked_fields present: yes/no/unknown
Blocked field names:
Surface where blocked state is visible:
Proof blocked value is not reused as normal prose:
Report / Word / PDF canonical-data consistency:
```

---

## Evidence files

```txt
Summary report:
Structured result JSON:
Extracted report text:
Screenshot:
API trace:
Other evidence:
```

Classify each finding:

```txt
product finding:
harness limitation:
environment/setup failure:
```

---

## Verdict

```txt
Decision: PASS / PASS WITH WARNINGS / FAIL / NOT EXECUTED
Reason:
Owner lane for follow-up:
Safe next action:
```

For `NOT EXECUTED`, include:

```txt
Evidence mode: dry-run
No live product behavior was verified.
```
