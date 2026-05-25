# CLAUDE_HANDOFF_REPORT.md

> Overleveringsrapport for kartleggingsoppdraget på PILAR.
> Skriven av Claude. Reint kartleggings-/dokumentasjonsarbeid — ingen
> eksisterande kodefil er endra.

---

## Kva eg gjorde

Eg utførte ei **read-only kartlegging** av PILAR-kodebasen frå
`pilar-current.zip` og produserte fem grunnlagsdokument + denne rapporten.
Eg implementerte ingen agentar, ingen eval-runner, ingen testar, ingen
observability og ingen guardrail. Eg endra inga `.ts/.tsx/.js/.mjs/.json/.css`-
fil og inga agentprompt-fil.

---

## Kva filer eg oppretta

Berre nye Markdown-filer, under `sources/`:

- `sources/codebase/PILAR_CODEBASE_MAP.md`
- `sources/codebase/PILAR_PIPELINE_DATAFLOW.md`
- `sources/codebase/PILAR_REPORT_PIPELINE_MAP.md`
- `sources/codebase/PILAR_SUPABASE_USAGE_MAP.md`
- `sources/codebase/PILAR_TECH_DEBT_AND_RISK_REGISTER.md`
- `sources/claude/CLAUDE_HANDOFF_REPORT.md` (denne fila)

---

## Kva kommandoar eg køyrde (read-only)

- `unzip` av `pilar-current.zip` til ein arbeidskopi.
- `git rev-parse --show-toplevel` → **feila** (zip inneheld inga `.git/`).
- `find` over `app/`, `lib/`, `db/`, `supabase/`, `docs/` for struktur, ruter
  og filtypar.
- `grep -RIn` / `grep -RhoE` for: `supabase`-import, tabellnamn i
  `.from(...)`, `.insert/.update/.select` per agent-rute,
  `locale`/`i18n`/`LOCALE_STORAGE_KEY`, agent-rute-kall.
- `cat`/`head`/`sed` på utvalde filer: `package.json`, `lib/supabase.ts`,
  `lib/locale.ts`, `app/api/init-run/route.ts`, `app/api/input-agent/route.ts`,
  `app/api/agent-e/route.ts`, `lib/report/build-report-model.ts`,
  rapport-eksportrutene, `AGENTS.md`, `CLAUDE.md`, `README.md`.

Alle kommandoane var lesande. Ingen `replace`, ingen TSX-patching, ingen
endring av imports, runtime-logikk eller schema.

---

## Kva eg ikkje rørte

- Inga eksisterande kjeldefil (`.ts/.tsx/.js/.mjs/.json/.css/.sql`).
- Inga agentprompt-fil.
- Database-schema og migrasjonar.
- Dei fire 0-byte-artefaktfilene i repo-rota og den nøsta `pilar-current.zip`
  — flagga i risikoregisteret (R5, R6), men **ikkje sletta**.

---

## Dei viktigaste funna

1. **Kjernetabellar manglar migrasjonar (P0).** `reports`, `calculation_runs`,
   `requests`, `input_reviews`, `agent_outputs`, `comparisons`,
   `controller_decisions`, `error_reports`, `manual_reviews`, `admins` har
   inga migrasjonsfil i repoet. Schema kan ikkje reproduserast frå repoet.
2. **RLS-policyar finst ikkje i repoet (P0).** Tilgangskontroll kan ikkje
   granskast statisk.
3. **Pipelinen blir orkestrert klientside (P1)** i `app/page.tsx`. Ingen
   server-side resume → forlatne runs blir ståande `"running"`.
4. **Rapport-cache ignorerer `prompt_version` (P1).** `agent-e` `handleCache`
   leverer gammal prosa etter promptendring. Viktig å vite under prompt-testing.
5. **Skjør språk-erstatting (P1).** `build-report-model.ts` har lange
   `sprint33X`-regex-kjeder norsk→engelsk — sannsynleg kjelde til
   språklekkasje i rapportar.
6. **PDF speglar HTML, DOCX brukar eigen modell (P1).** To renderingsvegar som
   kan drive frå kvarandre.
7. **Repo-hygiene (P2):** 4 artefaktfiler + ein nøsta zip i repo-rota.

Fullstendig liste med fil/område, konsekvens og prioritet:
`sources/codebase/PILAR_TECH_DEBT_AND_RISK_REGISTER.md`.

---

## Anbefalt neste arbeid (for ChatGPT/Codex/Claude)

> Dette er forslag, **ikkje** ein ny sprint. Eigar avgjer prioritering.

1. **Schema-/RLS-dump (P0).** Hent faktisk schema + RLS for dei 10 udekte
   kjernetabellane og legg inn som referanse. Må gjerast før nokon
   schema-sprint, sidan ein elles arbeider utan verifiserbar referanse.
2. **Verifiser agent a–d-rutene.** Eg las `input-agent` og `agent-e` i detalj;
   a–d er antatt å følgje same inline-`SYSTEM_PROMPT`-mønster. Bør stadfestast,
   inkl. feilhandsaming på `agent_outputs`-insert (R10).
3. **Avklar `prompt_version`-handsaming** i agent-e-cache (R4) — design før kode.
4. **Verifiser éin sann rapportmodell** (R9) — sjekk at HTML-fullrapporten og
   DOCX deler same `ReportModel`.
5. **Repo-hygiene (R5, R6)** — låg risiko, rask gevinst.

---

## Spørsmål til eigar

1. Finst det migrasjonar for kjernetabellane (`reports`, `calculation_runs`
   osv.) utanfor zip-en, eller vart desse tabellane laga manuelt i Supabase?
2. Er `db/`-SQL eller `supabase/migrations/` den kanoniske kjelda — eller
   begge?
3. Er dei fire 0-byte-artefaktfilene og den nøsta `pilar-current.zip` i
   repo-rota trygge å slette?
4. Er det meininga at PDF skal genererast ved Puppeteer-print av HTML, eller
   bør PDF og DOCX dele renderingsveg?
5. Den separate planen for agent-økosystemet — kvar ligg han? Eg fann ingen
   referanse til han i `docs/`, `README.md` eller `AGENTS.md`, og har difor
   ikkje samkøyrt mot han.

---

## Akseptkriterium — status

- [x] Berre nye Markdown-filer er lagde til (under `sources/`).
- [x] Inga eksisterande kodefil er endra.
- [x] Alle funn er sporbare til filsti eller kommando.
- [x] Fakta er skilt frå antakingar gjennom heile.
- [x] Ingen ny sprint laga — dette er reint kartleggingsarbeid.
