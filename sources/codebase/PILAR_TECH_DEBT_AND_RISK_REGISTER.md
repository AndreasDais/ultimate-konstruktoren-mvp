# PILAR_TECH_DEBT_AND_RISK_REGISTER.md

> Risikoregister frå kartlegginga. **Ingen fiks er implementert.**
> Alle forslag er framtidig arbeid for seinare sprintar.
> Prioritet: **P0** = bør avklarast før neste schema-/pipeline-sprint,
> **P1** = viktig, **P2** = rydding/lågare hast.

---

| # | Risiko | Fil / område | Kvifor det er risiko | Konsekvens | Forslag til seinare sprint | Prioritet | Kode eller berre dok? |
|---|---|---|---|---|---|---|---|
| R1 | Kjernetabellar manglar migrasjonsfil | `supabase/migrations/`, `db/` | `reports`, `calculation_runs`, `requests`, `input_reviews`, `agent_outputs`, `comparisons`, `controller_decisions`, `error_reports`, `manual_reviews`, `admins` har ingen migrasjon i repoet. Schema finst berre i live-DB. | Schema kan ikkje reproduserast; `AGENTS.md`-regel «ikkje omdøyp kolonnar» kan ikkje verifiserast; risiko for utilsikta drift ved kvar DB-endring. | Dump faktisk schema og legg inn som referanse-migrasjon/-dokument før nokon schema-sprint. | **P0** | Dok (DB-tilgang, ikkje app-kode) |
| R2 | Skjør språk-erstatting med regex | `lib/report/build-report-model.ts` (`sprint335…`, `sprint339…`-funksjonar) | Lange kjeder av `String.replace()` byter norske fraser mot engelske etter modell-generering. Avheng av eksakt streng-match. | Norsk residu i engelsk rapport, eller dobbel-erstatting. Direkte rapportkvalitet. | Erstatt regex-laget med strukturert locale-handsaming der teksten blir generert på rett språk. Bruk `docs/i18n-hardcoded-norwegian-prescan.md` som grunnlag. | **P1** | Kode (framtidig) |
| R3 | Klientside pipeline-orkestrering | `app/page.tsx`, `app/api/init-run/route.ts` | Steg 3–5 (A/B → C → D) blir driven av nettlesaren. Ingen server-side resume. | Lukka fane midt i køyringa → `calculation_runs.run_status` blir ståande `"running"`. Inkonsistente runs. | Vurder server-side orkestrering eller minst ein «stale run»-opprydding/timeout. | **P1** | Kode (framtidig) |
| R4 | Rapport-cache ignorerer `prompt_version` | `app/api/agent-e/route.ts` (`handleCache`) | Cache returnerer eksisterande `reports`-rad; berre tillit-score blir sjekka for staleness, ikkje `prompt_version`. | Etter promptendring leverer gamle runs framleis gammal prosa. Forvirrande under prompt-testing. | Inkluder `prompt_version`-samanlikning i cache-staleness, eller eksplisitt «force regenerate». | **P1** | Kode (framtidig) |
| R5 | Artefakt-filer i repo-rota | 4 × 0-byte-filer med øydelagde namn (`#Uf01b[22m…checkLoadCombination` osv.) | Ser ut som utilsikta filer frå ein shell-paste. Forureinar repoet. | Forvirring; kan bryte verktøy som ikkje toler escape-teikn i filnamn. | Verifiser at dei er trygge å slette, deretter fjern. **Ikkje rørt i denne kartlegginga.** | **P2** | Dok → så kode |
| R6 | Nøsta zip committa i repoet | `pilar-current.zip` i repo-rota | ~1,5 MB binærfil ligg inne i kjeldekoden. | Repo-bloat; forvirrande sjølv-referanse. | Fjern frå repo, legg `*.zip` i `.gitignore`. | **P2** | Dok → så kode |
| R7 | To stader for SQL | `db/` vs `supabase/migrations/` | Frittståande SQL i `db/` og tidsstempla migrasjonar i `supabase/migrations/` — uklar prioritet og rekkjefølgje. | Risiko for at `db/`-SQL og migrasjonar kjem ut av synk. | Avklar éin kanonisk migrasjonsstad; dokumenter eller konsolider `db/`. | **P2** | Dok |
| R8 | Hardkoda `agent_package_version` | `app/api/init-run/route.ts` (`"agents_v0.2"`) | Versjonsstrengen er ein literal i éin rute; uklart om han held følgje med faktiske agent-/prompt-versjonar. | Telemetri/analyse kan feilattribuere runs til feil agent-versjon. | Sentraliser versjonering (t.d. i `lib/models.ts` eller eigen config). | **P2** | Kode (framtidig) |
| R9 | PDF speglar HTML, ikkje DOCX-modellen | `app/api/rapport/[run_id]/calculation/pdf/route.ts` | PDF blir generert ved at Puppeteer printar ei nettleersside. DOCX brukar `render-docx`-modellen. | To renderingsvegar kan drive frå kvarandre — bryt `AGENTS.md`-regel 11 om dei ikkje held seg synkroniserte. | Verifiser at HTML-rapporten og DOCX deler same `ReportModel`; dokumenter den eine sanninga. | **P1** | Dok → så kode |
| R10 | Antatt stille DB-feil i steg 3 | `app/api/agent-a/route.ts`, `app/api/agent-b/route.ts` | `agent_outputs`-insert: feilhandsaming er ikkje verifisert. agent-c/-d les desse radene frå DB. | Feilar eit insert stille, kan c/d rekne på ufullstendig data. | Verifiser feilhandsaming + logging på `agent_outputs`-insert. | **P1** | Dok → så kode |
| R11 | Service-role vs anon-klient-bruk uverifisert | ~33 filer som importerer Supabase | `AGENTS.md` krev service-role berre i server-only filer og ikkje i klient-komponentar. Ikkje verifisert i alle filene. | Risiko for at service-role-nøkkel lek til klient eller at RLS blir omgått. | Audit alle Supabase-importar mot klient/server-grense. | **P1** | Dok (audit) |
| R12 | RLS-policyar ikkje i repoet | `supabase/migrations/`, `db/` | `AGENTS.md` viser til RLS/eigarskaps-sjekkar, men ingen RLS-definisjon for kjernetabellane finst i repoet. | Tilgangskontroll kan ikkje granskast frå koden; risiko for datalekkasje mellom brukarar. | Hent og dokumenter RLS-policyar saman med R1-schemadump. | **P0** | Dok (DB-tilgang) |

---

## Merknad om omfang

Risikoane over er **observasjonar frå statisk kartlegging** av
`pilar-current.zip`. Ingen er stadfesta mot ein køyrande instans, og ingen
fiks er implementert. «Kode (framtidig)»-merkinga tyder at ein eventuell fiks
vil krevje kodeendring — men det er **ikkje** del av dette oppdraget å gjere
den endringa.

Punkt merkt **P0** (R1, R12) bør avklarast før nokon sprint som rører
database-schema, sidan ein då arbeider utan ein verifiserbar referanse for
korleis dagens schema faktisk ser ut.
