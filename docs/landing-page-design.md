# PILAR landingsside — design

**Dato:** 2026-05-28
**Status:** Godkjent design, klar for implementeringsplan
**Brainstorma med:** Raymart + Claude Code

---

## Mål

Ein marknads-landingsside for PILAR med to språkvariantar (norsk + engelsk). Norske
brukarar får norsk variant, andre område får engelsk (internasjonal) variant.
Hovud-CTA sender alle til `/international` (òg norske — dei vel region der).
Landingssida er reint marknadsføring/funnel; ingen berekningslogikk.

---

## Arkitektur-avgjerder

### 1. Plassering
- Ny rute **`app/heim/page.tsx`** (server component).
- `/` blir **verande workbench-appen** — ingen flytting, ingen risiko for
  eksisterande djuplenkjer (`/?from_run=…`, `/?from_request=…` frå /mine).
- Landingssida kan promoterast til `/` i ein **seinare, eigen sprint** når ho er
  prøvd. Ikkje no.

### 2. Header — eigen marknads-header utan invasiv refaktor
- Root-layouten (`app/layout.tsx`) wrappar i dag alle ruter med app-`<Header>`.
- I staden for å flytte alle ~12 ruter inn i ei `(app)`-rutegruppe (som ville
  knekt relative importar), brukar vi ein **pathname-betinga wrapper**:
  - Ny `app/components/ConditionalAppHeader.tsx` (klient): kallar `usePathname()`,
    returnerer `null` på `/heim`, elles `<Header uiMode={…} />`.
  - `app/layout.tsx` byter `<Header …/>` mot `<ConditionalAppHeader …/>`.
- Landingssida rendrar sin eigen **`app/components/MarketingHeader.tsx`**:
  brand (Pilar-logo + wordmark) + språkkontroll (nb|nn|EN) + "Logg inn"-lenke.
  (Disclaimer ligg i footeren, ikkje headeren — sjå Sideinnhald.)

### 3. Region-pop-up (deteksjon)
- **Berre pop-up — inga Accept-Language-sniffing.**
- Server rendrar **norsk default** når `pilar-ui-mode`-cookie manglar (Pilar er
  norsk-først).
- Klient-modal `app/heim/RegionModal.tsx` viser seg på **første besøk** (ingen
  `pilar-ui-mode`-cookie), berre på `/heim`:
  - Spørsmål: "Kor jobbar du?" → **[Norge]** / **[Anna område]**
  - **Norge** → set `pilar-ui-mode=no`, lukk modal (innhald allereie norsk).
  - **Anna område** → set `pilar-ui-mode=intl`, `router.refresh()` → engelsk variant.
- Modalen gjenbrukar focus-trap/ESC/backdrop-mønsteret frå
  `app/rapport/[run_id]/feilrapport-modal.tsx`.
- Modalen sin jobb er **berre språkvariant** (no/intl). Faktisk
  ingeniør-region/standard veljast framleis på `/international`.
- Cookien `pilar-ui-mode` er den same som heile appen alt les (layout, /pilot,
  /mine, /innstillingar, rapport) — eitt val propagerer overalt.

### 4. Språkvariantar + -byte
- Copy som `Record<"nb"|"nn"|"en", string>` — same mønster som /pilot,
  /international, /mine osv.
- Norsk variant respekterer eksisterande `pilar-locale`-cookie (nn/nb, default nb).
- Språkkontroll i marknads-header: **nb | nn | EN**.
  - EN set `pilar-ui-mode=intl`; nb/nn ryddar intl-modus + set `pilar-locale`.
- Server vel variant: `pilar-ui-mode=intl` → en; elles `pilar-locale` (nb/nn).

---

## Sideinnhald

### Hero
- Mono-eyebrow: "AI-KONSTRUKSJONSASSISTENT" / "AI STRUCTURAL ASSISTANT"
- Serif-headline (var(--font-doc)):
  - nb: "Skriv et konstruksjonsproblem. Få en kontrollert beregning."
  - nn: "Skriv eit konstruksjonsproblem. Få ein kontrollert berekning."
  - en: "Describe a structural problem. Get a checked calculation."
- Lead-paragraf (to-konstruktør-forklaringa, eksisterande tekst frå eksempelet).
- CTA-ar:
  - Primær **"Start ein berekning →"** (`.uk-btn--primary`) → `/international`
  - Sekundær **"Sjå demo"** (`.uk-btn`) → anchor `#korleis`
- Demo-kort (`.uk-card`):
  - DU-input: "Fritt opplagd stålbjelke, L = 5,0 m, q = 8,0 kN/m"
  - PILAR-formel via KaTeX: `M_Ed = q_Ed·L²/8 = 25,0 kNm`
  - Grøn pill (`.uk-badge--ok`): "KONSTRUKTØR A OG B EINIGE" / "ENGINEER A AND B AGREE"

### "Korleis det fungerer" (`id="korleis"` — demo-anchor)
- Stegvis pipeline-forklaring, 5 steg med mono steg-nummer:
  1. Tolkar les og tolkar oppgåva
  2. Konstruktør A + B reknar uavhengig (ulik metode)
  3. Samanliknar stadfestar at dei er einige
  4. Kontrollør vurderer om resultatet er trygt å vise
  5. Rapport — klar for fagleg kontroll
- Token-styling (kort/stripe-mønster frå tokens.css).

### Disclaimer-line (tynn)
- Éi line i ein **minimal footer** (ikkje i headeren — den held seg rein):
  - nb/nn: "AI-generert · eksperimentell · krev fagleg kontroll" + lenke `/vilkar`
  - en: "AI-generated · experimental · requires professional review" + lenke `/terms`
- Footeren er del av `/heim`-innhaldet (ikkje global).

---

## Designsystem

Alt frå `app/tokens.css` — same som dei 6 sidene som nyleg blei migrerte til
Pilar-native:
- Fargar: `--bg`/`--surface`/`--fg`/`--border`/`--ok*` osv. (følgjer slate/stone/graphite)
- Knappar: `.uk-btn` / `.uk-btn--primary`
- Merke: `.uk-badge` / `.uk-badge--ok`
- Serif-headline: `var(--font-doc)` (Konsulent-notat-estetikk)
- Eyebrows: mono, 11px, 500, 0.08em
- Radius: `--r-lg`/`--r-md`/`--r-sm`; skugge: `--shadow-md`
- Eigen `app/heim/heim.css`, arvar tokens sentralt (ingen parallelt token-system,
  ingen palett-blokker — same grep som pilot.css/international.css).

---

## YAGNI — ikkje med i denne sprinten

- Verdi-kort (3 stk)
- Målgruppe-split (studentar/konsulentar)
- Pris-seksjon
- Marknads-nav-lenkjer til ruter som ikkje finst (Korleis det fungerer som
  eigen rute, Pris osv.)
- Auto-deteksjon via Accept-Language
- Flytting av landing til `/` (eigen seinare sprint)

---

## Filer

**Nye:**
- `app/heim/page.tsx` — server component, les cookies, vel variant
- `app/heim/HeimClient.tsx` — klient-innhald (hero, korleis, modal-mount)
- `app/heim/RegionModal.tsx` — første-besøk region-pop-up
- `app/heim/heim.css` — Pilar-native styling
- `app/components/MarketingHeader.tsx` — landing-header
- `app/components/ConditionalAppHeader.tsx` — pathname-betinga app-header-wrapper

**Endra:**
- `app/layout.tsx` — `<Header>` → `<ConditionalAppHeader>`

---

## Verifisering

- `npx tsc --noEmit` grøn.
- Manuell: besøk `/heim` utan cookie → modal viser. Vel Norge → norsk, lukk.
  Vel Anna område → engelsk. Reload → ingen modal (cookie sett).
- Header-språkbyte nb|nn|EN endrar copy + cookie.
- "Start ein berekning" → `/international`. "Sjå demo" → scroll til `#korleis`.
- App-header skjult på `/heim`, synleg på alle andre ruter.
- Alle tre palettar (slate/stone/graphite) ser rett ut.
- Ingen ny lint-warning (baseline: 93).

---

## Risiko

- **ConditionalAppHeader hydrering:** `usePathname()` er tilgjengeleg på server i
  App Router, så ingen flash. Verifiser at app-header ikkje blinkar på `/heim`.
- **Modal-flash for internasjonale:** norsk default rendrast bak dimma backdrop;
  `router.refresh()` byter til engelsk etter val. Akseptabelt — modalen dekkjer
  innhaldet til val er gjort.
- **Parallell Claude-økt:** arbeider i `scripts/` + `qa/evals/`. Landing-arbeidet
  er i `app/heim/` + `app/components/` + `app/layout.tsx` — minimal overlapp.
  `app/layout.tsx` er einaste delte fila; sjekk `git status` før commit.
