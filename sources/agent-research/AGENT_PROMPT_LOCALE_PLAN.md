# Agent Prompt Locale Plan

**Sprint:** 65.8
**Status:** Plan-doc. Read-only. No code changes.
**Purpose:** Decide how to fix [AGENT_ROUTE_AUDIT.md F4](AGENT_ROUTE_AUDIT.md) ("system prompts hardcode Norwegian role-labels") given the language infrastructure that already exists. This doc commits to an approach so subsequent sprints implement without re-litigating the design.

---

## 1. The specific gap

All six agent system prompts open with a Norwegian role identity:

| Route | First sentence of `SYSTEM_PROMPT` |
|---|---|
| `input-agent` | "Du er Tolkar for Pilar..." |
| `agent-a` | "Du er Konstruktør A, ein uavhengig løysingsagent..." |
| `agent-b` | "Du er Konstruktør B, ein UAVHENGIG KONTROLL-LØYSAR..." |
| `agent-c` | "Du er Samanliknar for Pilar..." |
| `agent-d` | "Du er Kontrollør for Pilar..." |
| `agent-e` | "Du er Rapportør for Pilar..." |

This is partially mitigated by the locale-aware wrapping infrastructure but not solved. See §2.

### Concrete failure mode the eval catches

Eval case [pilar_eval_aisc_simple_beam_en_005](../../qa/evals/pilar-core-evals.jsonl) (English/AISC) explicitly asserts:

```json
"must_not_include": ["Konstruktør", ...],
"safety_checks": ["shell labels must be English", "technical prose may be French", "must not claim final Canadian compliance"]
```

If the LLM echoes its own role identity in reasoning or output (which it does occasionally), the eval fires. The existing setup relies on the model being well-behaved enough to translate "Du er Konstruktør A" → "Engineer A" inside its own head when generating English output. That works most of the time. We have no measurement of how often it does *not* work.

### Why this is more than a polish item

PILAR is moving toward an international product surface — see the recent commits `cebab79` (English /terms route), `bf43cf2` (/international → /terms link), `7b191bb` (English pilot examples), and the parallel language session that's still active. The shell of the app is going English. The agent prompts haven't caught up. The mismatch will become observable when an English user sees a Norwegian role-label leak through.

---

## 2. What already exists (do not duplicate)

The parallel language work has built substantial infrastructure. Any plan here must build on it, not around it.

### 2.1 `lib/locale.ts`

- `Locale = "nb" | "nn"` (no English yet — `en` lives in a separate type, see §2.3)
- `wrapPromptWithLocale(prompt, locale)` — sandwich-wraps with `SVARSPRÅK: BOKMÅL` / `SVARSPRÅK: NYNORSK` directive top and bottom
- `getLocaleFromCookies(cookies)` — server-side helper

### 2.2 `lib/engineering-context/agent.ts`

`buildAgentSystemPrompt(basePrompt, locale, context)` already composes:
1. `buildEngineeringContextPromptBlock(context)` — region/standard/units block
2. `SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT` — safety prelude
3. English notation hint block (when `isInternationalEnglishContext(context)` is true)
4. `"PILAR AGENT INSTRUCTIONS"` header
5. The Norwegian `basePrompt`

When `isInternationalEnglishContext(context)` is true, the wrapper recognises the English context — but the Norwegian role identity in `basePrompt` is passed through untouched.

### 2.3 `lib/international/display.ts`

- `PilarDisplayLanguage = Locale | "en"` — separate type for the display/output language
- `isInternationalEnglishContext(context)` — predicate for "this is an English-mode run"
- `SPRINT336_ENGLISH_LABEL_BY_KEY` — extensive label map for report rendering (Engineer A/B, Comparator, Controller, etc.)
- ~1000+ lines of English-side translations for the report surface

Important: this is rendering-side, not prompt-side. The agents still see Norwegian role labels; the *output rendering* swaps them for English. That swap works for structured fields the renderer controls. It does NOT help when the LLM puts "Konstruktør A" in its own prose.

### 2.4 `engineeringContextUserMessageBlock` (lib/engineering-context/agent.ts:56)

Tells the agent in the user message:
> "Agent language policy: answer in the same language as the user's prompt; fallback to {fallbackLanguage} if unclear."

This is the current line of defence. It works for most cases but is a soft instruction, not a hard constraint.

---

## 3. Four approaches considered

### Option A — Bilingual role identity in single prompt

Change each `SYSTEM_PROMPT` to open with mixed-language identity:
> "You are Konstruktør A / Engineer A for Pilar..."

Then continue in Norwegian. The model sees both terms and can produce either.

**Pros:** minimal diff, no new infrastructure, single source of truth.
**Cons:** mixed-language prompts feel hacky; doesn't scale to a third language; doesn't actually instruct the model to *prefer* English output in English contexts.

### Option B — Per-language prompt variants

Maintain `SYSTEM_PROMPT_NB` and `SYSTEM_PROMPT_EN` per agent route. Pick at runtime based on `isInternationalEnglishContext(context)` or `PilarDisplayLanguage`.

**Pros:** explicit, maintainable per-language nuance, mirrors how `SPRINT336_ENGLISH_LABEL_BY_KEY` already works for the rendering layer.
**Cons:** doubles prompt maintenance burden (each agent has 200+ lines of Norwegian prompt; English version must stay in sync); risk of drift between the two language versions; carrying multiple translations forever.

### Option C — Locale-aware preamble in `buildAgentSystemPrompt`

Keep Norwegian `SYSTEM_PROMPT` as the canonical body. In `buildAgentSystemPrompt`, prepend a hard meta-instruction that adapts to `PilarDisplayLanguage`:

For English contexts:
```
ROLE IDENTITY OVERRIDE
You are Engineer A (Konstruktør A in the Norwegian source instructions below).
The instructions that follow are in Norwegian — follow them precisely, but
ALL OUTPUT must be in English. Translate "Konstruktør A" → "Engineer A",
"Konstruktør B" → "Engineer B", "Samanliknar" → "Comparator",
"Kontrollør" → "Controller", "Rapportør" → "Reporter", "Tolkar" → "Input Agent".
Never use Norwegian role labels in your output.
```

For Norwegian contexts: no preamble (current behaviour).

**Pros:** minimal change (one helper function), single source of truth for the long prompt body, easy to revert, easy to add a third language. Builds directly on existing `buildAgentSystemPrompt` infrastructure.
**Cons:** relies on LLM honoring the meta-instruction; harder to verify than per-language prompts; the "translate these terms" list is hand-maintained.

### Option D — Post-process the output

Don't touch prompts. Run a string-replace on agent output to swap Norwegian role labels for English ones before storing/rendering.

**Pros:** zero prompt risk.
**Cons:** brittle; only catches the exact strings we list; cannot fix Norwegian phrases the LLM generated based on a Norwegian-role mental model; doesn't fix the eval-leak (the test checks the agent output, which is what gets post-processed); fundamentally treating a symptom.

---

## 4. Recommendation

**Adopt Option C as the first iteration. Escalate to Option B only if measured eval leakage persists.**

### Why C first

- Smallest possible change that addresses the root cause (the model's instructions about its role identity).
- Builds on `buildAgentSystemPrompt`, which already inspects context to decide what to inject. The preamble is one more conditional block.
- Single source of truth for the prompt body. We do not double the maintenance burden until we have evidence that we need to.
- Reversible. If C proves insufficient, B is a straightforward escalation: the per-language variants can be added incrementally per agent.

### Why B is the fallback, not the default

B (per-language prompt files) is what big LLM products eventually do for their core prompts. PILAR may end up there. But going to B *first* commits us to maintaining 6×N language variants of dense engineering prompts. Each merge of a prompt change must update all variants — easy to forget, easy to drift. We should pay that cost only when C demonstrably fails.

### Why A and D are rejected

A (bilingual identity in single prompt) is a half-measure that still relies on the model picking the right language without an explicit instruction. D (output post-processing) treats the symptom, not the cause, and would be eval-gameable in ways that hide real leakage.

---

## 5. Implementation sprint sequence

All read-only/code-only; no DB changes; no migration.

### 65.9 — Add English `PilarDisplayLanguage` preamble to `buildAgentSystemPrompt`

**Scope:** [lib/engineering-context/agent.ts](../../lib/engineering-context/agent.ts) only.

- Resolve `PilarDisplayLanguage` from `context` using existing helpers (`displayLanguageForContext` or similar from `lib/international/display.ts`).
- When language ≠ "nb"/"nn", prepend the role-identity-override block described in Option C §3.
- The block must explicitly list the agent role translations and instruct "all output in {language}".
- Do not change call sites — every route already calls `buildAgentSystemPrompt(SYSTEM_PROMPT, locale, engineeringContext)`. The preamble is invisible to them.

**Verification:** existing eval case `pilar_eval_aisc_simple_beam_en_005` should pass more reliably. Run it manually after the change and capture before/after Norwegian-label leak rate.

**Risk:** preamble lengthens prompts by ~200 tokens. Cost impact: minor (one-time, cached if `cache_control: ephemeral` covers it; need to verify caching includes the preamble).

### 65.10 — Per-agent preamble specialisation if needed

**Scope:** only if 65.9 leaves measurable leakage.

Each agent has slightly different output shape (Konstruktør produces structured calc, Rapportør produces prose, etc.). The translation rules may need agent-specific tuning — e.g. Rapportør needs stronger "all prose in English including section labels" instruction; Konstruktør needs "structured_output JSON keys stay as-is".

Implement only on evidence. Defer until we have eval data from 65.9.

### 65.11 — `Locale` type extension (only if we ever decide English UI locale)

Currently `Locale = "nb" | "nn"`. `PilarDisplayLanguage = Locale | "en"`. The split is deliberate — UI locale and content language are different concepts.

If product direction ever extends UI locale to include English, that is its own sprint with its own scope (translating `lib/format.ts` labels, etc.). Not in scope for the locale-aware-prompts track.

### 65.12 — Eval case for prompt leakage

**Scope:** add 1–2 cases to [qa/evals/pilar-core-evals.jsonl](../../qa/evals/pilar-core-evals.jsonl) specifically targeting the leakage mode this plan addresses. Target English-language input with assertion `must_not_include: ["Konstruktør", "Samanliknar", "Kontrollør", "Rapportør", "Tolkar"]` across all of Rapportør's prose fields.

This is the regression gate that protects 65.9 over time.

---

## 6. What this plan explicitly does NOT do

- **No translation of `SYSTEM_PROMPT` bodies.** They stay Norwegian. The model reads Norwegian and outputs in the requested language. Translating the bodies multiplies maintenance and risks losing domain-specific nuance.
- **No post-processing of agent output.** If the model emits a Norwegian role label, the eval should catch it and we fix the prompt, not the output.
- **No new third-party translation dependency.** All decisions are about how we write our own prompt strings.
- **No change to `lib/locale.ts` `Locale` type.** UI locale and content language stay separate concepts.
- **No change to the agent route files in this sprint.** All the work is concentrated in `buildAgentSystemPrompt`.

---

## 7. Open questions parked

These do not block 65.9 but should be addressed when the data is available:

1. **Does Anthropic's prompt caching include the preamble?** If `cache_control: ephemeral` is on the system block, the preamble inside it should cache. Verify after 65.9 lands by checking `cache_read_tokens` in `step_metrics`.
2. **Does the LLM correctly follow "translate these specific role labels"?** Spot-check after 65.9 by reading Rapportør prose on 3-5 English-context runs.
3. **What about French/German user prompts?** `engineeringContextUserMessageBlock` already says "answer in the same language as the user's prompt". Whether the preamble should be tri-/quad-lingual depends on whether we add `de`/`fr` to `PilarDisplayLanguage` (currently not). Defer.
4. **Should the preamble be in the language it requests output in?** E.g. for English context, write the preamble in English ("You are Engineer A..."). Probably yes — increases the chance the model continues in English. The current `buildAgentSystemPrompt` already does this for the notation hint block.

---

## 8. Keeping this plan honest

- If 65.9 lands without a measured before/after leak rate, the plan is being applied blind — re-open §5.
- If a sprint reaches into Option B before C has demonstrably failed, this plan has been bypassed.
- If 6×N per-language prompt files appear under `app/api/agent-*/route.ts`, this plan has been bypassed.
- If a new agent route is added, this plan applies to it automatically — the preamble lives in `buildAgentSystemPrompt`, not per route.
