# PILAR Agent Observability Schema Proposal

**Fil:** `sources/database/PILAR_AGENT_OBSERVABILITY_SCHEMA.md`  
**Status:** Schema proposal / documentation only  
**Sprint:** 34.4  
**Formål:** Dokumentere første forslag til observability-datalag for PILAR-agentar før eventuell Supabase-migrasjon eller runtime-logging blir implementert.

---

## 1. Prinsipp

Dette dokumentet er **ikkje** ei database-migrasjon. Det er eit forslag som skal brukast til review før vi endrar Supabase-schema.

Observability-laget skal gjere det mogleg å forstå:

```txt
kva input kom inn
kva agentar køyrde
kva versjonar/promptar vart brukte
kva avgjerder vart tekne
kvar risiko vart oppdaga
kvar output vart blokkert, merka eller godkjend for visning
kva rapportartefaktar vart genererte
```

Målet er ikkje berre teknisk logging. Målet er **fagleg sporbarheit** for eit byggingeniørprodukt.

---

## 2. Kva observability må fange

PILAR bør logge på fem nivå:

| Nivå | Kva | Døme |
|---|---|---|
| Run | Overordna brukarøkt / berekningsløp | `run_id`, `created_at`, `standard_context`, `display_language` |
| Agent event | Kvar agent sitt steg | Input Agent, Engineer A, Engineer B, Comparator, Controller, Reporter |
| Quality signal | Skårar og flagg | input quality, agreement, hallucination risk, unit consistency |
| Guardrail decision | Pass/warn/block | missing data, mixed standards, conclusion too strong |
| Artifact status | Resultat og rapport | result page, full report, PDF, Word, calculation sheet |

---

## 3. Føreslått tabell: `agent_observability_events`

```sql
create table agent_observability_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  run_id uuid not null,
  request_id text,

  agent_name text not null,
  agent_version text,
  prompt_version text,

  event_type text not null,
  severity text not null default 'info',

  standard_context text,
  display_language text,
  answer_language text,

  input_summary jsonb not null default '{}',
  output_summary jsonb not null default '{}',
  metrics jsonb not null default '{}',
  flags jsonb not null default '[]',
  trace jsonb not null default '{}',

  error_message text,
  raw_event jsonb
);
```

### 3.1 `agent_name`

Tillatne verdiar bør på sikt normaliserast:

```txt
input_agent
engineer_a
engineer_b
comparator
controller
reporter
guardrail
report_qa
synthetic_user
eval_runner
```

### 3.2 `event_type`

Forslag:

```txt
started
completed
failed
blocked
warning
quality_signal
artifact_generated
artifact_failed
manual_review_added
eval_completed
```

### 3.3 `severity`

Forslag:

```txt
debug
info
warn
error
critical
```

---

## 4. Føreslått tabell: `guardrail_decisions`

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

### 4.1 Døme på `reason_codes`

```txt
irrelevant_input
missing_required_geometry
missing_verified_section_properties
mixed_standard_context
unit_inconsistency
conclusion_too_strong
invented_code_value_risk
pdf_render_failed
word_render_failed
old_database_output_used
```

---

## 5. Føreslått tabell: `artifact_status_events`

```sql
create table artifact_status_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  run_id uuid not null,
  artifact_type text not null,
  status text not null check (status in ('not_started', 'generated', 'failed', 'skipped')),

  route text,
  file_name text,
  error_message text,
  metadata jsonb not null default '{}'
);
```

### 5.1 `artifact_type`

```txt
result_view
full_report
calculation_sheet
pdf_report
word_report
pdf_calculation
word_calculation
```

---

## 6. Minimum event for MVP

Første MVP bør ikkje prøve å logge alt. Start med dette per run:

```json
{
  "run_id": "uuid",
  "agent_name": "controller",
  "event_type": "quality_signal",
  "severity": "info",
  "standard_context": "aisc_asce_aci_experimental",
  "display_language": "en",
  "metrics": {
    "input_quality": 0.76,
    "agent_agreement": 0.88,
    "unit_consistency": 0.92,
    "hallucination_risk": 0.22,
    "trust_score": 0.71
  },
  "flags": [
    "missing_verified_section_properties",
    "preliminary_only"
  ]
}
```

---

## 7. Spørsmål som må avklarast før migrasjon

- Finst det allereie ein `runs`-tabell som alle observability-events bør referere til?
- Skal `run_id` vere `uuid` overalt, eller er nokre run-id-ar tekststrengar?
- Skal events vere append-only?
- Skal rå agent-output lagrast i observability, eller berre sammendrag/metadata?
- Kva data kan innehalde personopplysningar?
- Skal admin/pilot-dashboard lese frå desse tabellane direkte?
- Kor lenge skal traces lagrast?
- Skal eval-runs og produksjons-runs skiljast i same tabell eller med separate tabellar?

---

## 8. Ikkje implementer i same sprint

Denne dokumentasjonssprinten skal ikkje gjere:

```txt
- Supabase migration
- API route changes
- agent route logging
- admin dashboard changes
- automatic guardrail enforcement
- schema writes from runtime
```

Desse bør kome seinare i små sprintar etter codebase-kartlegging og database-review.

---

## 9. Anbefalt vidare rekkefølgje

```txt
34.4  Observability schema proposal                 docs only
34.5  Supabase usage audit review                   docs only / read-only
34.6  Minimal event type definitions                shared types only, if needed
34.7  Log controller quality summary                one route / one event type
34.8  Admin QA visibility                           read-only dashboard
```

---

## 10. Akseptkriterium for Sprint 34.4

- Fila er lagt til under `sources/database/`.
- Ingen app-kode er endra.
- Ingen Supabase-migrasjon er laga.
- Dokumentet skil tydeleg mellom forslag og implementering.
- Dokumentet kan brukast som grunnlag for database-review med Claude eller menneskeleg review.
