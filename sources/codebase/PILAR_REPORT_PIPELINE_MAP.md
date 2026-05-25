# PILAR_REPORT_PIPELINE_MAP.md

> Korleis resultatside, fullrapport, PDF og Word heng saman.
> Konkrete observasjonar — **fakta** der sett i kode, **antaking** elles.

---

## 1. Komponentane og korleis dei heng saman

**Fakta.**

- **Resultatside (live):** `app/page.tsx` viser pipeline-resultatet rett etter
  køyring, via `app/components/result/CalculationResultView.tsx` og
  `app/components/MissionControl.tsx`.
- **Fullrapport (nettlesar):** `app/rapport/[run_id]/page.tsx` med
  underkomponentar i `app/rapport/[run_id]/_components/`
  (`ChapterHeading`, `FormulaStack`, `OrdlisteFlyt`, `PageStripe`,
  `ForebelStripe`). Lastestatus: `RapportLoadingPilelinja.tsx`.
- **Berekningsark:** `app/rapport/[run_id]/beregning/page.tsx`.
- **Word/PDF/LaTeX-eksport:** eigne API-ruter under
  `app/api/rapport/[run_id]/...`.

**Felles kjelde.** Alle eksportrutene gjer det same mønsteret:

1. `fetch(`${origin}/api/agent-e`, { run_id, locale })` — hentar upstream-data.
2. Byggjer modell via `lib/report/build-report-model.ts` (`buildReportModel`).
3. Validerer via `lib/report/validate-report-model.ts`.
4. Renderer.

Dette stemmer med regel 10–11 i `AGENTS.md`: web, Word og PDF skal vise same
kanoniske rapportdata. **Antaking:** `buildReportModel` *er* den einaste
kjelda — bør stadfestast for nettlesar-fullrapporten òg (sjå observasjon C).

---

## 2. Kva filer som byggjer rapportmodellen

**Fakta** — `lib/report/`:

| Fil | Rolle |
|---|---|
| `report-model.ts` | Typar + `REPORT_MODEL_VERSION`, `REPORT_DISCLAIMER`. |
| `build-report-model.ts` | `buildReportModel(upstream)` → `ReportModel`. |
| `normalize-report-model.ts` | Normalisering (`normalizeReportModel`, tekst-opprydding). |
| `validate-report-model.ts` | `validateReportModel(...)`. |
| `report-template.ts` | Mal-/strukturkonstantar. |
| `calculation-sheet-model.ts` | `buildCalculationSheetModel(...)` for berekningsark. |

Upstream-typen er `UpstreamReportData` (eksportert frå `build-report-model.ts`),
og kjem frå **agent-e**.

---

## 3. Kva filer som renderer DOCX / PDF / LaTeX

**Fakta.**

| Format | Renderar | Kalla frå |
|---|---|---|
| Rapport DOCX | `lib/report/render-docx.ts` (`renderReportModelDocx`) | `app/api/rapport/[run_id]/word/route.ts` |
| Berekningsark DOCX | `lib/report/render-calculation-docx.ts` | `app/api/rapport/[run_id]/calculation/word/route.ts` |
| Berekningsark LaTeX | `lib/report/render-calculation-latex.ts` | `app/api/rapport/[run_id]/calculation/latex/route.ts` |
| PDF | Puppeteer (ingen eigen renderar-fil) | `app/api/rapport/[run_id]/calculation/pdf/route.ts` |

- DOCX brukar `Packer` frå `docx`-biblioteket.
- **PDF-en byggjer IKKJE på ein eigen modell.** `pdf/route.ts` lastar Puppeteer
  via dynamisk `import("puppeteer")` og **printar ei nettleersside til PDF**.
  Det betyr at PDF-en speglar HTML-renderinga, ikkje DOCX-renderinga.
- Puppeteer-importen er lazy; rute kastar tydeleg feil om pakken manglar
  («PDF-motoren manglar…»). `puppeteer` *står* i `package.json`-deps.

---

## 4. Kvar språklabels kan lekke inn

**Konkrete observasjonar — dette er den største risikoen i rapport-pipelinen.**

- `lib/report/build-report-model.ts` inneheld fleire funksjonar med namn som
  `sprint335PolishEnglishText`, `sprint339FinalNorwegianResidueText` o.l.
  Desse gjer **lange kjeder av `String.replace(...)`** som byter ut norske
  fraser med engelske (t.d. `FORELØPIG GODKJENT` → `PRELIMINARILY APPROVED`,
  `Engineer A og B` → `Engineer A and Engineer B`, `brukar`→`use`, `medan`→`while`).
- Dette er **regex-erstatting på fritekst etter at modellen har generert**.
  Effekten avheng av eksakt streng-match; ein liten variasjon i modell-output
  gjev anten dobbel-erstatting eller udekt norsk residu.
- `lib/report/render-docx.ts` har ~37 treff på `nb:`/`nn:`/`Locale` — språkval
  ligg spreidd i renderaren.
- locale blir samtidig styrt av cookie (`getLocaleFromCookies`) i kvar
  eksportrute, og av `lib/international/display.ts`
  (`inferReportDisplayLanguage`, `localizeGeneratedEngineeringText`).

**Lekkasje-punkt (observert risiko):**
1. Mismatch mellom rapport-locale (frå da rapporten vart generert) og
   UI-locale (cookie kan endrast etterpå — jf. `AGENTS.md`: «UI locale may
   change after report generation»).
2. `sprint33X`-erstattingane treffer ikkje all output → norsk residu i ein
   elles engelsk rapport (eller motsett).
3. DOCX og HTML/PDF kan velje locale ulikt om cookie og lagra rapport-locale
   ikkje er samkøyrde.

`docs/i18n-hardcoded-norwegian-prescan.md` er eit eksisterande audit-grunnlag
for dette.

---

## 5. Kvar gammal database-output kan forvekslast med nye promptendringar

**Konkret observasjon — verifisert i `app/api/agent-e/route.ts`.**

- Agent-e lagrar `prompt_version` (`"agent_e_v0.3"`) på `reports`-rada ved insert.
- Men `handleCache(...)` sjekkar **berre** om `tillit_score`/`tillit_breakdown`
  er stale — **ikkje** `prompt_version`.
- Følgje: når Rapportør-prompten blir endra, vil eit run som allereie har ei
  `reports`-rad framleis levere **gammal prosa** frå cache. Rapporten ser fersk
  ut, men prosaen er generert med ein eldre prompt.

**Same mønster, andre stega (antaking — bør verifiserast):** `agent_outputs`,
`comparisons` og `controller_decisions` lagrar også `prompt_version`-/
`agent_package_version`-felt. Det er ikkje stadfesta her at desse blir
samanlikna mot gjeldande prompt før gjenbruk. `calculation_runs` set
`agent_package_version: "agents_v0.2"` hardkoda i `init-run`.

**Konsekvens for testing:** etter ei promptendring må ein bruke **ferske runs**
(nye `run_id`) for å sjå effekten — gjenkøyring av eit gammalt `run_id` mot
rapport-sida vil tene cache.

---

## 6. Oppsummert flyt

```
agent-e  ──(UpstreamReportData)──►  buildReportModel  ──►  ReportModel
                                          │
                       ┌──────────────────┼───────────────────┐
                       ▼                  ▼                   ▼
              render-docx.ts     HTML i /rapport/[run_id]   render-calculation-*
              (Word-rapport)            │                  (berekningsark)
                                        ▼
                              Puppeteer print  ──►  PDF
```

> Ingen kodefil er endra. Punkta over er observasjonar for seinare,
> ikkje implementerte fiksar.
