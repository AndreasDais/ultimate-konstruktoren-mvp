# Research topic: AI-agent testing for PILAR

**Topic ID:** `ai-agent-testing`  
**Status:** Seed topic for Research Agent v0.1  
**Priority:** P0  
**Recommendation:** Build  
**Owner:** PILAR Research Agent  

---

## 1. Research question

Kva kan PILAR lære av AI-testagentar og QA-agentar som testar webappar, agent-pipelines og rapportflytar?

---

## 2. External signal

AI-native produkt treng ikkje berre ein smart hovudagent. Dei treng testagentar, evals, synthetic users, observability og guardrails rundt hovudagenten.

Relevante mønster:

- AI-agentar som testar webapps som ekte brukarar.
- Plain-English eller scenario-baserte E2E-testar.
- Visuell og tekstleg regresjonstest av UI og rapportar.
- Agent-traces og evals som fangar silent failures.
- Guardrails som blokkerer farleg output før brukaren ser det.

---

## 3. External sources to inspect

- YC Requests for Startups: https://www.ycombinator.com/rfs
- Docket: https://www.ycombinator.com/companies/docket
- Spur: https://www.ycombinator.com/companies/spur
- Momentic: https://www.ycombinator.com/companies/momentic
- Anthropic, Building Effective Agents: https://www.anthropic.com/research/building-effective-agents
- OpenAI, New tools for building agents: https://openai.com/index/new-tools-for-building-agents/
- LangChain / LangSmith observability: https://www.langchain.com/langsmith/observability

---

## 4. PILAR problem mapping

PILAR har ein multi-agent pipeline:

```txt
Input Agent -> Engineer A -> Engineer B -> Comparator -> Controller -> Reporter
```

Dei mest relevante risikoane er:

- Resultat kan sjå riktige ut sjølv om einingar, standard eller antakingar er feil.
- Gamle database-runs kan forvekslast med nye promptendringar.
- Resultatside, fullrapport, Word og PDF kan vise ulike labels eller ulik struktur.
- AISC/ASCE experimental mode kan gi falsk tryggleik dersom agenten finn på seksjonseigenskapar.
- Manuell testing blir lett gløymd før deploy.

---

## 5. Proposed agent

**Name:** PILAR Synthetic User Agent  
**Priority:** P0  
**Rights:** Read-only/test-only in v0.1  
**First implementation:** Checklist + deterministic testpromptar + later Playwright runner  

---

## 6. MVP scope

- Test norsk Eurokode simple beam prompt.
- Test English/AISC simple beam prompt.
- Opne resultatside.
- Opne fullrapport.
- Sjekke at PDF/Word-knappar finst.
- Søkje etter forbodne labels/terms i output.
- Lagre run-id, dato, promptversjon og fail-reason.

---

## 7. Data to log later

- `run_id`
- `test_case_id`
- `display_language`
- `standard_profile`
- `prompt_versions`
- `route_status`
- `report_page_status`
- `pdf_status`
- `word_status`
- `forbidden_string_hits`
- `manual_review_required`

---

## 8. Eval criteria

- Flow completes without runtime error.
- English/AISC shell labels stay English.
- Norwegian mode remains Norwegian.
- No final code-compliance claim without sufficient verified data.
- No invented AISC section properties.
- Fullrapport and download routes do not crash.

---

## 9. Recommended next sprint

```txt
Sprint 34.7 — Synthetic User runner v0.1
Mål:
  Add deterministic runner/checklist-to-result workflow for one known prompt pair.
Omfang:
  Add script only. No app-code changes.
Filer:
  scripts/run-synthetic-user-checklist.mjs
  qa/e2e/results/.gitkeep
Risiko:
  Low-medium. Browser automation can be flaky; keep v0.1 deterministic/manual.
Test:
  node scripts/run-synthetic-user-checklist.mjs --dry-run
Rollback:
  git checkout -- scripts/run-synthetic-user-checklist.mjs qa/e2e/results/.gitkeep
```
