# PILAR landingsside — implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bygg ein bilingual marknads-landingsside på `/heim` som funnelar til `/international`, med region-pop-up på første besøk.

**Architecture:** Ny rute `/heim` (`/` blir verande workbench). App-`<Header>` skjult på `/heim` via pathname-betinga wrapper; landinga rendrar eigen marknads-header. Region-modal på første besøk set `pilar-ui-mode`-cookie (no/intl) som heile appen alt les. Norsk default server-render; `router.refresh()` ved intl-val.

**Tech Stack:** Next.js App Router (server + client components), `app/tokens.css` designsystem, cookies (`pilar-ui-mode`, `pilar-locale`).

**Verifisering per task:** `npx tsc --noEmit --pretty false` (exit 0) + visuell sjekk via dev-server. **IKKJE** `npm run debug:sweep` — ein parallell Claude-økt skriv til `qa/evals/`, og sweep-gaten skriv same stad. Stage berre landing-filer; køyr `git status --short` før commit (parallell-økt jobbar i `scripts/` + `qa/evals/`).

**Konvensjonar:** Nynorsk kjeldekommentarar. ASCII commit-titlar (ingen æøå). CRLF + UTF-8. Eitt fokusert commit per task.

---

## Filstruktur

| Fil | Ansvar |
|---|---|
| `app/components/ConditionalAppHeader.tsx` (ny) | Klient-wrapper: skjul app-Header på `/heim` |
| `app/layout.tsx` (endra) | `<Header>` → `<ConditionalAppHeader>` |
| `app/components/MarketingHeader.tsx` (ny) | Landing-header: brand + språkkontroll + Logg inn |
| `app/heim/heim.css` (ny) | Pilar-native styling for heile landingssida |
| `app/heim/page.tsx` (ny) | Server: les cookies → vel språk → render HeimClient |
| `app/heim/HeimClient.tsx` (ny) | Klient: marknads-header + hero + korleis + footer + modal-mount |
| `app/heim/RegionModal.tsx` (ny) | Første-besøk region-pop-up |

---

## Task 1: ConditionalAppHeader + layout-wire

Skjuler app-headeren på `/heim` utan å flytte ruter. Trygt: før `/heim` finst, rendrar wrapperen alltid `<Header>` (pathname blir aldri `/heim`), så null åtferdsendring no.

**Files:**
- Create: `app/components/ConditionalAppHeader.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Lag ConditionalAppHeader**

Create `app/components/ConditionalAppHeader.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import Header, { type HeaderUiMode } from "./Header";

/**
 * Skjuler den globale app-headeren paa landingsruta /heim, som har sin eigen
 * marknads-header (MarketingHeader). Alle andre ruter faar app-headeren som foer.
 * usePathname er tilgjengeleg under SSR i App Router, saa ingen header-flash.
 */
export default function ConditionalAppHeader({
  uiMode,
}: {
  uiMode: HeaderUiMode;
}) {
  const pathname = usePathname();
  if (pathname === "/heim") return null;
  return <Header uiMode={uiMode} />;
}
```

- [ ] **Step 2: Wire inn i layout**

In `app/layout.tsx`, change the import line:

```tsx
import Header, { type HeaderUiMode } from "./components/Header";
```
to:
```tsx
import { type HeaderUiMode } from "./components/Header";
import ConditionalAppHeader from "./components/ConditionalAppHeader";
```

And in the JSX, change:
```tsx
          <Header uiMode={uiMode} />
```
to:
```tsx
          <ConditionalAppHeader uiMode={uiMode} />
```

- [ ] **Step 3: Verifiser tsc**

Run: `npx tsc --noEmit --pretty false`
Expected: exit 0, ingen feil.

- [ ] **Step 4: Visuell sjekk**

Open `/` and `/pilot` in dev-server. Expected: app-headeren viser som foer (uendra). `/heim` finst ikkje enno (404) — det er forventa.

- [ ] **Step 5: Commit**

```bash
git status --short
git add app/components/ConditionalAppHeader.tsx app/layout.tsx
git commit -m "PILAR: ConditionalAppHeader - skjul app-header paa /heim"
```

---

## Task 2: MarketingHeader

Eigen landing-header med brand, språkkontroll (nb|nn|EN) og Logg inn. Standalone — ikkje brukt enno.

**Files:**
- Create: `app/components/MarketingHeader.tsx`

- [ ] **Step 1: Lag MarketingHeader**

Create `app/components/MarketingHeader.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Lang = "nb" | "nn" | "en";

const LOGIN_LABEL: Record<Lang, string> = {
  nb: "Logg inn",
  nn: "Logg inn",
  en: "Log in",
};

const TAGLINE: Record<Lang, string> = {
  nb: "AI-KONSTRUKSJONSASSISTENT",
  nn: "AI-KONSTRUKSJONSASSISTENT",
  en: "AI STRUCTURAL ASSISTANT",
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export default function MarketingHeader({ lang }: { lang: Lang }) {
  const router = useRouter();

  function chooseLanguage(next: Lang) {
    if (next === lang) return;
    if (next === "en") {
      document.cookie = `pilar-ui-mode=intl; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    } else {
      document.cookie = `pilar-ui-mode=no; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
      document.cookie = `pilar-locale=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    }
    router.refresh();
  }

  return (
    <header className="heim-header">
      <Link href="/heim" className="heim-header__brand" aria-label="Pilar">
        <span className="heim-header__logo" aria-hidden="true">
          <span className="heim-header__logo-bar" />
          <span className="heim-header__logo-bar" />
        </span>
        <span className="heim-header__brand-text">
          <span className="heim-header__wordmark">Pilar</span>
          <span className="heim-header__tagline">{TAGLINE[lang]}</span>
        </span>
      </Link>

      <div className="heim-header__spacer" />

      <div className="heim-header__lang" role="group" aria-label="Spraak / Language">
        {(["nb", "nn", "en"] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => chooseLanguage(l)}
            className={`heim-header__lang-btn${l === lang ? " heim-header__lang-btn--active" : ""}`}
            aria-pressed={l === lang}
          >
            {l === "en" ? "EN" : l}
          </button>
        ))}
      </div>

      <Link href="/login" className="uk-btn uk-btn--sm">
        {LOGIN_LABEL[lang]}
      </Link>
    </header>
  );
}
```

- [ ] **Step 2: Verifiser tsc**

Run: `npx tsc --noEmit --pretty false`
Expected: exit 0. (Klassane `heim-header*` finst ikkje i CSS enno — det er greitt, dei kjem i Task 3.)

- [ ] **Step 3: Commit**

```bash
git status --short
git add app/components/MarketingHeader.tsx
git commit -m "PILAR: MarketingHeader - landing-header med spraakkontroll"
```

---

## Task 3: heim.css + landingsside (hero + korleis + footer)

Første synlege landingsside. App-header skjult (Task 1), marknads-header vist. Demo-formel som styla HTML (mono + `<sub>` + CSS-brøk), ikkje KaTeX.

**Files:**
- Create: `app/heim/heim.css`
- Create: `app/heim/page.tsx`
- Create: `app/heim/HeimClient.tsx`

- [ ] **Step 1: Lag heim.css**

Create `app/heim/heim.css`:

```css
/* =========================================================
   Landingsside (/heim) — Pilar-native. Arvar tokens.css
   sentralt (--bg/--surface/--fg/...). Ingen parallelt
   token-system, ingen palett-blokker — same grep som
   pilot.css / international.css.
   ========================================================= */

.heim-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--fg);
  display: flex;
  flex-direction: column;
}

/* ── Marknads-header ───────────────────────────────────── */
.heim-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 28px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.heim-header__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
}

.heim-header__logo {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.heim-header__logo-bar {
  width: 6px;
  height: 22px;
  background: var(--fg);
}

.heim-header__brand-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.1;
}

.heim-header__wordmark {
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: 18px;
  color: var(--fg);
  letter-spacing: -0.02em;
}

.heim-header__tagline {
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--fg-muted);
  text-transform: uppercase;
}

.heim-header__spacer {
  flex: 1;
}

.heim-header__lang {
  display: inline-flex;
  border: 1px solid var(--border-2);
  border-radius: var(--r-sm);
  overflow: hidden;
  background: var(--surface);
}

.heim-header__lang-btn {
  appearance: none;
  background: transparent;
  border: none;
  padding: 6px 11px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--fg-muted);
  cursor: pointer;
  transition: background 120ms, color 120ms;
}

.heim-header__lang-btn:hover {
  background: var(--surface-2);
  color: var(--fg);
}

.heim-header__lang-btn--active,
.heim-header__lang-btn--active:hover {
  background: var(--fg);
  color: var(--surface);
}

/* ── Hero ──────────────────────────────────────────────── */
.heim-hero {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 64px 28px 48px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 0.85fr);
  gap: 48px;
  align-items: center;
}

.heim-eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-muted);
  margin: 0 0 18px;
}

.heim-hero h1 {
  margin: 0 0 20px;
  font-family: var(--font-serif);
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.08;
  color: var(--fg);
}

.heim-lead {
  margin: 0 0 28px;
  font-size: 1.05rem;
  line-height: 1.65;
  color: var(--fg-muted);
  max-width: 48ch;
}

.heim-cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.heim-fineprint {
  margin: 16px 0 0;
  font-size: 12px;
  color: var(--fg-muted);
}

/* ── Demo-kort ─────────────────────────────────────────── */
.heim-demo-card {
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--surface);
  box-shadow: var(--shadow-md);
  padding: 28px;
}

.heim-demo-row {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 14px;
  align-items: baseline;
}

.heim-demo-row + .heim-demo-row {
  margin-top: 16px;
}

.heim-demo-label {
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fg-muted);
}

.heim-demo-input {
  font-size: 14px;
  color: var(--fg-2);
  line-height: 1.5;
}

.heim-demo-formula {
  font-family: var(--font-mono);
  font-size: 15px;
  color: var(--fg);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.heim-frac {
  display: inline-flex;
  flex-direction: column;
  text-align: center;
  vertical-align: middle;
}

.heim-frac__num {
  border-bottom: 1px solid var(--fg-2);
  padding: 0 6px 2px;
}

.heim-frac__den {
  padding: 2px 6px 0;
}

.heim-demo-badge-row {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

/* ── Korleis det fungerer ──────────────────────────────── */
.heim-how {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 32px 28px 72px;
}

.heim-how h2 {
  margin: 0 0 28px;
  font-family: var(--font-serif);
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--fg);
}

.heim-steps {
  display: grid;
  gap: 12px;
}

.heim-step {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 16px;
  align-items: start;
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  background: var(--surface);
  padding: 16px 18px;
}

.heim-step__num {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
}

.heim-step__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--fg);
  margin: 0 0 4px;
}

.heim-step__body {
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--fg-muted);
  margin: 0;
}

/* ── Footer (disclaimer) ───────────────────────────────── */
.heim-footer {
  margin-top: auto;
  border-top: 1px solid var(--border);
  background: var(--surface);
  padding: 20px 28px;
  text-align: center;
  font-size: 12px;
  color: var(--fg-muted);
}

.heim-footer a {
  color: var(--fg-2);
  text-decoration: underline;
}

@media (max-width: 860px) {
  .heim-hero {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 40px 18px 32px;
  }
  .heim-header { padding: 12px 16px; gap: 10px; }
  .heim-header__tagline { display: none; }
  .heim-how { padding: 24px 18px 52px; }
}
```

- [ ] **Step 2: Lag server-sida page.tsx**

Create `app/heim/page.tsx`:

```tsx
import { cookies } from "next/headers";
import type { Metadata } from "next";
import HeimClient from "./HeimClient";
import "./heim.css";

export const metadata: Metadata = {
  title: "Pilar — AI-konstruksjonsassistent",
  description: "AI-basert konstruksjonsassistent. Skriv eit konstruksjonsproblem, faa ein kontrollert berekning.",
};

type Lang = "nb" | "nn" | "en";

export default async function HeimPage() {
  const c = await cookies();
  const uiMode = c.get("pilar-ui-mode")?.value;
  const locale = c.get("pilar-locale")?.value;

  const lang: Lang = uiMode === "intl" ? "en" : locale === "nn" ? "nn" : "nb";
  // Modal viser berre naar brukaren ikkje har valt region enno.
  const hasRegionChoice = uiMode === "intl" || uiMode === "no";

  return <HeimClient lang={lang} showRegionModal={!hasRegionChoice} />;
}
```

- [ ] **Step 3: Lag HeimClient.tsx**

Create `app/heim/HeimClient.tsx`:

```tsx
"use client";

import Link from "next/link";
import MarketingHeader from "@/app/components/MarketingHeader";
import { RegionModal } from "./RegionModal";

type Lang = "nb" | "nn" | "en";

const COPY: Record<Lang, {
  eyebrow: string;
  title: string;
  lead: string;
  start: string;
  demo: string;
  fineprint: string;
  demoYou: string;
  demoInput: string;
  agree: string;
  howTitle: string;
  steps: { title: string; body: string }[];
  disclaimer: string;
  termsLabel: string;
  termsHref: string;
}> = {
  nb: {
    eyebrow: "AI-KONSTRUKSJONSASSISTENT",
    title: "Skriv et konstruksjonsproblem. Få en kontrollert beregning.",
    lead: "To uavhengige AI-konstruktører regner samme problem med ulik metode. En tredje agent bekrefter at de er enige før resultatet presenteres. Du får et notat klart for faglig kontroll — ikke en svart boks.",
    start: "Start en beregning →",
    demo: "Se demo",
    fineprint: "Gratis for studenter · ingen kortinformasjon",
    demoYou: "DU",
    demoInput: "Fritt opplagd stålbjelke, L = 5,0 m, q = 8,0 kN/m",
    agree: "KONSTRUKTØR A OG B ENIGE",
    howTitle: "Korleis det fungerer",
    steps: [
      { title: "Tolkeren leser oppgaven", body: "Forstår input, identifiserer fagområde og hvilke verdier som mangler." },
      { title: "Konstruktør A + B regner uavhengig", body: "To agenter løser samme problem med ulik metode, uten å se hverandres svar." },
      { title: "Sammenligneren bekrefter enighet", body: "Kontrollerer at de to svarene stemmer overens før noe vises." },
      { title: "Kontrolløren vurderer", body: "Avgjør om resultatet er trygt nok å presentere, og flagger forbehold." },
      { title: "Rapport klar for kontroll", body: "Et beregningsnotat du kan eksportere og få faglig kontrollert." },
    ],
    disclaimer: "AI-generert · eksperimentell · krever faglig kontroll",
    termsLabel: "Vilkår",
    termsHref: "/vilkar",
  },
  nn: {
    eyebrow: "AI-KONSTRUKSJONSASSISTENT",
    title: "Skriv eit konstruksjonsproblem. Få ein kontrollert berekning.",
    lead: "To uavhengige AI-konstruktørar reknar same problem med ulik metode. Ein tredje agent stadfestar at dei er einige før resultatet er presentert. Du får eit notat klart for fagleg kontroll — ikkje ei svart boks.",
    start: "Start ein berekning →",
    demo: "Sjå demo",
    fineprint: "Gratis for studentar · ingen kortinformasjon",
    demoYou: "DU",
    demoInput: "Fritt opplagd stålbjelke, L = 5,0 m, q = 8,0 kN/m",
    agree: "KONSTRUKTØR A OG B EINIGE",
    howTitle: "Korleis det fungerer",
    steps: [
      { title: "Tolkar les oppgåva", body: "Forstår input, identifiserer fagområde og kva verdiar som manglar." },
      { title: "Konstruktør A + B reknar uavhengig", body: "To agentar løyser same problem med ulik metode, utan å sjå kvarandre sine svar." },
      { title: "Samanliknar stadfestar semje", body: "Kontrollerer at dei to svara stemmer overeins før noko visast." },
      { title: "Kontrollør vurderer", body: "Avgjer om resultatet er trygt nok å vise, og flaggar forbehald." },
      { title: "Rapport klar for kontroll", body: "Eit berekningsnotat du kan eksportere og få fagleg kontrollert." },
    ],
    disclaimer: "AI-generert · eksperimentell · krev fagleg kontroll",
    termsLabel: "Vilkår",
    termsHref: "/vilkar",
  },
  en: {
    eyebrow: "AI STRUCTURAL ASSISTANT",
    title: "Describe a structural problem. Get a checked calculation.",
    lead: "Two independent AI engineers solve the same problem with different methods. A third agent confirms they agree before the result is shown. You get a note ready for professional review — not a black box.",
    start: "Start a calculation →",
    demo: "See demo",
    fineprint: "Free for students · no card required",
    demoYou: "YOU",
    demoInput: "Simply-supported steel beam, L = 5.0 m, q = 8.0 kN/m",
    agree: "ENGINEER A AND B AGREE",
    howTitle: "How it works",
    steps: [
      { title: "The interpreter reads the task", body: "Understands the input, identifies the discipline and which values are missing." },
      { title: "Engineer A + B compute independently", body: "Two agents solve the same problem with different methods, without seeing each other's answers." },
      { title: "The comparator confirms agreement", body: "Checks that the two answers match before anything is shown." },
      { title: "The controller assesses", body: "Decides whether the result is safe enough to present, and flags caveats." },
      { title: "Report ready for review", body: "A calculation note you can export and have professionally checked." },
    ],
    disclaimer: "AI-generated · experimental · requires professional review",
    termsLabel: "Terms",
    termsHref: "/terms",
  },
};

export default function HeimClient({
  lang,
  showRegionModal,
}: {
  lang: Lang;
  showRegionModal: boolean;
}) {
  const t = COPY[lang];

  return (
    <div className="heim-page">
      <MarketingHeader lang={lang} />

      <section className="heim-hero">
        <div>
          <p className="heim-eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className="heim-lead">{t.lead}</p>
          <div className="heim-cta-row">
            <Link href="/international" className="uk-btn uk-btn--primary">
              {t.start}
            </Link>
            <a href="#korleis" className="uk-btn">
              {t.demo}
            </a>
          </div>
          <p className="heim-fineprint">{t.fineprint}</p>
        </div>

        <div className="heim-demo-card" aria-hidden="true">
          <div className="heim-demo-row">
            <span className="heim-demo-label">{t.demoYou}</span>
            <span className="heim-demo-input">{t.demoInput}</span>
          </div>
          <div className="heim-demo-row">
            <span className="heim-demo-label">PILAR</span>
            <span className="heim-demo-formula">
              M<sub>Ed</sub> =
              <span className="heim-frac">
                <span className="heim-frac__num">q<sub>Ed</sub>·L²</span>
                <span className="heim-frac__den">8</span>
              </span>
              = 25,0 kNm
            </span>
          </div>
          <div className="heim-demo-badge-row">
            <span className="uk-badge uk-badge--ok">{t.agree}</span>
          </div>
        </div>
      </section>

      <section className="heim-how" id="korleis">
        <h2>{t.howTitle}</h2>
        <div className="heim-steps">
          {t.steps.map((s, i) => (
            <div className="heim-step" key={i}>
              <span className="heim-step__num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="heim-step__title">{s.title}</p>
                <p className="heim-step__body">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="heim-footer">
        {t.disclaimer} · <Link href={t.termsHref}>{t.termsLabel}</Link>
      </footer>

      {showRegionModal && <RegionModal lang={lang} />}
    </div>
  );
}
```

- [ ] **Step 4: Midlertidig modal-stubb**

RegionModal kjem i Task 4, men HeimClient importerer han. Lag ein minimal stubb saa Task 3 kompilerer og er testbar aaleine. Create `app/heim/RegionModal.tsx`:

```tsx
"use client";

type Lang = "nb" | "nn" | "en";

// Stubb — full implementasjon i Task 4.
export function RegionModal({ lang: _lang }: { lang: Lang }) {
  return null;
}
```

- [ ] **Step 5: Verifiser tsc**

Run: `npx tsc --noEmit --pretty false`
Expected: exit 0.

- [ ] **Step 6: Visuell sjekk**

Open `/heim` in dev-server. Expected: marknads-header (Pilar-logo + nb|nn|EN + Logg inn), serif-hero med to CTA-ar, demo-kort med formel + grøn "EINIGE"-pill, "Korleis det fungerer" med 5 steg, footer med disclaimer. Klikk "Sjå demo" → scroll til korleis-seksjonen. Klikk nb|nn|EN → copy byter språk. App-header skal IKKJE vise. Sjekk slate/stone/graphite.

- [ ] **Step 7: Commit**

```bash
git status --short
git add app/heim/heim.css app/heim/page.tsx app/heim/HeimClient.tsx app/heim/RegionModal.tsx
git commit -m "PILAR: /heim landingsside - hero, korleis-seksjon, footer (Pilar-native)"
```

---

## Task 4: RegionModal (første-besøk pop-up)

Erstattar stubben med ekte modal. Viser på første besøk (ingen `pilar-ui-mode`-cookie). Norge → `pilar-ui-mode=no` + lukk; Anna område → `pilar-ui-mode=intl` + `router.refresh()`. Focus-trap/ESC/backdrop-mønster frå `feilrapport-modal.tsx`.

**Files:**
- Modify: `app/heim/RegionModal.tsx` (erstatt stubben heilt)
- Modify: `app/heim/heim.css` (legg til modal-stilar)

- [ ] **Step 1: Erstatt RegionModal med full implementasjon**

Replace the entire content of `app/heim/RegionModal.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Lang = "nb" | "nn" | "en";

const COPY: Record<Lang, {
  title: string;
  body: string;
  norway: string;
  other: string;
}> = {
  nb: {
    title: "Hvor jobber du?",
    body: "Vi tilpasser språk og standarder. Du kan endre dette når som helst.",
    norway: "Norge",
    other: "Annet område",
  },
  nn: {
    title: "Kor jobbar du?",
    body: "Vi tilpassar språk og standardar. Du kan endre dette når som helst.",
    norway: "Noreg",
    other: "Anna område",
  },
  en: {
    title: "Where do you work?",
    body: "We tailor language and standards. You can change this at any time.",
    norway: "Norway",
    other: "Other region",
  },
};

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function RegionModal({ lang }: { lang: Lang }) {
  const router = useRouter();
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  const t = COPY[lang];

  // Body-scroll-lock + fokus foerste knapp + ESC vel Norge (trygg default).
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => firstBtnRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        choose("no");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(region: "no" | "intl") {
    document.cookie = `pilar-ui-mode=${region}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="heim-modal-backdrop" role="presentation">
      <div
        className="heim-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="heim-modal-title"
      >
        <h2 id="heim-modal-title" className="heim-modal__title">{t.title}</h2>
        <p className="heim-modal__body">{t.body}</p>
        <div className="heim-modal__actions">
          <button
            ref={firstBtnRef}
            type="button"
            className="uk-btn uk-btn--primary"
            onClick={() => choose("no")}
          >
            {t.norway}
          </button>
          <button
            type="button"
            className="uk-btn"
            onClick={() => choose("intl")}
          >
            {t.other}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Legg til modal-stilar i heim.css**

Append to `app/heim/heim.css`:

```css
/* ── Region-modal ──────────────────────────────────────── */
.heim-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.45);
}

.heim-modal {
  width: min(440px, 100%);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  background: var(--surface);
  box-shadow: var(--shadow-md);
  padding: 28px;
}

.heim-modal__title {
  margin: 0 0 8px;
  font-family: var(--font-serif);
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--fg);
}

.heim-modal__body {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--fg-muted);
}

.heim-modal__actions {
  display: flex;
  gap: 12px;
}

.heim-modal__actions .uk-btn {
  flex: 1;
  height: 40px;
  justify-content: center;
}
```

- [ ] **Step 3: Verifiser tsc**

Run: `npx tsc --noEmit --pretty false`
Expected: exit 0.

- [ ] **Step 4: Visuell sjekk**

Slett `pilar-ui-mode`-cookien (DevTools → Application → Cookies) og reload `/heim`. Expected: modal viser over dimma backdrop. "Norge" → modal lukkar, norsk variant. Slett cookie igjen, reload, "Anna område" → engelsk variant. Reload paa nytt → ingen modal (cookie sett). ESC → vel Norge. Sjekk at backdrop dekkjer innhaldet.

- [ ] **Step 5: Commit**

```bash
git status --short
git add app/heim/RegionModal.tsx app/heim/heim.css
git commit -m "PILAR: region-pop-up paa /heim foerste besoek (set ui-mode cookie)"
```

---

## Self-review-notat

- **Spec-dekning:** Rute /heim (Task 3), app-header skjult (Task 1), marknads-header (Task 2), region-modal (Task 4), nb/nn/en copy + språkbyte (Task 2+3), hero med CTA-ar + demo-kort (Task 3), korleis-seksjon som anchor (Task 3), disclaimer-footer (Task 3), Pilar-tokens (Task 3 CSS). Alle spec-punkt dekt.
- **Demo-formel:** styla HTML (mono + `<sub>` + `.heim-frac` CSS-brøk), ikkje KaTeX — sjølv-innehalde, ingen hydrerings-risiko.
- **Type-konsistens:** `Lang = "nb"|"nn"|"en"` brukt likt i alle filer. `MarketingHeader`-prop `lang`, `RegionModal`-prop `lang`, `HeimClient`-props `lang`+`showRegionModal` — konsistente mellom stubb (Task 3) og full (Task 4).
- **Cookie-konsistens:** `pilar-ui-mode` (no/intl) + `pilar-locale` (nb/nn) — same cookienamn som resten av appen les.
- **Parallell-økt:** einaste delte fil er `app/layout.tsx` (Task 1). Køyr `git status --short` før kvar commit; stage berre namngjevne landing-filer.
