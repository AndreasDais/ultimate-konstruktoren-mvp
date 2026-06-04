# Agent LiveOps — safety & privacy policy (v0)

Binding for every Agent LiveOps sprint. When this policy conflicts with a feature idea, **the policy wins**.

## 1. Human remains final

Agent LiveOps **surfaces status only**. It cannot decide or act. Specifically, it **cannot**:

- decide **release** readiness;
- decide **`build_next`**;
- create **Feature Arena roadmap decisions** (it may show evidence candidates, read-only);
- weaken or remove **professional-review** language, warnings, or disclaimers.

A human reviews and decides separately. The dashboard has no write / deploy / merge / prompt controls in v0 (`NON_GOALS.md`).

## 2. Engineering-truth boundaries stay intact

- **AISC remains diagnostic-only.** LiveOps must never present AISC/ASCE/ACI output as final compliance. Guardrail `block` / `warn` and reason codes such as `missing_verified_section_properties` are shown as-is — never recolored as pass/success.
- **EC3 remains preliminary / provisional** where relevant. LiveOps never upgrades a preliminary status to "approved".
- **No standard / language mixing.** International runs keep English shell labels; Norwegian runs keep Norwegian labels — the dashboard must not corrupt role/status labels across modes.

## 3. No raw chain-of-thought, no raw user data

**Allowed** to show: agent status, tool-call name, duration, sanitized input/output summary, guardrail reason codes, controller decision, evidence IDs, artifact status, eval result.

**Never** show: raw hidden reasoning, private chain-of-thought, raw sensitive user data, full prompts containing sensitive project details, or unredacted uploaded file contents.

## 4. Redaction required

Every event must carry a `redaction_status` of `safe_summary_only` or `no_user_data`. The Sprint 36.1 validator must fail on `raw_user_data`, `full_user_prompt`, `unredacted_file_text`, or `personal_data` (see `AGENT_EVENT_SCHEMA.md`).

## 5. Admin-only + authenticated

`/admin/agent-liveops` and any future API route require an admin session. No public indexing, no unauthenticated event stream.

## 6. No fake progress

Animations are event-driven only: no animation without an event, no success without a completed event, no guardrail color without a guardrail decision, and no generated "thought bubbles" or fake AI-thinking states (`AGENT_VISUAL_LANGUAGE.md`).

## 7. STOP conditions

Stop and correct if any of these occur: the admin route is not protected; the event feed shows raw user data or hidden reasoning; the UI shows fake progress without an event; a guardrail block is animated as pass/success; an international run shows wrong role labels, or a Norwegian run is broken by English labels; a sprint mixes admin UI with prompt edits or report/PDF/Word changes; a live stream creates DB writes without schema review; the admin UI gains write buttons for deploy/merge/prompt before a policy exists; or `tsc` / build fails.
