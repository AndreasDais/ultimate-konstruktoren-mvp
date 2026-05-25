# PILAR_CODEBASE_MAP.md

> Kartlegging av PILAR-kodebasen slik han ligg i `pilar-current.zip`.
> Read-only-arbeid. Ingen eksisterande kodefil er endra. Berre nye
> Markdown-filer under `sources/` er lagde til.
>
> **Fakta** = sett direkte i kode/fil. **Antaking** = rimeleg slutning,
> ikkje verifisert. Alt er sporbart til filsti.

---

## 1. Kort oversikt over repo-struktur

**Fakta.** Prosjektet er ein Next.js App Router-app.

- `package.json` → `"name": "ultimate-konstruktoren-mvp"`, `"version": "0.1.0"`.
- Next.js `16.2.4`, React `19.2.4`, TypeScript `^5`.
- Nøkkelavhengnader: `@anthropic-ai/sdk`, `@supabase/supabase-js`, `@supabase/ssr`,
  `docx`, `katex`, `puppeteer`, `mammoth`, `@upstash/ratelimit`, `@sentry/nextjs`,
  `jsonrepair`.
- Testrammeverk: `vitest` (`vitest.config.ts`).

Filteljing (utan `node_modules`): 124 `.ts`, 42 `.tsx`, 58 `.md`, 15 `.json`,
12 `.css`, 7 `.sql`, 3 `.mjs`, 1 `.py`.

**Merknad — ikkje git-repo i zip.** Det finst ingen `.git/`-katalog i utpakka
zip. `git rev-parse --show-toplevel` feilar. Git-baserte kommandoar i
oppdraget kunne ikkje køyrast; kartlegginga byggjer på `find`/`grep` i staden.

**Merknad — artefakt-filer i repo-rota.** Fire 0-byte-filer med øydelagde namn
ligg i rota (namna inneheld terminal-escape-sekvensar):
`#Uf01b[22m#Uf01b[2mcheckLoadCombination`, `…degraderer`, `…hoppar`, `…ingen`.
Ser ut som utilsikta filer frå ein shell-paste. **Ikkje rørt.** Sjå
risikoregisteret (R5).

**Merknad — nøsta zip.** `pilar-current.zip` (~1,5 MB) ligg committa inne i
repo-rota. **Ikkje rørt.** Sjå risikoregisteret (R6).

---

## 2. Kva mapper som verkar viktige

| Mappe | Rolle (fakta der ikkje merkt) |
|---|---|
| `app/` | Next.js-ruter: sider, layouts og API-ruter. |
| `app/api/` | Alle server-endepunkt, inkl. agent-pipelinen. |
| `app/components/` | Delte React-komponentar. |
| `app/rapport/[run_id]/` | Rapport-visning i nettlesar + underkomponentar. |
| `lib/` | Domenelogikk: berekning, samanlikning, rapportmodell, locale. |
| `lib/report/` | Rapportmodell + DOCX/PDF/LaTeX-rendering. |
| `lib/calc/`, `lib/check/`, `lib/compare/` | Berekning/kontroll/samanlikning (med `.test.ts`). |
| `lib/engineering-context/` | «Engineering context»-handsaming og prompt-bygging. |
| `lib/intelligence/` | «Intelligence»/dagsrapport-funksjonalitet (admin). |
| `lib/result/`, `lib/workbench/` | Resultatvising og workbench-logikk. |
| `supabase/migrations/` | SQL-migrasjonar (delvis — sjå Supabase-kartet). |
| `db/` | Frittståande SQL (`runrecord.sql`, `shadow_checks.sql`, `step_metrics.sql`). |
| `qa/`, `golden/`, `funn/`, `daily/` | Test-/QA-/golden-set-/dagsrapport-verktøy. |
| `scripts/` | `debug-sweep.mjs`, `make-claude-handoff.py`. |
| `docs/` | 50+ sprint-notat (kronologisk prosjekthistorikk). |

---

## 3. App-ruter (sider)

**Fakta** — frå `find app -name page.tsx`:

| Rute | Fil |
|---|---|
| `/` | `app/page.tsx` (hovudside, klient-orkestrator — sjå pipeline-kartet) |
| `/admin` | `app/admin/page.tsx` |
| `/admin/error-reports` | `app/admin/error-reports/page.tsx` |
| `/admin/intelligence` | `app/admin/intelligence/page.tsx` |
| `/admin/login` | `app/admin/login/page.tsx` |
| `/admin/pilot` | `app/admin/pilot/page.tsx` |
| `/innstillingar` | `app/innstillingar/page.tsx` |
| `/international` | `app/international/page.tsx` |
| `/login` | `app/login/page.tsx` |
| `/mine` | `app/mine/page.tsx` |
| `/pilot` | `app/pilot/page.tsx` |
| `/vilkar` | `app/vilkar/page.tsx` |
| `/rapport/[run_id]` | `app/rapport/[run_id]/page.tsx` |
| `/rapport/[run_id]/beregning` | `app/rapport/[run_id]/beregning/page.tsx` |
| `/rapport/[run_id]/feedback` | `app/rapport/[run_id]/feedback/page.tsx` |

Layouts: `app/layout.tsx`, `app/rapport/[run_id]/layout.tsx`.

---

## 4. API-ruter

**Fakta** — frå `find app/api -name route.ts`.

### Agent-pipeline
- `app/api/input-agent/route.ts` — Tolkar (input-agent).
- `app/api/init-run/route.ts` — opprettar `calculation_runs`-rad.
- `app/api/agent-a/route.ts` — Engineer A.
- `app/api/agent-b/route.ts` — Engineer B.
- `app/api/agent-c/route.ts` — Comparator (Samanliknar).
- `app/api/agent-d/route.ts` — Controller (Kontrollør).
- `app/api/agent-e/route.ts` — Rapportør.

### Rapport / eksport
- `app/api/rapport/[run_id]/word/route.ts`
- `app/api/rapport/[run_id]/calculation/word/route.ts`
- `app/api/rapport/[run_id]/calculation/pdf/route.ts`
- `app/api/rapport/[run_id]/calculation/latex/route.ts`

### Admin / intelligence / pilot
- `app/api/admin/backfill-tillit/route.ts`
- `app/api/admin/error-reports/route.ts` + `[id]/route.ts`
- `app/api/admin/intelligence/actions/route.ts` + `[id]/route.ts` + `[id]/plan/route.ts`
- `app/api/admin/intelligence/cron/route.ts`
- `app/api/admin/intelligence/daily/route.ts` + `daily/markdown/route.ts`
- `app/api/admin/pilot/metrics/route.ts`, `app/api/admin/pilot/qa-status/route.ts`

### Øvrige
- `app/api/engineering-context/route.ts`
- `app/api/error-reports/route.ts`
- `app/api/health/route.ts`
- `app/api/pilot/feedback/route.ts`
- `app/api/requests/[id]/route.ts`
- `app/api/runs/[id]/route.ts`
- `app/auth/callback/route.ts`

---

## 5. Kvar agentane ligg

**Fakta.**

- Kvar agent er ei **API-rute** under `app/api/` (sjå punkt 4).
- System-prompten for kvar agent ligg **inline** i route-fila som ein stor
  `SYSTEM_PROMPT`-konstant (sett i `input-agent/route.ts` og `agent-e/route.ts`;
  antaking at same mønster gjeld a–d).
- Modellval kjem frå `lib/models.ts` (`PIPELINE_MODEL`), importert av rutene.
- Locale-direktiv (språk-sandwich) kjem frå `lib/locale.ts` og
  `lib/engineering-context/agent.ts` (`buildAgentSystemPrompt`).
- **Orkestreringa av pipelinen ligg klientside** i `app/page.tsx` — sjå
  pipeline-kartet. Det finst inga server-side orkestreringsrute.

Linjetal (indikasjon på kompleksitet): `input-agent` 702, `agent-e` 611,
`agent-b` 504, `agent-a` 499, `agent-d` 442, `agent-c` 322, `init-run` 106.

---

## 6. Kvar rapport-/PDF-/Word-logikk ligg

**Fakta.** All rapport-rendering ligg i `lib/report/`:

| Fil | Rolle |
|---|---|
| `report-model.ts` | Type-/modelldefinisjon (`ReportModel`, versjon). |
| `build-report-model.ts` | Byggjer `ReportModel` frå upstream-agentdata. |
| `normalize-report-model.ts` | Normalisering/oppreinsking av modell. |
| `validate-report-model.ts` | Validering av modell. |
| `report-template.ts` | Mal-/strukturkonstantar. |
| `calculation-sheet-model.ts` | Modell for berekningsark. |
| `render-docx.ts` | DOCX-rendering av rapport (`docx`-lib). |
| `render-calculation-docx.ts` | DOCX-rendering av berekningsark. |
| `render-calculation-latex.ts` | LaTeX-rendering av berekningsark. |

PDF-en blir generert av `app/api/rapport/[run_id]/calculation/pdf/route.ts`
via **Puppeteer** (lazy `import("puppeteer")`). Sjå pipeline-/rapport-kartet.

---

## 7. Kvar locale/i18n-logikk ligg

**Fakta.**

- `lib/locale.ts` — `SUPPORTED_LOCALES = ["nb","nn"]`, `DEFAULT_LOCALE = "nb"`,
  `LOCALE_STORAGE_KEY = "pilar-locale"`, `LOCALE_COOKIE_NAME = "pilar-locale"`.
  Inneheld også `DIRECTIVE_HEADERS`/`DIRECTIVE_FOOTERS` (språk-sandwich for
  agent-promptar).
- `lib/locale-context.tsx` — React-context (`useLocale`).
- `lib/international/display.ts` — `displayLanguageForContext`,
  `buildLocalizedLabelProxy`, `localizeResultLabel`, m.fl.
- `lib/format.ts`, `lib/result/labels.ts` — locale-labels.
- locale blir lese/sendt i alle agent-rutene og rapport-rutene
  (via `getLocaleFromCookies` / `coerceLocale`).
- `docs/i18n-hardcoded-norwegian-prescan.md` — eksisterande audit av
  hardkoda norsk tekst.

**Risiko-flagg (sjå rapport-kartet R2).** `lib/report/build-report-model.ts`
inneheld funksjonar `sprint335…`, `sprint339…` o.l. som gjer omfattande
regex-erstatting norsk→engelsk på rapporttekst. Dette er skjørt og er ein
sannsynleg kjelde til språklekkasje.

---

## 8. Kvar Supabase blir brukt

**Fakta.** Detaljar i `PILAR_SUPABASE_USAGE_MAP.md`. Kort:

- `lib/supabase.ts` — service-role-klient (`getSupabase()`).
- SSR/anon-klient (`createServerClient`) blir laga inline i fleire ruter
  (t.d. `init-run`, `input-agent`).
- Supabase blir importert/brukt i ~33 filer under `app/` og `lib/`.

---

## 9. Ukjende eller uklare område

1. **Pipeline-orkestrering klientside.** `app/page.tsx` styrer rekkjefølgja
   agent-a/b → c → d. Konsekvensar er ikkje fullt kartlagde — sjå pipeline-kartet.
2. **Manglande migrasjonar.** Fleire kjernetabellar (`reports`,
   `calculation_runs`, `requests`, `input_reviews`, `agent_outputs`,
   `comparisons`, `controller_decisions`, m.fl.) har **inga** migrasjonsfil i
   repoet. Sjå Supabase-kartet.
3. **`agent_package_version`** er hardkoda `"agents_v0.2"` i `init-run/route.ts`
   — uklart kvar versjonering elles blir styrt.
4. **System-promptar a–d.** Berre `input-agent` og `agent-e` er lesne i detalj
   her; a–d er antatt å følgje same inline-`SYSTEM_PROMPT`-mønster.
5. **Artefakt-filer + nøsta zip** i repo-rota (sjå punkt 1) — formål ukjent.
6. **`app/international/`** vs `lib/international/` — forholdet mellom desse og
   `nb`/`nn`-locale er ikkje fullt avklart.
