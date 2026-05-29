# Prompt And Model Metadata Expectation

**Sprint:** 68A.17  
**Lane:** Chat A / Eval  
**Runtime impact:** None  
**Status:** Planning contract  

This contract defines the prompt and model metadata Eval should expect in
future `live_read` trace evidence. It does not authorize Supabase reads, LLM
calls, prompt behavior changes, raw prompt capture, or repo artifact writes.

## Purpose

Prompt and model metadata exists to make a run replayable enough for regression
analysis. It must never expose hidden prompt text, raw provider payloads,
secrets, stack traces, service-role data, or chain-of-thought content.

## Expected safe fields

Each trace step that called a model should expose these safe fields when the
runtime already records them:

| Field | Expected shape | Eval classification when absent |
|---|---|---|
| `step_name` | Stable pipeline step name, such as `tolkar` or `konstruktor_a` | `FAIL` if the step cannot be mapped at all |
| `model` | Public model identifier or redacted deployment label | `WARN` unless replayability is the explicit assertion |
| `prompt_version` | Stable prompt version, registry id, or explicit `unknown` | `WARN` unless prompt-version continuity is the explicit assertion |
| `metadata_recorded_at` | Timestamp for the metadata snapshot when available | `WARN` when freshness is being checked; otherwise optional |
| `metadata_source` | Bounded label such as `runtime_trace`, `cached_report`, or `fixture` | `WARN` if evidence source cannot be distinguished |

If a step did not call a model, Eval should accept `model=not_applicable` and
`prompt_version=not_applicable` rather than treating the fields as missing.

## Unsafe fields

Future Eval consumers must reject trace metadata that includes:

```txt
raw system prompts
raw developer prompts
raw user prompts beyond the eval case input
raw provider request or response envelopes
provider API keys or service-role keys
stack traces with local secrets
chain-of-thought or hidden reasoning
```

Any unsafe field in live-read evidence is `FAIL`, even if the visible report
text passes deterministic grading.

## Step expectations

| Step | Metadata expectation |
|---|---|
| `tolkar` | Prompt/model metadata should identify the input-classification prompt or explicitly state `unknown` |
| `konstruktor_a` | Metadata should be separate from `konstruktor_b` so independent candidate behavior can be compared |
| `konstruktor_b` | Metadata should not overwrite or reuse A's step metadata unless the runtime explicitly says the same prompt version was used |
| `samanliknar` | Metadata should identify comparator prompt/model version when comparison was model-assisted |
| `kontrollor` | Metadata should support blocked-output and provisional-confidence audits without exposing raw policy text |
| `rapportor` | Metadata should support report/prose regression audits without becoming a second report source |
| `pipeline` | Terminal summary should aggregate metadata presence and warnings, not duplicate every raw step payload |

## Bundle mapping

Future artifact bundles should place this evidence only in
`step-metadata-summary.json`:

```json
{
  "run_id": "uuid",
  "steps": [
    {
      "step_name": "konstruktor_a",
      "model": "model-name-or-unknown",
      "prompt_version": "prompt-version-or-unknown",
      "metadata_source": "runtime_trace",
      "ok": true,
      "warnings": []
    }
  ]
}
```

`trace-events-summary.json` may reference whether metadata exists, but it should
not duplicate prompt/model fields. `report-text.txt` must remain canonical
report text, not metadata.

## Evaluation rule

Dry-run output keeps these assertions as planned evidence:

```txt
evidence_source=dry_run
bundle_status=PLAN
prompt/model metadata is not read
```

Future live-read output may only mark prompt/model metadata as `PASS` when the
runtime evidence is safe, redacted, and tied to the requested `run_id`. Missing
safe metadata is usually `WARN`; unsafe raw metadata is always `FAIL`.

## Stop conditions

Eval must stop short of live proof when:

```txt
metadata belongs to a different run id
metadata cannot be mapped to a known step
prompt_version is confused with raw prompt text
model metadata includes provider secrets or raw envelopes
process-only cases are treated as proof of a new prompt version without a fresh run
```

These rules let Eval ask for replayable evidence without turning the eval
bundle into a prompt dump or a second source of runtime truth.
