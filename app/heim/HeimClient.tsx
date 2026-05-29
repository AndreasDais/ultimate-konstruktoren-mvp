"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import MarketingHeader from "@/app/components/MarketingHeader";
import { RegionModal } from "./RegionModal";

type Lang = "nb" | "en";

/* Små matte-hjelparar (språknøytrale symbol) ------------------ */
function MathSym({ v, sub }: { v: string; sub?: string }) {
  return (
    <span className="m">
      <span className="m-v">{v}</span>
      {sub ? <span className="m-sub is-up">{sub}</span> : null}
    </span>
  );
}

const COPY: Record<Lang, {
  eyebrow: string;
  h1: string;
  leadPre: string;
  leadEm: string;
  startCta: string;
  demoCta: string;
  fineprint: string;
  demoBar: string;
  you: string;
  demoInput: string;
  result: string; // tal med rett desimalteikn
  verdict: string;
  pipeEyebrow: string;
  pipeH2: string;
  pipeIntro: string;
  s1Title: string;
  s1Desc: string;
  s1Tags: [string, string, string];
  laneChip: string;
  engAName: string;
  engBName: string;
  methodA: [string, string];
  methodB: [string, string];
  engAStep1: string;
  engAStep2: string;
  engAStep3: string;
  engBSteps: [string, string, string];
  s3Title: string;
  s3Desc: string;
  cmpA: string; // "25.0 = 25.0"
  cmpB: string; // "20.0 = 20.0"
  match: string;
  s4Title: string;
  s4Desc: string;
  s4Tags: [string, string, string];
  s5Title: string;
  s5Desc: string;
  reportStrong: string;
  reportRest: string;
  footerNote: string;
  terms: string;
  termsHref: string;
}> = {
  nb: {
    eyebrow: "AI-konstruksjonsassistent",
    h1: "Skriv et konstruksjonsproblem. Få en kontrollert beregning.",
    leadPre:
      "To uavhengige AI-konstruktører regner samme problem med ulik metode. En tredje agent bekrefter at de er enige før resultatet presenteres. Du får et notat klart for faglig kontroll — ",
    leadEm: "ikke en svart boks.",
    startCta: "Start en beregning →",
    demoCta: "Se demo",
    fineprint: "Gratis for studenter · ingen kortinformasjon",
    demoBar: "Beregning · direkte",
    you: "Du",
    demoInput: "Fritt opplagt stålbjelke, L = 5,0 m, q = 8,0 kN/m",
    result: "25,0",
    verdict: "Konstruktør A og B enige",
    pipeEyebrow: "Prosessen",
    pipeH2: "Ett problem inn. To løsninger, sammenlignet, før du ser noe.",
    pipeIntro:
      "Hver beregning går gjennom fem agenter. Arbeidet deler seg i to slik at svaret blir kontrollert mot seg selv — så avgjør en kontrollør om det er trygt å vise.",
    s1Title: "Tolkeren leser oppgaven",
    s1Desc:
      "Forstår input, identifiserer fagområde og hvilke verdier som mangler før et eneste tall beregnes.",
    s1Tags: ["Leser input", "Identifiserer fagområde", "Flagger mangler"],
    laneChip: "Ser ikke hverandre",
    engAName: "Konstruktør A",
    engBName: "Konstruktør B",
    methodA: ["Lukket form ·", "førsteprinsipp"],
    methodB: ["Numerisk ·", "uavhengig metode"],
    engAStep1: "Faktorert lastverdi",
    engAStep2: "Nødvendig moment",
    engAStep3: "Nødvendig skjær",
    engBSteps: [
      "Faktorert last via lastkombinasjonssett",
      "Likevektskontroll for moment",
      "Diskretisert skjær og nedbøyning",
    ],
    s3Title: "Sammenligneren bekrefter enighet",
    s3Desc:
      "Kontrollerer at de to svarene stemmer overens — størrelse for størrelse — før noe vises. Et avvik stopper kjøringen.",
    cmpA: "25,0 = 25,0",
    cmpB: "20,0 = 20,0",
    match: "✓ samsvar",
    s4Title: "Kontrolløren vurderer",
    s4Desc:
      "Avgjør om det er trygt å vise resultatet, og flagger forbehold en kontrollerende ingeniør bør kjenne til.",
    s4Tags: ["Trygt å vise?", "Flagger forbehold", "Setter konfidens"],
    s5Title: "Et notat, klart for kontroll",
    s5Desc:
      "Et beregningsnotat du kan eksportere — hvert steg, forutsetning og forbehold lagt frem for faglig kontroll og signatur.",
    reportStrong: "Beregningsnotat",
    reportRest: " · PDF · Word · LaTeX — klart for faglig kontroll",
    footerNote: "AI-generert · eksperimentell · krever faglig kontroll",
    terms: "Vilkår",
    termsHref: "/vilkar",
  },
  en: {
    eyebrow: "AI Structural Assistant",
    h1: "Describe a structural problem. Get a checked calculation.",
    leadPre:
      "Two independent AI engineers solve the same problem with different methods. A third agent confirms they agree before the result is shown. You get a note ready for professional review — ",
    leadEm: "not a black box.",
    startCta: "Start a calculation →",
    demoCta: "See demo",
    fineprint: "Free for students · no card required",
    demoBar: "Calculation · live",
    you: "You",
    demoInput: "Simply-supported steel beam, L = 5.0 m, q = 8.0 kN/m",
    result: "25.0",
    verdict: "Engineer A and B agree",
    pipeEyebrow: "The pipeline",
    pipeH2: "One problem in. Two solutions, reconciled, before you see anything.",
    pipeIntro:
      "Every calculation runs through five agents. The work splits in two so the answer is checked against itself — then a controller decides if it is safe to present.",
    s1Title: "The interpreter reads the task",
    s1Desc:
      "Understands the input, identifies the discipline, and flags any values that are missing before a single number is computed.",
    s1Tags: ["Parses input", "Identifies discipline", "Flags missing values"],
    laneChip: "Neither sees the other",
    engAName: "Engineer A",
    engBName: "Engineer B",
    methodA: ["Closed form ·", "first principles"],
    methodB: ["Numerical ·", "independent method"],
    engAStep1: "Factored design load",
    engAStep2: "Required moment",
    engAStep3: "Required shear",
    engBSteps: [
      "Factored load via load-combination set",
      "Equilibrium cross-check for moment",
      "Discretised shear & deflection",
    ],
    s3Title: "The comparator confirms agreement",
    s3Desc:
      "Checks that the two answers match — quantity by quantity — before anything is shown. A disagreement halts the run.",
    cmpA: "25.0 = 25.0",
    cmpB: "20.0 = 20.0",
    match: "✓ match",
    s4Title: "The controller assesses",
    s4Desc:
      "Decides whether it is safe to present the result, and flags any caveats a reviewing engineer should know about.",
    s4Tags: ["Safe to present?", "Flags caveats", "Sets confidence"],
    s5Title: "A report, ready for review",
    s5Desc:
      "An exportable calculation note — every step, assumption and caveat laid out for a professional to check and sign.",
    reportStrong: "Calculation note",
    reportRest: " · PDF · Word · LaTeX — ready for professional review",
    footerNote: "AI-generated · experimental · requires professional review",
    terms: "Terms",
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

  const demoRef = useRef<HTMLDivElement>(null);

  // Scroll-reveal med mild stagger (frå Claude Design-mockupen).
  // CSS handterer reduced-motion (gjer .reveal synleg utan transition).
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".lp .reveal"));
    if (els.length === 0) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 4, 3) * 60}ms`;
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  // Demokort sjolvspelar: type "Du"-meldinga, fade inn formel + verdict.
  // .anim ligg alt i markup; .js-anim (init-script) skjuler radene foer paint
  // saa det ikkje flash-ar. Reduced-motion → vis ferdig tilstand med ein gong.
  useEffect(() => {
    const demo = demoRef.current;
    if (!demo) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      demo.classList.add("r1", "r2", "r3");
      return;
    }
    const youMsg = demo.querySelector<HTMLElement>(".demo__row.is-you .demo__msg");
    if (!youMsg) {
      demo.classList.add("r1", "r2", "r3");
      return;
    }
    const full = youMsg.textContent ?? "";
    youMsg.textContent = "";
    const caret = document.createElement("span");
    caret.className = "demo__caret";
    caret.setAttribute("aria-hidden", "true");
    youMsg.appendChild(caret);

    let cancelled = false;
    let timer = window.setTimeout(tick, 350);
    let i = 0;
    function tick() {
      if (cancelled || !youMsg) return;
      demo?.classList.add("r1");
      if (i <= full.length) {
        youMsg.textContent = full.slice(0, i);
        youMsg.appendChild(caret);
        i += 1;
        timer = window.setTimeout(tick, 20 + Math.random() * 26);
      } else {
        caret.remove();
        demo?.classList.add("r2");
        timer = window.setTimeout(() => demo?.classList.add("r3"), 1150);
      }
    }
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="lp">
      <MarketingHeader lang={lang} />

      <main>
        {/* ===================== HERO ===================== */}
        <section className="hero">
          <div className="hero__copy">
            <span className="eyebrow hero__eyebrow">{t.eyebrow}</span>
            <h1>{t.h1}</h1>
            <p className="hero__lead">
              {t.leadPre}
              <em>{t.leadEm}</em>
            </p>
            <div className="hero__cta">
              <Link className="btn btn--primary" href="/international">
                {t.startCta}
              </Link>
              <a className="btn btn--secondary" href="#how">
                {t.demoCta}
              </a>
            </div>
            <p className="hero__fineprint">{t.fineprint}</p>
          </div>

          {/* Signatur-demokort */}
          <div className="demo anim" ref={demoRef} aria-label="Pilar">
            <div className="demo__bar">
              <span className="demo__bar-label">{t.demoBar}</span>
              <span className="demo__bar-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className="demo__body">
              <div className="demo__row is-you">
                <span className="demo__who">{t.you}</span>
                <span className="demo__msg">{t.demoInput}</span>
              </div>
              <div className="demo__row is-pilar">
                <span className="demo__who">Pilar</span>
                <span className="demo__msg m">
                  <span className="m-v">M</span>
                  <span className="m-sub is-up">Ed</span>
                  <span className="m-op">=</span>
                  <span className="m-frac">
                    <span className="m-frac-n">
                      <span className="m-v">q</span>
                      <span className="m-sub is-up">Ed</span>
                      <span className="m-op" style={{ padding: "0 .18em" }}>·</span>
                      <span className="m-v">L</span>
                      <span className="m-sup">2</span>
                    </span>
                    <span className="m-frac-d">8</span>
                  </span>
                  <span className="m-op">=</span>
                  {t.result}
                  <span className="m-unit">kNm</span>
                </span>
              </div>
              <hr className="demo__hr" />
              <span className="demo__verdict">
                <span className="demo__verdict-dot" aria-hidden="true" />
                {t.verdict}
              </span>
            </div>
          </div>
        </section>

        {/* ===================== HOW IT WORKS ===================== */}
        <section className="pipeline" id="how">
          <div className="pipeline__inner">
            <div className="pipeline__head reveal">
              <span className="eyebrow">{t.pipeEyebrow}</span>
              <h2>{t.pipeH2}</h2>
              <p>{t.pipeIntro}</p>
            </div>

            <div className="flow">
              {/* 01 Tolkar */}
              <div className="stage reveal">
                <span className="node">01</span>
                <div className="stage__main">
                  <h3 className="stage__title">{t.s1Title}</h3>
                  <p className="stage__desc">{t.s1Desc}</p>
                  <div className="stage__meta">
                    {t.s1Tags.map((tag) => (
                      <span className="tag" key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* split */}
              <div className="branch reveal" aria-hidden="true">
                <span className="branch__stem" />
                <span className="branch__bar" />
                <span className="branch__drop is-l" />
                <span className="branch__drop is-r" />
              </div>

              {/* 02 To konstruktørar i parallell */}
              <div className="lanes reveal">
                <span className="lanes__divider" aria-hidden="true" />
                <span className="lanes__chip" aria-hidden="true">
                  <span className="lanes__chip-glyph">‖</span>
                  <span className="lanes__chip-label">{t.laneChip}</span>
                </span>

                <div className="engineer">
                  <div className="engineer__head">
                    <span className="engineer__id">
                      <span className="engineer__avatar">A</span>
                      <span className="engineer__name">{t.engAName}</span>
                    </span>
                    <span className="engineer__method">
                      {t.methodA[0]}
                      <br />
                      {t.methodA[1]}
                    </span>
                  </div>
                  <div className="engineer__body">
                    <div className="engineer__step">
                      <span className="engineer__tick">✓</span>
                      <span>
                        {t.engAStep1}{" "}
                        <MathSym v="q" sub="Ed" />
                      </span>
                    </div>
                    <div className="engineer__step">
                      <span className="engineer__tick">✓</span>
                      <span>
                        {t.engAStep2}{" "}
                        <span className="m">
                          <span className="m-v">M</span>
                          <span className="m-sub is-up">Ed</span>
                          <span className="m-op">=</span>
                          <span className="m-v">q</span>
                          <span className="m-sub is-up">Ed</span>
                          <span className="m-v">L</span>
                          <span className="m-sup">2</span>/8
                        </span>
                      </span>
                    </div>
                    <div className="engineer__step">
                      <span className="engineer__tick">✓</span>
                      <span>
                        {t.engAStep3}{" "}
                        <MathSym v="V" sub="Ed" />
                      </span>
                    </div>
                  </div>
                </div>

                <div className="engineer">
                  <div className="engineer__head">
                    <span className="engineer__id">
                      <span className="engineer__avatar">B</span>
                      <span className="engineer__name">{t.engBName}</span>
                    </span>
                    <span className="engineer__method">
                      {t.methodB[0]}
                      <br />
                      {t.methodB[1]}
                    </span>
                  </div>
                  <div className="engineer__body">
                    {t.engBSteps.map((step) => (
                      <div className="engineer__step" key={step}>
                        <span className="engineer__tick">✓</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* merge */}
              <div className="branch is-merge reveal" aria-hidden="true">
                <span className="branch__bar" />
                <span className="branch__drop is-l" />
                <span className="branch__drop is-r" />
                <span className="branch__stem" />
              </div>

              {/* 03 Samanliknar */}
              <div className="stage reveal">
                <span className="node">03</span>
                <div className="stage__main">
                  <h3 className="stage__title">{t.s3Title}</h3>
                  <p className="stage__desc">{t.s3Desc}</p>
                  <div className="compare-strip">
                    <span className="compare-row">
                      <MathSym v="M" sub="Ed" /> {t.cmpA}{" "}
                      <span className="compare-match">{t.match}</span>
                    </span>
                    <span className="compare-row">
                      <MathSym v="V" sub="Ed" /> {t.cmpB}{" "}
                      <span className="compare-match">{t.match}</span>
                    </span>
                    <span className="demo__verdict">
                      <span className="demo__verdict-dot" aria-hidden="true" />
                      {t.verdict}
                    </span>
                  </div>
                </div>
              </div>

              <div className="connector reveal" aria-hidden="true" />

              {/* 04 Kontrollør */}
              <div className="stage reveal">
                <span className="node">04</span>
                <div className="stage__main">
                  <h3 className="stage__title">{t.s4Title}</h3>
                  <p className="stage__desc">{t.s4Desc}</p>
                  <div className="stage__meta">
                    {t.s4Tags.map((tag) => (
                      <span className="tag" key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="connector reveal" aria-hidden="true" />

              {/* 05 Rapport */}
              <div className="stage stage--report reveal">
                <span className="node">05</span>
                <div className="stage__main">
                  <h3 className="stage__title">{t.s5Title}</h3>
                  <p className="stage__desc">{t.s5Desc}</p>
                  <div className="report-doc">
                    <span className="report-doc__icon" aria-hidden="true" />
                    <span className="report-doc__txt">
                      <strong>{t.reportStrong}</strong>
                      {t.reportRest}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===================== FOOTER ===================== */}
      <footer className="footer">
        <div className="footer__inner">
          <span className="footer__note">
            <span className="dot" aria-hidden="true" />
            {t.footerNote}
          </span>
          <Link className="footer__link" href={t.termsHref}>
            {t.terms}
          </Link>
        </div>
      </footer>

      {showRegionModal && <RegionModal lang={lang} />}
    </div>
  );
}
