# PILAR_PIPELINE_DATAFLOW.md

> Steg-for-steg dataflyt frå brukarinput til ferdig rapport.
> **Fakta** = sett i kode. **Antaking** = rimeleg slutning, ikkje verifisert.

---

## Overordna

**Fakta.** Pipelinen blir **orkestrert klientside** i `app/page.tsx`.
Det finst inga server-side orkestreringsrute som køyrer heile kjeda. Sida
kallar API-rutene i rekkjefølgje og held mellomtilstand i React-state.

Logisk kjede:
`Tolkar → init-run → Engineer A ∥ Engineer B → Comparator → Controller → Rapportør`

---

## Steg 1 — Brukarinput → Tolkar

**Filer:** `app/page.tsx` (sender), `app/api/input-agent/route.ts` (handsamar).

- `app/page.tsx` (~linje 744) sender brukar-input til `POST /api/input-agent`.
- `input-agent/route.ts` kan ta imot fil-opplasting (`mammoth` blir importert →
  Word-input blir konvertert til tekst; `Buffer.from(await file.arrayBuffer())`).
- Tolkar kallar Anthropic-modellen (`PIPELINE_MODEL`), klassifiserer input som
  `klar` / `delvis_klar` / `mangelfull` / `uklart` / `avvist`
  (status-definisjonar i `SYSTEM_PROMPT`).
- **Skriv til DB:** `requests` (insert), så `input_reviews` (insert).

**Dataobjekt vidare:** klienten får eit `input_review`-resultat (`result` i
`page.tsx`) + ein `request_id`.

---

## Steg 2 — init-run

**Fil:** `app/api/init-run/route.ts`.

- `app/page.tsx` (~linje 890) sender `POST /api/init-run` med `request_id`,
  `calculation_type`, valfri `run_type`.
- Rute hentar `user_id` frå session (anonym = OK), oppdaterer `requests.user_id`
  best-effort, og **insertar `calculation_runs`** med
  `run_status: "running"`, `agent_package_version: "agents_v0.2"`,
  `started_at`.
- Returnerer `{ run_id }`.

**Dataobjekt vidare:** `run_id` (UUID).

---

## Steg 3 — Engineer A og Engineer B (parallelt)

**Filer:** `app/page.tsx`, `app/api/agent-a/route.ts`, `app/api/agent-b/route.ts`,
`lib/stream-agent.ts`.

- `app/page.tsx` byggjer `agentBody = { run_id, input_review, locale,
  engineering_context }` og kallar **begge** via `streamAgent(...)`
  (~linje 919 og 939) — A og B køyrer uavhengig og parallelt.
- Streaming: `lib/stream-agent.ts` + `lib/partial-json.ts` les delvis JSON
  medan modellen genererer.
- **Skriv til DB:** kvar av `agent-a` og `agent-b` gjer
  `supabase.from("agent_outputs").insert({...})`.

**Dataobjekt vidare:** to `agent_outputs`-rader for same `run_id` (ei per
konstruktør). Antaking: skild på ein `agent`-/rolle-kolonne.

---

## Steg 4 — Comparator

**Filer:** `app/page.tsx` (~linje 1017), `app/api/agent-c/route.ts`,
`lib/compare/result-compare.ts`, `lib/compare/consistency-issues.ts`.

- `app/page.tsx` kallar `POST /api/agent-c` med `{ run_id, locale }`
  (antaking: rute les A/B-output frå DB sjølv).
- Comparator finn numeriske avvik og konsistens-issues mellom A og B.
- **Skriv til DB:** `comparisons` (insert).

**Dataobjekt vidare:** `comparison`-rad med `match_status`.

---

## Steg 5 — Controller

**Filer:** `app/page.tsx` (~linje 1038), `app/api/agent-d/route.ts`,
`lib/check/controller-hard-block.ts`, `lib/check/load-combination-check.ts`.

- `app/page.tsx` kallar `POST /api/agent-d` med `{ run_id, locale }`.
- Controller gjer endeleg fagvurdering:
  `approved` / `approved_with_warnings` / `uncertain` / `rejected`
  (status-namn sett i `agent-e`-prompten).
- **Skriv til DB:** `controller_decisions` (insert) **og**
  `calculation_runs` (update — antaking: set `run_status` til ferdig-tilstand).

**Dataobjekt vidare:** `controller_decision`-rad med `decision_status` +
oppdatert `calculation_runs`-rad.

---

## Steg 6 — Rapportør (rapport-prosa)

**Filer:** `app/api/agent-e/route.ts`,
`app/rapport/[run_id]/RapportLoadingPilelinja.tsx`.

- Agent-e blir kalla frå rapport-sida/-rutene (`RapportLoadingPilelinja.tsx`
  ~linje 169, og frå alle eksportrutene — sjå rapport-kartet).
- Agent-e **les** frå DB: `calculation_runs` (+ join `requests`),
  `input_reviews`, `agent_outputs`, `comparisons`, `controller_decisions`,
  og eksisterande `reports`-rad.
- **Cache-logikk:** `handleCache(...)` returnerer eksisterande `reports`-rad
  om ho finst. Berre `tillit_score`/`tillit_breakdown` blir rekna på nytt om
  dei er stale. **Prosaen blir IKKJE regenerert ved cache-treff.**
- Ved cache-miss kallar `callRapportor(...)` modellen og **insertar `reports`**
  med `executive_summary`, `technical_assessment`, `conclusion`,
  `prompt_version: "agent_e_v0.3"`, `tillit_score`, `tillit_breakdown`.

**Dataobjekt vidare:** `reports`-rad + rapportmodell (sjå rapport-kartet).

---

## Kvar ting blir lagra (oppsummert)

| Steg | Tabell | Operasjon |
|---|---|---|
| 1 Tolkar | `requests` | insert |
| 1 Tolkar | `input_reviews` | insert |
| 2 init-run | `calculation_runs` | insert |
| 2 init-run | `requests` | update (`user_id`) |
| 3 Engineer A | `agent_outputs` | insert |
| 3 Engineer B | `agent_outputs` | insert |
| 4 Comparator | `comparisons` | insert |
| 5 Controller | `controller_decisions` | insert |
| 5 Controller | `calculation_runs` | update |
| 6 Rapportør | `reports` | insert / update |

---

## Kvar det er risiko for datatap / feiltolking

1. **Klientside-orkestrering (P1).** Heile kjeda steg 3–5 blir driven av
   `app/page.tsx`. Lukkar brukaren fana mellom steg 3 og 5, blir
   `calculation_runs.run_status` ståande som `"running"`. Det finst ingen
   server-side «resume». Fil: `app/page.tsx`, `app/api/init-run/route.ts`.
2. **Rapport-cache vs promptendring (P1).** `agent-e` `handleCache` reknar
   ikkje på `prompt_version`. Eit run generert med eldre Rapportør-prompt vil
   framleis levere gammal prosa sjølv etter promptoppdatering.
   Fil: `app/api/agent-e/route.ts`.
3. **Antatt DB-rundtur i c/d.** `agent-c`/`agent-d` får berre `run_id` frå
   klienten og må lese A/B-output frå DB. Om eit insert i steg 3 feilar stille,
   kan c/d lese ufullstendig data. Bør verifiserast i a–d-rutene.
4. **Anonyme runs.** `user_id` kan vere `null` (forventa). Tap av kopling
   request↔bruker er akseptert design, men verdt å hugse ved feilsøking.
5. **Streaming-parsing.** `lib/partial-json.ts` tolkar delvis JSON undervegs;
   trunkerte/avbrotne straumar kan gje feiltolka mellomtilstand i UI.

---

## Punkt som treng betre logging seinare

- **Steg-overgangar.** `lib/step-metrics.ts` (`recordStepMetric`) finst og
  blir brukt — verifiser at *alle* seks stega faktisk loggar start/slutt og
  feil, ikkje berre nokre.
- **Cache-treff/-miss i agent-e** bør loggast eksplisitt (skil regenerert vs
  servert frå cache).
- **Run-avbrot.** Ingen logging fangar i dag at eit run vart forlate i
  `"running"`-status.
- **`agent_outputs`-insert-feil** i steg 3 bør loggast tydeleg, sidan c/d er
  avhengige av desse radene.

> Dette er observasjonar for seinare sprintar — **ingen** logging er lagt til
> eller endra i denne kartlegginga.
