# Agent Opportunity Memo

**Memo ID:**
**Dato:**
**Tema:**
**Priority:** P0 / P1 / P2 / NO_BUILD
**Recommendation:** Build / Defer / Reject
**Status:** Draft / Reviewed / Accepted / Rejected

---

## 1. External signal

Kva skjer i marknaden, i YC/startup-landskapet, i AI-agent-infrastruktur eller i bygg-/engineering-AI?

Skil mellom:

- **Fakta:** sett direkte i kjelde.
- **Tolking:** PILAR-relevant slutning.
- **Usikkerheit:** uklart, ikkje verifisert eller svakt datagrunnlag.

---

## 2. Sources

- Source 1:
- Source 2:
- Source 3:

Kvar kjelde bør ha kort kommentar om kvifor ho er relevant.

---

## 3. Pattern

Kva agentmønster er dette?

Døme:

```txt
AI QA agent
LLM eval agent
observability/tracing agent
guardrail/pre-action validation agent
release gate agent
research/scouting agent
company brain / knowledge agent
```

---

## 4. PILAR problem mapping

Kva konkret PILAR-problem løyser dette?

Døme:

```txt
- svak regressjonstest av rapport-output
- i18n-lekkasje mellom norsk og English/AISC
- for lite logging av agentavvik
- uklare feilårsaker i agentpipeline
- risiko for for sterke godkjenningskonklusjonar
```

---

## 5. Proposed agent

**Namn:**
**Rolle:**
**Input:**
**Output:**
**Køyringspunkt:**
**Kode-rettigheiter:** Read-only / Suggest-only / PR-only / Human-approved write

---

## 6. MVP scope

- [ ]
- [ ]
- [ ]

MVP skal vere smalt, testbart og trygt. Start helst read-only.

---

## 7. Data to log

-
-
-

Døme:

```txt
run_id
agent_version
prompt_version
display_language
standard_profile
failure_flags
eval_score
human_review_status
```

---

## 8. Eval criteria

-
-
-

Døme:

```txt
- agenten produserer strukturert JSON
- agenten skil fakta frå tolking
- agenten foreslår testbare akseptkriterium
- agenten endrar ikkje kode direkte
```

---

## 9. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| | | |

---

## 10. Sprint suggestion

```txt
Sprint XX.Y — namn
Mål:
Omfang:
Filer:
Risiko:
Test:
Rollback:
```

---

## 11. Human-review requirement

Kva må menneske godkjenne før dette kan bli kode, schema eller produksjonsendring?

---

## 12. Final recommendation

Build / Defer / Reject.

Grunngjeving:

```txt
...
```
