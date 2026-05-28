"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { PILOT_EXAMPLES } from "@/lib/pilot/examples";
import {
  ENGINEERING_CONTEXT_STORAGE_KEY,
  type EngineeringStandardFamily,
} from "@/lib/engineering-context";
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
  emptyTitle: string;
  emptyBody: string;
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
    emptyTitle: "Ingen eksempel for denne profilen enda",
    emptyBody:
      "Vi jobber med eksempeloppgaver for denne profilen. Du kan starte med en egen oppgave i mellomtiden.",
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
    emptyTitle: "Ingen eksempel for denne profilen enda",
    emptyBody:
      "Vi jobbar med eksempeloppgåver for denne profilen. Du kan starte med ei eiga oppgåve i mellomtida.",
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
    emptyTitle: "No example tasks for this profile yet",
    emptyBody:
      "We are still authoring example tasks for this engineering standard. You can start with your own task in the meantime.",
  },
};

type Props = {
  uiMode: HeaderUiMode;
};

export default function PilotClient({ uiMode }: Props) {
  const { locale } = useLocale();
  const langKey: LangKey = uiMode === "intl" ? "en" : locale;
  const T = COPY[langKey];

  // Profile lever i localStorage frå /international. SSR/initial-render
  // kjenner ikkje verdien, så vi treng eit "mounted" for å skilje
  // "ikkje lasta enno" frå "tom".
  const [selectedProfile, setSelectedProfile] =
    useState<EngineeringStandardFamily | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = window.localStorage.getItem(ENGINEERING_CONTEXT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { standards?: { family?: string } };
      const family = parsed?.standards?.family;
      if (family) setSelectedProfile(family as EngineeringStandardFamily);
    } catch {
      // ignore — corrupt localStorage held vi ikkje på
    }
  }, []);

  // Norske brukarar (uiMode "no"): vis alle eksempel som har nb/nn.
  // Intl-brukarar: filtrer på vald profil. Inntil mounted veit vi ikkje
  // profilen, så vi held tom liste for intl for å unngå feil flicker.
  const filteredExamples = (() => {
    if (uiMode === "no") return PILOT_EXAMPLES;
    if (!mounted) return [];
    if (!selectedProfile) return [];
    return PILOT_EXAMPLES.filter((e) => e.profiles.includes(selectedProfile));
  })();

  // I intl-modus før mount: skjul grid for å unngå at "tom"-meldinga
  // blinkar før profilen er lest.
  const showEmptyState =
    filteredExamples.length === 0 && (uiMode === "no" || mounted);

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

      {filteredExamples.length > 0 && (
        <section className="pilot-grid" aria-label={T.examplesLabel}>
          {filteredExamples.map((example) => (
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
      )}

      {showEmptyState && (
        <section className="pilot-note">
          <h2>{T.emptyTitle}</h2>
          <p>{T.emptyBody}</p>
        </section>
      )}

      <section className="pilot-note">
        <h2>{T.noteTitle}</h2>
        <p>{T.noteText}</p>
      </section>
    </main>
  );
}
