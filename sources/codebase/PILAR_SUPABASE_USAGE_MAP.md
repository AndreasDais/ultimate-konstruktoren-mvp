# PILAR_SUPABASE_USAGE_MAP.md

> Kartlegging av Supabase-bruk. **Fakta** = sett i kode/SQL.
> **Antaking** = rimeleg slutning, ikkje verifisert mot live-database.

---

## 1. Kvar Supabase-klienten blir importert / brukt

**Fakta.**

- **Service-role-klient:** `lib/supabase.ts` → `getSupabase()`.
  Brukar `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`,
  `auth: { persistSession: false }`, cacha i modul-scope.
- **SSR/anon-klient:** `createServerClient` frå `@supabase/ssr` blir laga
  **inline** i fleire ruter — t.d. `app/api/init-run/route.ts` og
  `app/api/input-agent/route.ts` (brukar `NEXT_PUBLIC_SUPABASE_ANON_KEY` og
  cookie-store for session).

**Filer som importerer/brukar Supabase** (~33 filer) — utvalde:

- API-ruter: alle `app/api/agent-*`, `input-agent`, `init-run`,
  `engineering-context`, `error-reports`, `health`, `pilot/feedback`,
  `requests/[id]`, `runs/[id]`, samt alle `app/api/admin/...`.
- Sider/komponentar: `app/admin/error-reports/page.tsx`, `app/admin/login`,
  `app/admin/pilot`, `app/components/Header.tsx`, `app/innstillingar/page.tsx`,
  `app/login/page.tsx`, `app/mine/page.tsx`, `app/auth/callback/route.ts`.
- Lib: `lib/intelligence/*` (`actions`, `generate-report`,
  `implementation-plan`, `metrics`), `lib/shadow/shadow-check.ts`,
  `lib/step-metrics.ts`.

**Merknad om `AGENTS.md`-reglar.** `AGENTS.md` seier: anon/SSR-klient for
brukar-scoped tilgang, service-role berre i server-only filer, og ikkje
importer service-role-klient i klient-komponentar. Verifisering av at dette
held i *alle* 33 filene er **ikkje** gjort her — flagga som oppgåve (sjå punkt 5).

---

## 2. Tabellnamn funne i kode

**Fakta** — frå `grep -RhoE "\.from\(['\"]…['\"]\)"` i `app/` + `lib/`.
Talet er kor mange `.from(...)`-kall som refererer tabellen:

| Tabell | `.from()`-kall | Brukt av (utval) |
|---|---|---|
| `reports` | 11 | agent-e, rapport-ruter |
| `improvement_actions` | 8 | `app/api/admin/intelligence/*`, `lib/intelligence/actions.ts` |
| `calculation_runs` | 7 | init-run, agent-d, agent-e, `runs/[id]` |
| `requests` | 5 | input-agent, init-run, `requests/[id]` |
| `daily_intelligence_reports` | 5 | `app/api/admin/intelligence/daily/*` |
| `input_reviews` | 4 | input-agent, agent-e, `runs/[id]` |
| `agent_outputs` | 4 | agent-a, agent-b, agent-e |
| `error_reports` | 3 | `error-reports`-ruter |
| `controller_decisions` | 3 | agent-d, agent-e |
| `comparisons` | 3 | agent-c, agent-e |
| `pilot_feedback` | 2 | `pilot/feedback`, admin |
| `manual_reviews` | 2 | antaking: admin/QA |
| `agent_learning_feedback` | 2 | `lib/intelligence/*` |
| `step_metrics` | 1 | `lib/step-metrics.ts` |
| `shadow_checks` | 1 | `lib/shadow/shadow-check.ts` |
| `engineering_context_events` | 1 | `app/api/engineering-context/route.ts` |
| `daily_metrics_snapshots` | 1 | `lib/intelligence/metrics.ts` |
| `admins` | 1 | antaking: admin-autorisering |

---

## 3. Lese-/skriveoperasjonar (kjernepipeline)

**Fakta** — frå `grep` på `.insert/.update/.select` i agent-rutene:

| Rute | Tabell | Operasjon |
|---|---|---|
| `input-agent` | `requests` | insert |
| `input-agent` | `input_reviews` | insert |
| `init-run` | `requests` | update (`user_id`) |
| `init-run` | `calculation_runs` | insert |
| `agent-a` | `agent_outputs` | insert |
| `agent-b` | `agent_outputs` | insert |
| `agent-c` | `comparisons` | insert |
| `agent-d` | `controller_decisions` | insert |
| `agent-d` | `calculation_runs` | update |
| `agent-e` | `calculation_runs` (+ join `requests`) | select |
| `agent-e` | `input_reviews` | select |
| `agent-e` | `agent_outputs` | select |
| `agent-e` | `comparisons` | select |
| `agent-e` | `controller_decisions` | select |
| `agent-e` | `reports` | select / insert / update |

---

## 4. Kva data som verkar kritisk

**Antaking basert på bruksmønster:**

- **Run:** `calculation_runs` (status, `run_type`, `agent_package_version`,
  `user_id`, tidsstempel) + `requests` (rå brukar-input). Kjernen — utan desse
  finst ikkje køyringa.
- **Rapport:** `reports` (rapport-prosa, `prompt_version`, `tillit_score`,
  `tillit_breakdown`, `document_id`). Brukt av rapport-/eksportrutene.
- **Pipeline-mellomdata:** `input_reviews`, `agent_outputs`, `comparisons`,
  `controller_decisions` — agent-e les alle desse for å byggje rapporten.
- **Errors:** `error_reports` (brukar-/system-feilrapportar),
  `shadow_checks`, `step_metrics` (driftsmålingar).
- **Admin/intelligence:** `improvement_actions`, `daily_intelligence_reports`,
  `daily_metrics_snapshots`, `agent_learning_feedback`, `pilot_feedback`,
  `manual_reviews`, `admins`.

---

## 5. Databaseområde som bør dokumenterast betre før schema-endringar

**Kritisk funn — manglande migrasjonar.**

`supabase/migrations/` inneheld berre **fire** filer, som dekkjer:
`daily_intelligence_reports`, `improvement_actions`, `agent_learning_feedback`,
`daily_metrics_snapshots`, `pilot_feedback`, `engineering_context_events`
(+ ein language-policy-migrasjon).

`db/` har tre frittståande SQL-filer: `runrecord.sql`, `shadow_checks.sql`,
`step_metrics.sql` — ikkje tidsstempla migrasjonar.

**Desse kjernetabellane har INGA migrasjonsfil i repoet:**
`reports`, `calculation_runs`, `requests`, `input_reviews`, `agent_outputs`,
`comparisons`, `controller_decisions`, `error_reports`, `manual_reviews`,
`admins`.

**Konsekvens:** schema for sjølve berekningspipelinen kan ikkje reproduserast
frå repoet åleine. Skjemaet ligg truleg berre i den levande Supabase-instansen
(eller i migrasjonar utanfor zip-en). Det er **ingen** sikker referanse for
kolonnenamn/-typar her — `AGENTS.md`-regel «ikkje omdøyp DB-kolonnar» kan ikkje
verifiserast utan tilgang til faktisk schema.

**Bør gjerast før schema-endringar (framtidig arbeid — ikkje gjort her):**
1. Dump faktisk schema for dei 10 udekte tabellane og legg det inn som
   migrasjon eller referansedokument.
2. Stadfest RLS-policyar — `AGENTS.md` viser til RLS/eigarskaps-sjekkar, men
   ingen RLS-definisjon for kjernetabellane finst i repoet.
3. Avklar `db/`-mappa vs `supabase/migrations/` — to ulike SQL-stader, uklar
   prioritet/rekkjefølgje.
4. Verifiser at `agent_package_version` (hardkoda `"agents_v0.2"` i `init-run`)
   matchar ein faktisk versjonskonvensjon.

> Ingen schema-endring, migrasjon eller SQL er lagt til eller endra i denne
> kartlegginga. Punkta over er reint dokumentasjonsfunn.
