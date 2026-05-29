# Agent Target Matrix

**Sprint:** 68A.16  
**Lane:** Chat A / Eval  
**Runtime impact:** None  
**Status:** Planning contract  

This matrix maps eval `target_agents` values to the trace steps Eval should
expect once future `live_read` evidence is available. It does not authorize
Supabase reads, LLM calls, pipeline execution, prompt changes, or repo artifact
writes.

## Target to trace mapping

| `target_agents` value | Required trace steps | Conditional trace steps | Missing classification |
|---|---|---|---|
| `pipeline` | `tolkar`, `pipeline` terminal summary | `konstruktor_a`, `konstruktor_b`, `samanliknar`, `kontrollor`, `rapportor` when the run claims those steps ran or the case requires report proof | `FAIL` for missing terminal summary in completed live proof; step-specific `WARN`, `MISSING`, or `FAIL` otherwise |
| `tolkar` | `tolkar` | none | `FAIL` when a live completed input-agent case lacks interpretation evidence |
| `konstruktor_a` | `konstruktor_a` | `tolkar` when input classification affects the candidate | `MISSING` when target explicitly includes A and the step is absent |
| `konstruktor_b` | `konstruktor_b` | `tolkar` when input classification affects the candidate | `MISSING` when target explicitly includes B and the step is absent |
| `samanliknar` | `samanliknar` | `konstruktor_a`, `konstruktor_b` when comparison proof depends on paired candidates | `FAIL` when dual-candidate proof is requested but comparator evidence is absent |
| `kontrollor` | `kontrollor` | constructor and comparator evidence when controller decisions depend on upstream disagreement or missing input | `FAIL` when blocked output or hard-block behavior is asserted but controller evidence is absent |
| `rapportor` | `rapportor` | `kontrollor` when blocked fields, disclaimers, or provisional confidence must be preserved in report proof | `FAIL` when report proof is requested and reporter evidence is absent |
| `process` | none by default | explicit cached-report or prompt-version evidence only when the case asks for process proof | `SKIP` for runtime trace assertions unless live proof is explicitly requested |

Every required trace step also inherits the baseline assertions from
`TRACE_ASSERTION_INVENTORY.md`: stable run id, unique step id, bounded status,
safe error category, safe model/prompt metadata when available, and no raw
provider payloads, secrets, stack traces, or service keys.

## Current case coverage

| Case ids | Current targets | Trace expectation |
|---|---|---|
| `001`, `005`, `012` | `pipeline` | End-to-end trace with terminal summary; downstream steps become required when live proof claims a completed full pipeline |
| `004`, `010` | `tolkar` | Input-agent interpretation evidence only |
| `002`, `003`, `006` | `konstruktor_a`, `konstruktor_b`, `kontrollor` | Independent constructor evidence plus controller evidence for missing-data or final-approval risk |
| `007`, `008` | `rapportor` | Reporter evidence for canonical report text, locale, disclaimers, and blocked-field preservation |
| `009` | `process` | Offline process judgment; old stored reports are not proof of new prompt/runtime changes |
| `011` | `samanliknar`, `konstruktor_a`, `konstruktor_b` | Paired constructor evidence and comparator evidence for load-combination ambiguity |

## Evaluation rule

Dry-run output must keep these trace assertions in planning mode:

```txt
evidence_source=dry_run
bundle_status=PLAN
run_id=null
trace assertions are described, not proven
```

Future live-read output may only evaluate a required trace as `PASS`, `WARN`,
`MISSING`, or `FAIL` when the runtime read path provides safe evidence for the
requested run id. Missing required trace evidence in a completed live run should
not be silently downgraded to a rules-only text grade.

## Stop conditions

Eval must stop short of live proof when:

```txt
target_agents contains a step that has no safe runtime evidence shape
the run id is absent or does not match the requested run id
the trace includes raw provider payloads or secrets
the runtime read path cannot prove ownership and safe field selection
process-only cases are mistaken for fresh runtime proof
```

These stop conditions keep the eval lane useful without letting planned trace
coverage masquerade as audited live evidence.
