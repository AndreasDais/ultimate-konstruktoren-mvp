"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import { PILOT_EXAMPLES } from "@/lib/pilot/examples";
import type { HeaderUiMode } from "../components/Header";
import "./pilot.css";

type LangKey = "nb" | "nn" | "en";

const COPY: Record<LangKey, {
  eyebrow: string;
  title: string;
  lead: string;
  startOwn: string;
  mine: string;
  examplesLabel: string;
  showInput: string;
  noteTitle: string;
  noteText: string;
}> = {
  nb: {
    eyebrow: "PILAR · Pilot",
    title: "Test PILAR med ferdige oppgaver",
    lead:
      "Målet med piloten er å se om PILAR kan hjelpe byggingeniørstudenter med å tolke, beregne, kontrollere og dokumentere konstruksjonsoppgaver raskere og ryddigare.",
    startOwn: "Start med egen oppgave",
    mine: "Mine rapporter",
    examplesLabel: "Pilotoppgaver",
    showInput: "Vis eksempelinput",
    noteTitle: "Viktig for pilot",
    noteText:
      "PILAR er et AI-generert lærings- og dokumentasjonsverktøy. Resultat skal alltid kontrolleres av kvalifisert fagperson før bruk i prosjektering.",
  },
  nn: {
    eyebrow: "PILAR · Pilot",
    title: "Test PILAR med ferdige oppgåver",
    lead:
      "Målet med piloten er å sjå om PILAR kan hjelpe byggingeniørstudentar med å tolke, berekne, kontrollere og dokumentere konstruksjonsoppgåver raskare og ryddigare.",
    startOwn: "Start med eiga oppgåve",
    mine: "Mine rapportar",
    examplesLabel: "Pilotoppgåver",
    showInput: "Vis eksempelinput",
    noteTitle: "Viktig for pilot",
    noteText:
      "PILAR er eit AI-generert lærings- og dokumentasjonsverktøy. Resultat skal alltid kontrollerast av kvalifisert fagperson før bruk i prosjektering.",
  },
  en: {
    eyebrow: "PILAR · Pilot",
    title: "Try PILAR with ready-made tasks",
    lead:
      "The pilot's goal is to see whether PILAR can help structural engineering students interpret, calculate, check and document design tasks faster and more clearly.",
    startOwn: "Start with your own task",
    mine: "My reports",
    examplesLabel: "Pilot tasks",
    showInput: "Show example input",
    noteTitle: "Important for the pilot",
    noteText:
      "PILAR is an AI-generated learning and documentation tool. Results must always be verified by a qualified engineer before use in real design work.",
  },
};

type Props = {
  uiMode: HeaderUiMode;
};

export default function PilotClient({ uiMode }: Props) {
  const { locale } = useLocale();
  const langKey: LangKey = uiMode === "intl" ? "en" : locale;
  const T = COPY[langKey];

  return (
    <main className="pilot-page">
      <section className="pilot-hero">
        <p className="uk-eyebrow">{T.eyebrow}</p>
        <h1>{T.title}</h1>
        <p className="pilot-lead">{T.lead}</p>
        <div className="pilot-actions">
          <Link href="/" className="uk-btn uk-btn--primary">
            {T.startOwn}
          </Link>
          <Link href="/mine" className="uk-btn">
            {T.mine}
          </Link>
        </div>
      </section>

      <section className="pilot-grid" aria-label={T.examplesLabel}>
        {PILOT_EXAMPLES.map((example) => (
          <article className="pilot-example-card" key={example.id}>
            <div className="pilot-card-topline uk-eyebrow">
              <span>{example.difficulty}</span>
              <span>{example.tags.slice(0, 2).join(" · ")}</span>
            </div>
            <h2>{example.title[locale]}</h2>
            <p>{example.description[locale]}</p>
            <details>
              <summary>{T.showInput}</summary>
              <pre>{example.prompt[locale]}</pre>
            </details>
          </article>
        ))}
      </section>

      <section className="pilot-note">
        <h2>{T.noteTitle}</h2>
        <p>{T.noteText}</p>
      </section>
    </main>
  );
}
