# Live Read Release-Proof Checkpoint

Status: Runtime contract checkpoint, diagnostic-only today.

This note locks the Runtime rule for future `live_read` release-proof work:
schema-backed trace metadata is necessary, but not sufficient. Partial writer
coverage must never become release-proof GREEN.

## Current State

The shipped Runtime diagnostic chain can read and map evidence for diagnostic
Eval handoff, but it is not release-proof:

- diagnostic helper and server adapter can build a redacted evidence shape
- diagnostic Supabase reader uses current-schema safe selects
- diagnostic Eval handoff forces `policy: "diagnostic"`
- diagnostic wrapper keeps `release_proof_status` unavailable by returning
  `FAIL` with `diagnostic_live_read_only`

Diagnostic evidence is useful for readiness, replay planning, and fixture
mapping. It must not be counted as an Ops release-proof PASS.

## Release-Proof Candidate Requirements

A future release-proof candidate requires full pipeline writer coverage, not
only agent C/D metadata. The following writers must all persist compatible safe
metadata before release-proof can be considered:

- input agent / tolkar
- konstruktor A
- konstruktor B
- samanliknar
- kontrollor
- rapportor

Agent C/D-only metadata is diagnostic/readiness evidence. It is not enough for
release-proof GREEN, even if those rows have schema-backed safe fields.

## Required Safe Trace Fields

Every terminal step writer must persist these safe top-level fields:

- `status`
- `completed_at`
- `error_category`
- `retryable`
- `raw_error_redacted`

`provider_message_id` is optional and must stay deferred unless Runtime stores
it as a safe top-level value or one-way hash. It must never be parsed from
`step_messages.raw_message` or any raw provider envelope for Eval evidence.

## Blocking Rules

Release-proof must stop when any of these are true:

- any pipeline writer lacks the safe metadata contract
- a terminal step lacks safe `status`
- a terminal step lacks `completed_at`
- a failed or blocked step lacks bounded `error_category`
- `retryable` is missing where a safe category requires retry semantics
- `raw_error_redacted` is absent or false
- blocked output is indicated but `blocked_fields` are missing
- report evidence is not canonical `ReportModel` text
- ownership/auth proof is absent
- evidence contains raw prompt, raw provider payload, stack trace, secret,
  local path, hidden reasoning, or raw message content
- evidence implies final professional approval

Missing any required safe terminal status, timestamp, or error metadata blocks
release-proof. It may still be diagnostic evidence.

## Schema Implication

A DB migration is required before release-proof candidate work. The current
diagnostic reader intentionally avoids missing current-schema fields such as
top-level `error_category` and `retryable`.

The migration must add safe top-level trace fields rather than asking Eval or
Runtime readers to inspect raw provider payloads.

## Ops Boundary

Ops `release_proof_green` needs all of these before treating live_read as a
candidate PASS:

- `diagnostic_only=false`
- full pipeline writer coverage confirmed
- server-side ownership/auth proof
- terminal run status
- terminal step status and timestamps
- bounded error metadata for failed/blocked steps
- redaction-ok evidence
- canonical report text/source proof
- blocked-fields proof without blocked values
- professional review disclaimer and no final approval wording

Until then, live_read remains diagnostic-only even when evidence is useful.
