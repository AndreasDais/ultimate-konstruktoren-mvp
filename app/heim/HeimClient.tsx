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
