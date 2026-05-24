"use client";

import Link from "next/link";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/locale";
import { PILOT_EXAMPLES } from "@/lib/pilot/examples";
import "./pilot.css";

const COPY: Record<Locale, {
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
      "Målet med piloten er å se om PILAR kan hjelpe byggingeniørstudenter med å tolke, beregne, kontrollere og dokumentere konstruksjonsoppgaver raskere og ryddigere.",
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
};

export default function PilotPage() {
  const { locale } = useLocale();
  const T = COPY[locale];

  return (
    <main className="pilot-page">
      <section className="pilot-hero">
        <p className="pilot-eyebrow">{T.eyebrow}</p>
        <h1>{T.title}</h1>
        <p className="pilot-lead">{T.lead}</p>
        <div className="pilot-actions">
          <Link href="/" className="pilot-button primary">
            {T.startOwn}
          </Link>
          <Link href="/mine" className="pilot-button secondary">
            {T.mine}
          </Link>
        </div>
      </section>

      <section className="pilot-grid" aria-label={T.examplesLabel}>
        {PILOT_EXAMPLES.map((example) => (
          <article className="pilot-example-card" key={example.id}>
            <div className="pilot-card-topline">
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
