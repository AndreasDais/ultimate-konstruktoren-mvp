# Sprint 23 — PILAR Intelligence Agent MVP

Dette er første fundament for ein kontrollert lærings- og forbedringsagent.

## Kva som er lagt til

### Database

Migrasjon:

```txt
supabase/migrations/20260523000000_pilar_intelligence_foundation.sql
```

Tabellar:

- `daily_intelligence_reports`
- `daily_metrics_snapshots`
- `improvement_actions`
- `agent_learning_feedback`

### Backend

```txt
lib/intelligence/types.ts
lib/intelligence/metrics.ts
lib/intelligence/generate-report.ts
app/api/admin/intelligence/daily/route.ts
app/api/admin/intelligence/actions/[id]/route.ts
```

API:

```txt
GET  /api/admin/intelligence/daily
POST /api/admin/intelligence/daily
PATCH /api/admin/intelligence/actions/[id]
```

### Adminside

```txt
app/admin/intelligence/page.tsx
app/admin/intelligence/intelligence.css
```

Opne:

```txt
/admin/intelligence
```

## Kva agenten gjer no

- Samlar dagens data frå Supabase-tabellar som allereie finst:
  - `calculation_runs`
  - `reports`
  - `input_reviews`
  - `controller_decisions`
  - `comparisons`
  - `error_reports`
- Lagar dagleg rapport.
- Lagrar metrics snapshots.
- Lagrar forslag som `improvement_actions`.
- Leser førre dags rapport som carryover.

## Kva agenten ikkje gjer endå

- Han endrar ikkje kode.
- Han pushar ikkje til Git.
- Han endrar ikkje Supabase-skjema automatisk.
- Han endrar ikkje prisar, RLS, betalingslogikk eller sikkerheit.

Dette er med vilje. Første modus er **Observer + Recommend**.

## Installasjon

1. Køyr SQL-migrasjonen i Supabase SQL Editor.
2. Kopier filene inn i repoet.
3. Køyr:

```bash
rm -rf .next
npm run debug:sweep
npm run build
npm run dev
```

4. Opne:

```txt
/admin/intelligence
```

5. Trykk “Lag / hent rapport”.

## Neste sprintar

### Sprint 24 — Feedback loop

- Admin kan godkjenne, avvise og kommentere forslag.
- Agenten bruker feedback til å prioritere framtidige forslag betre.

### Sprint 25 — Cost / export / event instrumentation

- Logg eksportar: PDF, Word, LaTeX, beregningsark.
- Logg agentkostnad per kall.
- Logg CTA / marketing events.

### Sprint 26 — Implementation planner

- Agenten lager filspesifikke implementeringsplanar.
- Planen viser risiko, test og rollback.
- Framleis ikkje autonom kodeendring.

### Sprint 27 — Controlled autonomy

- Berre lågrisiko-endringar kan køyrast automatisk.
- All autonomi krev logg, test og rollback-plan.
