# PILAR Guardrail Decision Schema

**Fil:** `sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md`  
**Status:** Schema proposal / implementation reference  
**Sprint:** 34.5  
**Type:** Dokumentasjon. Ingen database-migrasjon i denne sprinten.  
**Formål:** Definere korleis PILAR bør lagre og strukturere guardrail-avgjerder før output blir vist, eksportert eller brukt som grunnlag for vidare læring.

---

## 0. Kjerneidé

PILAR skal ikkje berre generere berekningar og rapportar. PILAR må også kunne dokumentere **kvifor eit svar fekk lov til å bli vist**, eller kvifor det vart merka med warning/blokka.

Guardrail-laget skal vere eit revisjonsspor mellom:

```txt
Input / agent-output → guardrail decision → result view / report / PDF / Word / human review
```

I v0.1 skal dette vere eit forslag til datamodell og kontrakt, ikkje ein aktiv databaseendring.

---

## 1. Mål

Guardrail decision schema skal gjere det mogleg å svare på:

```txt
- Kvifor vart denne rapporten vist?
- Kvifor vart han vist med warning?
- Kvifor vart han blokkert?
- Kva regel vart trigga?
- Var problemet input, standardgrunnlag, einingar, språk, rapportformat eller konklusjon?
- Kva bør brukaren eller fagperson gjere vidare?
```

---

## 2. Ikkje-mål for Sprint 34.5

Denne sprinten skal ikkje:

```txt
- lage Supabase migration
- endre app-kode
- endre agent prompts
- endre rapportmodell
- endre PDF/Word-rendering
- lage aktiv guardrail-agent
- blokkere runs i produksjon
```

Dette dokumentet er berre eit grunnlag for seinare implementering.

---

## 3. Guardrail status

Foreslått status-enum:

```txt
pass   = output kan visast utan ekstra guardrail-warning
warn   = output kan visast, men med tydeleg warning og/eller krav om fagpersonkontroll
block  = output skal ikkje visast som berekningsresultat før problemet er løyst
```

---

## 4. Reason codes v0.1

Reason codes bør vere stabile maskinlesbare strengar. Brukarvendt tekst kan lokaliserast seinare.

| Reason code | Typisk status | Forklaring |
|---|---:|---|
| `input_irrelevant` | block | Input er ikkje relevant for bygg/konstruksjon. |
| `input_insufficient` | warn/block | Input manglar kritiske data for etterspurd kontroll. |
| `missing_verified_section_properties` | warn/block | Profil-/seksjonsdata manglar eller er ikkje verifisert. |
| `invented_standard_value_risk` | block | Agenten ser ut til å finne på standard-/tabellverdiar. |
| `mixed_standard_context` | block | Eurokode, AISC/ASCE eller andre standardregime er blanda. |
| `unit_inconsistency` | warn/block | Einingar er inkonsistente eller uklare. |
| `conclusion_too_strong` | warn/block | Konklusjonen er sterkare enn bevisgrunnlaget. |
| `final_approval_claim` | block | Output påstår endeleg prosjekteringsgodkjenning. |
| `missing_disclaimer` | warn | Førebels/AI-assistert output manglar disclaimer. |
| `language_shell_leak` | warn | Shell/statuslabels lek feil språk i result-view/rapport. |
| `report_artifact_mismatch` | warn | Webrapport, PDF, Word eller calculation sheet ser ut til å avvike. |
| `agent_disagreement_high` | warn/block | Engineer A/B er usamde utan at Controller handterer det godt. |
| `human_review_required` | warn | Output kan visast, men bør flaggast for fagperson. |

---

## 5. Foreslått JSON-kontrakt

Dette er kontrakten ein framtidig Guardrail Agent / Guardrail Service bør returnere.

```json
{
  "guardrail_version": "guardrail_v0.1",
  "status": "warn",
  "reason_codes": [
    "missing_verified_section_properties",
    "conclusion_too_strong"
  ],
  "severity": "medium",
  "user_message": "Resultatet er førebels fordi nødvendige profildata ikkje er verifiserte.",
  "developer_message": "Agent attempted a capacity-style conclusion without verified section properties.",
  "allowed_next_step": "show_preliminary_with_warning",
  "requires_human_review": true,
  "evidence": {
    "source": "controller_output",
    "fields": ["section_properties", "final_conclusion"],
    "notes": ["No verified Z, S, J, Cw or equivalent properties found in structured input."]
  },
  "metrics": {
    "risk_score": 0.72,
    "confidence": 0.81
  }
}
```

---

## 6. Allowed next steps

Foreslått enum for `allowed_next_step`:

```txt
show_result
show_preliminary_with_warning
show_summary_only
request_more_input
route_to_human_review
block_result
```

Forklaring:

| Value | Bruk |
|---|---|
| `show_result` | Trygt nok for vanleg førebels visning. |
| `show_preliminary_with_warning` | Vis resultata, men med tydeleg warning. |
| `show_summary_only` | Vis kort forklaring, men ikkje full berekningspåstand. |
| `request_more_input` | Be brukar om manglande data. |
| `route_to_human_review` | Send til fagperson/administrator før vidare bruk. |
| `block_result` | Ikkje vis som resultat. |

---

## 7. Foreslått Supabase-tabell

Dette er eit forslag. Ikkje køyr som migration før schema er reviewa.

```sql
create table guardrail_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  run_id uuid not null,
  guardrail_version text not null,

  status text not null check (status in ('pass', 'warn', 'block')),
  severity text not null default 'info' check (severity in ('info', 'low', 'medium', 'high', 'critical')),

  reason_codes jsonb not null default '[]',
  allowed_next_step text not null,
  requires_human_review boolean not null default false,

  user_message text,
  developer_message text,

  evidence jsonb not null default '{}',
  metrics jsonb not null default '{}',
  raw_decision jsonb not null default '{}'
);
```

Indeksforslag:

```sql
create index guardrail_decisions_run_id_idx on guardrail_decisions (run_id);
create index guardrail_decisions_status_idx on guardrail_decisions (status);
create index guardrail_decisions_created_at_idx on guardrail_decisions (created_at desc);
```

---

## 8. Relasjon til andre PILAR-tabellar

Guardrail decisions bør seinare koblast til:

```txt
runs / pilar_runs
agent_observability_events
eval_runs
human_reviews
error_reports
```

Foreslått rollefordeling:

| Datalag | Rolle |
|---|---|
| `agent_observability_events` | Kva skjedde i agentløpet? |
| `guardrail_decisions` | Kva fekk lov til å bli vist, og kvifor? |
| `eval_runs` | Korleis presterte systemet mot testcases? |
| `human_reviews` | Kva meinte fagperson/eigar etterpå? |
| `error_reports` | Kva rapporterte brukar/admin som feil? |

---

## 9. Guardrail examples

### 9.1 Pass

```json
{
  "guardrail_version": "guardrail_v0.1",
  "status": "pass",
  "severity": "info",
  "reason_codes": [],
  "allowed_next_step": "show_result",
  "requires_human_review": false,
  "user_message": null,
  "developer_message": "No blocking or warning-level guardrail issues found."
}
```

### 9.2 Warn

```json
{
  "guardrail_version": "guardrail_v0.1",
  "status": "warn",
  "severity": "medium",
  "reason_codes": ["input_insufficient", "human_review_required"],
  "allowed_next_step": "show_preliminary_with_warning",
  "requires_human_review": true,
  "user_message": "Resultatet er førebels. Nokre nødvendige føresetnader manglar og bør kontrollerast av fagperson.",
  "developer_message": "Input is structurally relevant, but incomplete for final verification."
}
```

### 9.3 Block

```json
{
  "guardrail_version": "guardrail_v0.1",
  "status": "block",
  "severity": "critical",
  "reason_codes": ["invented_standard_value_risk", "final_approval_claim"],
  "allowed_next_step": "block_result",
  "requires_human_review": true,
  "user_message": "PILAR kan ikkje vise dette som eit gyldig berekningsresultat fordi nødvendige standard-/tabelldata ikkje er dokumenterte.",
  "developer_message": "The output attempted final code compliance based on unsupported values."
}
```

---

## 10. Første implementeringsidé seinare

Når dette skal implementerast, bør det gjerast i ein eigen sprint etter dokumentreview.

Mogleg rekkefølgje:

```txt
1. Lag TypeScript-typar for guardrail decision.
2. Lag rein regelbasert helper som tek structured run/result og returnerer decision.
3. Logg decision til console/dev først.
4. Legg til Supabase migration etter review.
5. Vis warning/block-status i result-view.
6. Koble til Report QA og Eval Agent seinare.
```

---

## 11. Akseptkriterium for Sprint 34.5

Denne sprinten er godkjend når:

```txt
- sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md finst
- ingen app-kode er endra
- ingen database-migration er lagt til
- repo kan framleis køyre eval validator
- TypeScript/build er ikkje påverka av dokumentet
```

---

## 12. Rollback

```bash
git checkout -- sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md
```

Dersom fila er untracked:

```bash
rm -f sources/database/PILAR_GUARDRAIL_DECISION_SCHEMA.md
```

---

## 13. Kortversjon

PILAR treng eit guardrail decision-spor fordi eit AI-byggprodukt må kunne dokumentere:

```txt
kva vart vist → kvifor vart det vist → kva risiko vart funnen → kva bør skje vidare
```

Dette dokumentet er første schemaforslag. Aktiv guardrail-logikk skal byggjast seinare, i ein eigen sprint.
