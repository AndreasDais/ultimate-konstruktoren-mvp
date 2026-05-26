# PILAR Agent Ecosystem Strategy

**Fil:** `PILAR_AGENT_ECOSYSTEM_STRATEGY.md`
**Status:** Strategy source / implementation reference
**Dato:** 2026-05-25
**Språk:** Norsk / nynorsk-blanding etter PILAR-prosjektstil
**Formål:** Dokumentere agent-økosystemet som skal løfte PILAR frå ein berekningspipeline til eit sjølvforbetrande, testbart og revisjonsklart AI-produkt.

---

## 0. Kjerneidé

PILAR skal ikkje berre vere ein AI-konstruksjonsassistent.

PILAR bør byggjast som eit **agent-økosystem**:

```txt
PILAR Core      = faglege berekningsagentar
PILAR QA        = test, eval, observability, guardrails
PILAR Brain     = strukturert læring frå kvar run, feil og retting
PILAR Research  = ekstern scanning av teknologi, konkurrentar og standardar
PILAR Release   = trygg patching, regressjonstest og produksjonskontroll
```

Den viktigaste retninga frå AI-startups og YC-landskapet er ikkje berre “fleire agentar”.
Retninga er:

> Bygg lukka feedback-loops der kvar brukerøkt, feil, trace, retting, fagpersonvurdering og rapport blir strukturert data som gjer neste run betre.

---

## 1. Eksterne signal frå marknaden

### 1.1 YC-retning

YC sin Requests for Startups-side for Summer 2026 seier at AI har gått frå å vere ein feature til å bli sjølve fundamentet for nye selskap. Dei peikar særleg på software, services, silicon og fysisk verd som område som blir bygd om rundt AI.

Relevans for PILAR:

- PILAR bør ikkje sjå AI som ein “chatbot i ein app”.
- PILAR bør byggje datalag, kontrollag og agentlag frå starten.
- PILAR bør designe systemet slik at agentar seinare kan bruke API, CLI, MCP eller interne verktøy direkte.

Kjelde:

- YC Requests for Startups: https://www.ycombinator.com/rfs

---

### 1.2 AI-testagentar

Fleire YC-startups byggjer agentar som testar webapps på same måte som ekte brukarar:

| Startup | Kva dei byggjer | Relevans for PILAR |
|---|---|---|
| Docket | AI-agentar for web testing. Plain-English E2E-testar som blir halde oppdaterte med ekte brukarsesjonar. | PILAR treng agentar som testar input → run → resultat → fullrapport → PDF/Word. |
| Spur | AI QA Engineer. Web-agentar som mimar ekte brukarflow med naturleg språk. | PILAR treng syntetiske brukarar som kan køyre kjerneflowane dagleg. |
| Momentic | AI-native automated testing med elementfinding, assertions, visual comparisons og generering av test case. | PILAR treng både UI-test, visuell rapporttest og regression checks. |

Kjelder:

- Docket: https://www.ycombinator.com/companies/docket
- Spur: https://www.ycombinator.com/companies/spur
- Momentic: https://www.ycombinator.com/companies/momentic

---

### 1.3 Agent observability og evals

AI-agentar feilar ikkje alltid som vanleg programvare. Dei kan “sjå ut som dei fungerte”, men likevel gi feil svar, feil konklusjon eller feil handling. Derfor byggjer fleire selskap observability-lag for traces, tool calls, reasoning, evals og silent failures.

| Startup / verktøy | Kva dei byggjer | Relevans for PILAR |
|---|---|---|
| The Context Company | Analyserer AI-agent-samtalar for user patterns, silent failures, performance trends, traces, tool calls, latency og cost. | PILAR bør analysere alle runs for mønster: kva feilar, når og kvifor? |
| Laminar | Open-source observability for AI agents. Trace komplekse workflows, replay og debug agent-runs. | PILAR bør kunne replaye kvar agent-run og sjå A/B/comparator/controller-steg. |
| Confident AI | LLM eval + observability-plattform med metrics, guardrails og DeepEval. | PILAR bør ha eige benchmarksett og eval-metrics for byggfaglege svar. |
| LangChain / LangSmith | Agent observability, tracing, evals og produksjonsmonitorering. | PILAR bør logge traces, eval-nivå og feilklassar, ikkje berre tekstoutput. |

Kjelder:

- The Context Company: https://www.ycombinator.com/companies/the-context-company
- Laminar: https://www.ycombinator.com/companies/laminar
- Confident AI: https://www.ycombinator.com/companies/confident-ai
- LangChain agent observability: https://www.langchain.com/blog/agent-observability-powers-agent-evaluation
- LangSmith observability: https://www.langchain.com/langsmith/observability

---

### 1.4 Guardrail-agentar

Guardrails bør ikkje berre vere output-polering etterpå. For kritiske system bør ein validere handlingar **før** dei blir utførte.

Salus er eit YC-eksempel på eit API som wrappar rundt agentar og validerer handlingar ved runtime før dei får skje.

Relevans for PILAR:

- Ein rapport bør ikkje få “godkjent”-språk dersom inputen er mangelfull.
- Ein AISC-run bør ikkje finne på AISC-tabellverdiar.
- Ein Eurokode-run bør ikkje blande inn US-load combinations.
- Ein agent bør ikkje kunne endre prompt/kode direkte utan patch-protokoll og menneskeleg review.

Kjelde:

- Salus: https://www.ycombinator.com/companies/salus

---

### 1.5 Effektive agentmønster

Anthropic anbefaler å starte med enkle workflows og berre auke agentisk kompleksitet når enklare løysingar ikkje held. Dei trekkjer fram mønster som:

- prompt chaining
- routing
- parallelization
- orchestrator-workers
- evaluator-optimizer

Relevans for PILAR:

- PILAR sin A/B-agentstruktur er allereie eit parallelization/evaluator-mønster.
- Comparator og Controller bør sjåast som evaluator/optimizer-lag.
- Sjølvforbetring må vere eval-basert, ikkje berre prompt-gjetting.

Kjelde:

- Anthropic, Building Effective Agents: https://www.anthropic.com/research/building-effective-agents

---

### 1.6 Moderne agentverktøy

OpenAI sine agentverktøy legg vekt på:

- built-in tools
- web search
- file search
- computer use
- tracing
- Agents SDK
- Responses API

Relevans for PILAR:

- PILAR Research Agent bør kunne søkje web og lese filer.
- PILAR QA Agent bør kunne inspisere rapportar, docs og logs.
- PILAR Synthetic User Agent bør etter kvart kunne bruke browser/computer-use-liknande flows.
- PILAR må ha tracing og evals som del av produksjonsarkitekturen.

Kjelde:

- OpenAI, New tools for building agents: https://openai.com/index/new-tools-for-building-agents/

---

## 2. Interne PILAR-prinsipp som må respekterast

Dette dokumentet byggjer vidare på eksisterande PILAR-safety-docs:

- `PILAR_SPRINT_PATCH_PROTOCOL.md`
- `PILAR_PATCH_SAFETY_SKILL.md`
- `PILAR_I18N_SAFETY_SKILL.md`
- `PILAR_DEBUGGING_ERROR_HANDLING_SKILL.md`

Desse reglane er styrande:

```txt
1. Stabilitet først.
2. Små kirurgiske endringar slår store automatiske replace-script.
3. Ingen ny sprint før tsc/build er grøn.
4. Agentprompt-endringar må testast med ny run, ikkje gammal database-output.
5. Norsk modus må ikkje øydeleggjast av English/AISC-fiksar.
6. AISC/ASCE experimental mode må ikkje finne på tabellverdiar.
7. Patch-agentar skal ikkje få direkte produksjonsmakt utan human review.
```

---

## 3. Agent-økosystem for PILAR

### 3.1 Overordna arkitektur

```txt
                         ┌─────────────────────────┐
                         │   PILAR Research Agent   │
                         │  market / YC / standards │
                         └───────────┬─────────────┘
                                     │
                                     ▼
┌──────────────┐   ┌─────────────────────────┐   ┌───────────────────────┐
│ User / input │ → │ PILAR Core Pipeline      │ → │ Result / Report / API  │
└──────────────┘   │ Input → A/B → C → D → E  │   └───────────┬───────────┘
                   └───────────┬─────────────┘               │
                               │                             ▼
                               │                 ┌─────────────────────────┐
                               │                 │ Report QA / Guardrails  │
                               │                 └───────────┬─────────────┘
                               ▼                             │
                   ┌─────────────────────────┐               ▼
                   │ Observability / Traces  │ → ┌─────────────────────────┐
                   └───────────┬─────────────┘   │ Eval Agent / Test Cases │
                               │                 └───────────┬─────────────┘
                               ▼                             │
                   ┌─────────────────────────┐               ▼
                   │ PILAR Brain / Dataset   │ ← ┌─────────────────────────┐
                   │ errors, fixes, reviews  │   │ Prompt/Patch Suggestions│
                   └─────────────────────────┘   └─────────────────────────┘
```

---

## 4. Prioritert agent-roadmap

## P0 — bygg først

---

### Agent 1: PILAR Research & Agent Strategy Agent

**Status:** P0
**Risiko:** låg dersom read-only
**Kode-rettigheiter:** ingen i v0.1
**Mål:** Finne, vurdere og prioritere agentar som kan styrke PILAR.

#### Ansvar

Research-agenten skal:

1. søkje etter nye AI-agentmønster
2. følgje YC, AI-infrastruktur, bygg-AI, eval-verktøy og standardrelatert AI
3. samanlikne funn med PILAR sine problem
4. lage Agent Opportunity Memo
5. foreslå P0/P1/P2-prioritet
6. foreslå MVP-scope
7. foreslå eval-kriterium
8. aldri endre kode direkte

#### Input

```json
{
  "research_topic": "AI agents for QA testing in YC startups",
  "pilar_context": {
    "product": "AI structural engineering assistant",
    "current_pipeline": ["input", "engineer_a", "engineer_b", "comparator", "controller", "reporter"],
    "known_risks": ["hallucinated engineering values", "i18n drift", "PDF/Word mismatch", "weak evals"]
  },
  "constraints": [
    "must preserve Norwegian mode",
    "must not invent code values",
    "must follow sprint patch protocol"
  ]
}
```

#### Output: Agent Opportunity Memo

```json
{
  "memo_id": "agent-opportunity-YYYYMMDD-topic",
  "title": "Synthetic User Agent for PILAR",
  "external_signal": {
    "companies": ["Docket", "Spur", "Momentic"],
    "pattern": "AI agents that test web applications like real users",
    "sources": ["https://www.ycombinator.com/companies/docket"]
  },
  "pilar_problem": "PILAR needs regression testing across input, result page, full report, PDF and Word output.",
  "recommended_agent": {
    "name": "PILAR Synthetic User Agent",
    "priority": "P0",
    "mvp_scope": [
      "Run one known steel beam prompt",
      "Open result page",
      "Open full report",
      "Check PDF/Word buttons",
      "Search output for known forbidden strings"
    ]
  },
  "data_to_log": [
    "run_id",
    "prompt_version",
    "route_status",
    "report_render_status",
    "pdf_status",
    "word_status",
    "forbidden_string_hits"
  ],
  "eval_criteria": [
    "Flow completes without runtime error",
    "No old Norwegian labels in English/AISC context",
    "Report contains disclaimer",
    "No invented AISC table values"
  ],
  "risk": "Medium: browser automation may be flaky unless scoped tightly.",
  "recommendation": "Build MVP next sprint."
}
```

#### Første MVP

```txt
sources/agent-research/topics/ai-agent-testing.md
sources/agent-research/memos/
scripts/research-agent-runner.ts eller manuell ChatGPT/Codex-run i starten
```

#### Akseptkriterium

- Produserer strukturert memo i JSON + Markdown.
- Har kjelder.
- Foreslår konkret sprint.
- Endrar ikkje kode.
- Merkar usikkerheit tydeleg.
- Kan køyrast manuelt kvar veke.

---

### Agent 2: PILAR Eval Agent

**Status:** P0
**Risiko:** medium
**Mål:** Gjere PILAR målbar.

#### Ansvar

Eval-agenten skal byggje og vedlikehalde testsett frå:

- tidlegare runs
- kjende feil
- brukarfeedback
- fagpersonvurderingar
- internasjonal/AISC-regresjonstestar
- norske Eurokode-regresjonstestar

#### Eval-case format

```json
{
  "case_id": "steel_beam_eurocode_simple_001",
  "domain": "steel",
  "standard_context": "NS-EN 1993 / Eurocode 3",
  "language": "nn",
  "input": "Eg har ein fritt opplagd stålbjelke...",
  "expected": {
    "must_include": ["maksimalt bøyemoment", "skjærkraft", "qEd"],
    "must_not_include": ["AISC", "ASCE", "kip", "ft"],
    "unit_expectations": ["kN/m", "kNm", "kN"],
    "required_warning_if_missing": ["profildata", "full kapasitetskontroll"]
  },
  "grader": {
    "type": "llm_plus_rules",
    "pass_threshold": 0.85
  },
  "manual_review_required": true
}
```

#### Første MVP

Lag `qa/evals/pilar-core-evals.jsonl` med 10 testcases:

1. enkel norsk bjelke
2. norsk stål med manglande profildata
3. norsk betong med armering
4. irrelevant input, f.eks. fotballbilde
5. AISC English simple beam
6. AISC missing section properties
7. i18n English must-not list
8. PDF/Word report rendering sanity
9. gamle database-output skal ikkje brukast som bevis
10. manglande input må gi avvist/delvis_klar

#### Akseptkriterium

- Kan køyrast lokalt.
- Gir pass/fail per case.
- Lagrar eval-score.
- Skil mellom regelbasert fail og LLM-vurdert fail.
- Blokkerer ikkje deploy automatisk i starten, men rapporterer risiko.

---

### Agent 3: PILAR Synthetic User Agent

**Status:** P0
**Risiko:** medium
**Mål:** Teste produktet slik ein ekte brukar gjer.

#### Ansvar

Syntetisk brukar skal:

1. opne PILAR
2. lime inn testprompt
3. eventuelt laste opp fil
4. starte run
5. vente på resultat
6. opne resultatside
7. opne fullrapport
8. laste ned/sjekke PDF og Word
9. sjekke kjende feilstrengar
10. skrive bug report

#### Testflyt v0.1

```txt
Flow: English/AISC regression
Input: AISC simple steel beam prompt
Expected:
- output in English
- no "Konstruktør"
- no "GOD"
- no Eurocode notation
- no invented AISC table values
- report page opens
- PDF/Word buttons exist
```

#### Første MVP-teknologi

Vel éin:

```txt
Option A: Playwright script
Option B: Browser-use / computer-use-style agent seinare
Option C: Manuell test-run med standard checklist først
```

Anbefaling: start med Playwright + deterministic checks. Legg agentisk tolking etterpå.

#### Akseptkriterium

- Testar minst éin happy path.
- Lagrar skjermbilde ved fail.
- Lagrar URL/run_id.
- Lagrar report render status.
- Kan køyrast før deploy.

---

## P1 — bygg etter P0

---

### Agent 4: PILAR Observability Agent

**Status:** P1
**Mål:** Finne mønster i agent-runs, ikkje berre tekniske errors.

#### Kva skal loggast?

```json
{
  "run_id": "uuid",
  "created_at": "timestamp",
  "input_quality_status": "klar|delvis_klar|mangelfull|avvist",
  "domain": "steel|concrete|timber|loads|unknown",
  "standard_context": "eurocode|aisc|unknown",
  "display_language": "nb|nn|en",
  "agent_versions": {
    "input_agent": "v0.x",
    "engineer_a": "v0.x",
    "engineer_b": "v0.x",
    "comparator": "v0.x",
    "controller": "v0.x",
    "reporter": "v0.x"
  },
  "scores": {
    "input_quality": 0.0,
    "agent_agreement": 0.0,
    "unit_consistency": 0.0,
    "report_quality": 0.0,
    "hallucination_risk": 0.0,
    "trust_score": 0.0
  },
  "flags": [
    "missing_section_properties",
    "mixed_standard_context",
    "strong_conclusion_without_evidence"
  ],
  "artifacts": {
    "result_page": true,
    "full_report": true,
    "pdf": true,
    "docx": true
  }
}
```

#### Observability views

```txt
- Top 10 failing prompt types
- Most common missing inputs
- Most common i18n leaks
- Agent disagreement rate
- Controller override rate
- Report rendering failure rate
- PDF/Word mismatch rate
- Token/cost by agent
- Prompt version comparison
```

---

### Agent 5: PILAR Guardrail Agent

**Status:** P1
**Mål:** Stoppe eller merke farlege output før brukaren ser dei.

#### Guardrail-reglar v0.1

```txt
BLOCK if:
- input is irrelevant
- no structural engineering domain detected
- report claims final approval without enough data
- AISC mode invents section properties
- Eurocode and AISC are mixed
- units are inconsistent and not acknowledged
- missing assumptions are hidden
- no disclaimer in preliminary output

WARN if:
- profile properties are missing
- LTB/bracing issue likely but not fully checked
- user requested final compliance
- output has low agreement between engineer A and B
```

#### Output

```json
{
  "guardrail_status": "pass|warn|block",
  "reason_codes": [
    "missing_verified_section_properties",
    "conclusion_too_strong"
  ],
  "user_message": "Resultatet er berre førebels fordi profildata manglar.",
  "developer_message": "Agent attempted capacity conclusion without verified section properties.",
  "allowed_next_step": "show_preliminary_with_warning"
}
```

---

### Agent 6: PILAR Report QA Agent

**Status:** P1
**Mål:** Kontrollere ferdig rapport som om ein sensor/kontrollør les den.

#### Sjekklar

```txt
- Svarar rapporten på oppgåva?
- Er alle antakingar eksplisitte?
- Er formlar, einingar og symbol konsistente?
- Er konklusjonen for sterk?
- Er standard og språk konsekvent?
- Er tabellar og verdiar sporbare?
- Er warnings synlege?
- Er PDF/Word lik webrapport?
```

#### Report QA score

```json
{
  "report_quality_score": 0.82,
  "issues": [
    {
      "severity": "warn",
      "category": "assumption_traceability",
      "message": "LTB warning is present, but missing explicit bracing assumption in final conclusion."
    }
  ],
  "recommendation": "show_with_warning"
}
```

---

### Agent 7: PILAR Release Manager Agent

**Status:** P1
**Mål:** Sikre at ingen sprint blir rekna som ferdig før testane faktisk er grøne.

#### Release gate

```txt
Required before merge/deploy:
1. npx tsc --noEmit --pretty false
2. npm run debug:sweep
3. npm run build
4. relevant runtime test
5. relevant eval cases
6. if prompt/report output changed: new run, not old DB output
7. if i18n changed: English/AISC + Norwegian regression
```

#### Viktig

Release Manager Agent skal ikkje pushe til prod sjølv i starten. Den skal produsere:

```txt
RELEASE READY
RELEASE BLOCKED
RELEASE RISKY
```

med grunngjeving.

---

### Agent 8: PILAR Patch Planner Agent

**Status:** P1
**Mål:** Lage trygge sprintar og patch-planar.

#### Må følge eksisterande patch protocol

Patch Planner skal alltid svare med:

```txt
Sprint XX.Y — kort namn
Mål:
Omfang:
Filer:
Risiko:
Test:
Rollback:
```

#### Forbod

```txt
- ingen brei global replace i TSX
- ikkje bland UI + agentprompt + PDF + Word i same sprint
- ikkje patch utan filkontekst
- ikkje lag ny sprint dersom tsc feilar
```

---

## P2 — bygg seinare

---

### Agent 9: PILAR Prompt Optimizer Agent

**Status:** P2
**Mål:** Foreslå promptforbetringar basert på evals og feil.

#### Viktig prinsipp

Prompt Optimizer skal ikkje automatisk endre produksjonsprompts.

Riktig loop:

```txt
eval failure → root cause → prompt proposal → test branch → eval rerun → human review → merge
```

#### Output

```json
{
  "prompt_version_current": "agent_d_v0.4",
  "failure_cluster": "Controller conclusion too strong when data is missing",
  "evidence": ["eval_case_004", "eval_case_009"],
  "proposed_change": "Add explicit rule: never mark as approved if section properties are missing.",
  "expected_effect": "Lower false approval risk.",
  "risk": "May increase warnings / reduce confident outputs.",
  "requires_human_review": true
}
```

---

### Agent 10: PILAR Knowledge Brain Agent

**Status:** P2
**Mål:** Gjere PILAR sin læring permanent.

#### Kva skal inn i PILAR Brain?

```txt
- kjende feil
- godkjende løysingsmønster
- standardtolkingar
- brukarrettingar
- fagpersonvurderingar
- promptversjonar
- rapportmal-endringar
- eval-case historikk
- rollback-historikk
- avgjerder frå Controller
```

#### Kvifor dette er moat

Modellen kan bytast ut. PILAR sin verdi blir:

```txt
1. domenespesifikk feilhistorikk
2. strukturerte evals
3. fagpersonvurderte runs
4. dokumentert kontrollhistorikk
5. sporbar avgjerdslogg
```

---

### Agent 11: Standards Monitor Agent

**Status:** P2
**Mål:** Følgje med på endringar i standardar, kodeverk og relevante engineering-kjelder.

#### Viktig

Denne agenten skal ikkje tolke betalte standardar frå minne eller gi oppdikta paragrafar. Den skal berre:

```txt
- flagge at noko kan ha endra seg
- lenke til offisielle kjelder
- krevje verifisert input før konkrete code checks
```

---

## 5. Foreslått Supabase-/datamodell

Dette er ikkje endeleg schema, men eit godt første datagrunnlag.

### 5.1 `agent_research_memos`

```sql
create table agent_research_memos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  topic text not null,
  title text not null,
  priority text not null check (priority in ('P0', 'P1', 'P2', 'NO_BUILD')),
  external_sources jsonb not null default '[]',
  pilar_problem text not null,
  recommended_agent jsonb not null,
  data_to_log jsonb not null default '[]',
  eval_criteria jsonb not null default '[]',
  risks jsonb not null default '[]',
  recommendation text not null,
  status text not null default 'proposed'
);
```

---

### 5.2 `eval_cases`

```sql
create table eval_cases (
  id uuid primary key default gen_random_uuid(),
  case_id text unique not null,
  created_at timestamptz not null default now(),
  domain text not null,
  standard_context text not null,
  display_language text not null,
  input_text text not null,
  expected jsonb not null,
  grader jsonb not null,
  manual_review_required boolean not null default true,
  active boolean not null default true
);
```

---

### 5.3 `eval_runs`

```sql
create table eval_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  eval_case_id uuid references eval_cases(id),
  pilar_run_id uuid,
  prompt_versions jsonb not null default '{}',
  score numeric,
  passed boolean,
  failures jsonb not null default '[]',
  raw_result jsonb
);
```

---

### 5.4 `agent_observability_events`

```sql
create table agent_observability_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null,
  agent_name text not null,
  agent_version text,
  event_type text not null,
  severity text not null default 'info',
  trace jsonb not null default '{}',
  metrics jsonb not null default '{}',
  flags jsonb not null default '[]'
);
```

---

### 5.5 `guardrail_decisions`

```sql
create table guardrail_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null,
  guardrail_version text not null,
  status text not null check (status in ('pass', 'warn', 'block')),
  reason_codes jsonb not null default '[]',
  user_message text,
  developer_message text,
  allowed_next_step text,
  raw_decision jsonb
);
```

---

### 5.6 `human_reviews`

```sql
create table human_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  run_id uuid not null,
  reviewer_role text not null,
  review_status text not null check (review_status in ('approved', 'approved_with_warnings', 'rejected', 'needs_more_info')),
  corrections jsonb not null default '[]',
  notes text,
  can_be_used_for_training boolean not null default false
);
```

---

## 6. Første sprintforslag

### Sprint 34.0 — Agent ecosystem source document

**Mål:** Leggje dette dokumentet inn i repo som styringsdokument.

**Omfang:**

```txt
Add only:
- sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md
```

**Filer:**

```txt
sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md
```

**Risiko:** låg

**Test:**

```bash
git diff -- sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md
```

**Rollback:**

```bash
git checkout -- sources/PILAR_AGENT_ECOSYSTEM_STRATEGY.md
```

---

### Sprint 34.1 — Research Agent memo format

**Mål:** Lage strukturert format for research-agenten.

**Omfang:**

```txt
Add:
- sources/agent-research/AGENT_OPPORTUNITY_MEMO_TEMPLATE.md
- sources/agent-research/topics/README.md
- sources/agent-research/memos/.gitkeep
```

**Risiko:** låg

**Test:**

```bash
git diff -- sources/agent-research
```

---

### Sprint 34.2 — Eval case seed set

**Mål:** Lage første eval-sett for PILAR.

**Omfang:**

```txt
Add:
- qa/evals/pilar-core-evals.jsonl
- qa/evals/README.md
```

**Risiko:** låg-medium

**Test:**

```bash
node scripts/validate-eval-cases.mjs
```

---

### Sprint 34.3 — Synthetic User checklist

**Mål:** Lage første manuelle/Playwright-klare E2E-checklist.

**Omfang:**

```txt
Add:
- qa/e2e/PILAR_SYNTHETIC_USER_CHECKLIST.md
- qa/e2e/prompts/english-aisc-simple-beam.txt
- qa/e2e/prompts/norwegian-simple-beam.txt
```

**Risiko:** låg

**Test:**

```bash
Manual run:
1. English/AISC prompt
2. Norwegian prompt
3. Open result page
4. Open full report
5. Check PDF/Word
```

---

### Sprint 34.4 — Observability event schema proposal

**Mål:** Lage schema-dokument før databaseendring.

**Omfang:**

```txt
Add:
- sources/database/PILAR_AGENT_OBSERVABILITY_SCHEMA.md
```

**Risiko:** låg

**Test:** dokumentreview

---

## 7. Research Agent systemprompt v0.1

```txt
You are PILAR Research & Agent Strategy Agent.

Your job is to research AI-agent patterns, YC startups, engineering AI tools, eval systems, observability systems, guardrail systems, and product automation ideas that could improve PILAR.

PILAR is an AI-based structural engineering product with a multi-agent calculation and reporting pipeline:
Input Agent → Engineer A → Engineer B → Comparator → Controller → Reporter.

You are read-only in v0.1.
You must not edit code.
You must not suggest broad source replacements.
You must respect PILAR patch safety:
- small scoped changes only
- no broad regex on TSX
- no new sprint if TypeScript/build is failing
- prompt/report changes require new runs
- Norwegian and English/AISC modes must both keep working

For every research task, produce an Agent Opportunity Memo with:

1. Title
2. External signal
3. Sources
4. What problem this solves generally
5. What exact PILAR problem it maps to
6. Proposed agent
7. Priority: P0 / P1 / P2 / NO_BUILD
8. MVP scope
9. Required data logging
10. Evaluation criteria
11. Risks
12. Recommended sprint
13. Human-review requirement
14. Final build/no-build recommendation

You must clearly separate facts from inference.
You must cite sources.
If evidence is weak, say so.
```

---

## 8. Agent Opportunity Memo template

```md
# Agent Opportunity Memo

**Memo ID:**
**Dato:**
**Tema:**
**Priority:** P0 / P1 / P2 / NO_BUILD
**Recommendation:** Build / Defer / Reject

---

## 1. External signal

Kva skjer i markedet?

## 2. Sources

- Source 1:
- Source 2:
- Source 3:

## 3. Pattern

Kva agentmønster er dette?

## 4. PILAR problem mapping

Kva konkret PILAR-problem løyser dette?

## 5. Proposed agent

**Namn:**
**Rolle:**
**Input:**
**Output:**
**Køyringspunkt:**
**Kode-rettigheiter:** Read-only / Suggest-only / PR-only / Human-approved write

## 6. MVP scope

- [ ]
- [ ]
- [ ]

## 7. Data to log

-
-
-

## 8. Eval criteria

-
-
-

## 9. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| | | |

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

## 11. Final recommendation

Build / Defer / Reject.
```

---

## 9. Beslutningsreglar for nye agentar

Ein ny agent bør berre byggjast dersom minst eitt av desse er sant:

```txt
1. Han reduserer risiko for feil fagleg output.
2. Han aukar testdekning eller eval-kvalitet.
3. Han gjer PILAR meir sporbar/revisjonsklar.
4. Han samlar data som blir nyttig for framtidig læring.
5. Han reduserer manuell debugging eller release-risiko.
6. Han forbetrar rapportkvalitet på ein målbar måte.
```

Ein ny agent bør ikkje byggjast dersom:

```txt
1. Han berre er “kul”, men ikkje målbar.
2. Han krev store kodeendringar utan evals.
3. Han får skrive-rettigheiter før read-only MVP er testa.
4. Han kan øydeleggje norsk/engelsk modus.
5. Han kan gi falsk tryggleik i byggfaglege vurderingar.
```

---

## 10. Human-in-the-loop policy

PILAR kan etter kvart få sjølvforbetrande agentar, men desse skal ikkje ha fri produksjonsmakt.

### Tillate i starten

```txt
- lese logs
- lage memos
- foreslå evals
- foreslå promptendringar
- foreslå patch-plan
- opne PR-forslag etter menneskeleg kommando
```

### Ikkje tillate i starten

```txt
- auto-merge
- auto-deploy
- endre produksjonsprompt utan review
- endre database schema utan review
- fjerne warnings/disclaimers
- markere fagleg output som endeleg godkjent
```

---

## 11. Neste konkrete steg

Anbefalt rekkefølgje:

```txt
1. Legg dette dokumentet i sources/
2. Lag Agent Opportunity Memo template
3. Lag første research memo om AI-testagentar
4. Lag første 10 eval cases
5. Lag Synthetic User checklist
6. Lag Observability schema proposal
7. Bygg Guardrail Agent v0.1
8. Først deretter vurder Prompt Optimizer
```

---

## 12. Kortversjon

PILAR bør byggje desse agentane i denne rekkefølgja:

```txt
P0:
1. Research & Agent Strategy Agent
2. Eval Agent
3. Synthetic User Agent

P1:
4. Observability Agent
5. Guardrail Agent
6. Report QA Agent
7. Release Manager Agent
8. Patch Planner Agent

P2:
9. Prompt Optimizer Agent
10. Knowledge Brain Agent
11. Standards Monitor Agent
```

Målet er ikkje flest mogleg agentar.

Målet er eit system der:

```txt
kvar run → blir observert
kvar feil → blir klassifisert
kvar retting → blir testa
kvar promptendring → blir evaluert
kvar rapport → blir kvalitetssjekka
kvar fagpersonvurdering → blir læringsdata
```

Det er dette som kan gjere PILAR robust over tid.

---

## 13. Kjelder

- YC Requests for Startups: https://www.ycombinator.com/rfs
- Docket, AI agents for web testing: https://www.ycombinator.com/companies/docket
- Spur, AI QA Engineer: https://www.ycombinator.com/companies/spur
- Momentic, AI-native automated testing: https://www.ycombinator.com/companies/momentic
- Salus, guardrails for agent actions: https://www.ycombinator.com/companies/salus
- The Context Company, agent conversation observability: https://www.ycombinator.com/companies/the-context-company
- Laminar, open-source AI agent observability: https://www.ycombinator.com/companies/laminar
- Confident AI, LLM eval and observability: https://www.ycombinator.com/companies/confident-ai
- Anthropic, Building Effective Agents: https://www.anthropic.com/research/building-effective-agents
- OpenAI, New tools for building agents: https://openai.com/index/new-tools-for-building-agents/
- LangChain, Agent observability powers agent evaluation: https://www.langchain.com/blog/agent-observability-powers-agent-evaluation
- LangSmith observability: https://www.langchain.com/langsmith/observability

---

## 14. Interne PILAR-referansar

- `PILAR_SPRINT_PATCH_PROTOCOL.md`
- `PILAR_PATCH_SAFETY_SKILL.md`
- `PILAR_I18N_SAFETY_SKILL.md`
- `PILAR_DEBUGGING_ERROR_HANDLING_SKILL.md`

