"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/locale";
import type { PilotFeedbackRating, PilotFeedbackRow, PilotMetricCard } from "@/lib/pilot/types";
import "./pilot.css";

type PilotMetricsResponse = {
  ok: boolean;
  generatedAt?: string;
  cards?: PilotMetricCard[];
  recentFeedback?: PilotFeedbackRow[];
  readiness?: Record<string, boolean | null>;
  errors?: string[];
  error?: string;
};

const CHECKLIST: Record<Locale, string[]> = {
  nb: [
    "Production deploy fungerer",
    "Login og rapportflyt fungerer",
    "PDF, Word og LaTeX-eksport fungerer",
    "Beregningsark er testet",
    "Feilrapportering fungerer",
    "Pilotfeedback fungerer",
    "Admin kan lese feedback og feil",
    "Test-agent kjører standardcaser",
    "AI-disclaimer og fagperson-kontroll er synlig",
    "Supabase-migrasjoner er kjørt",
  ],
  nn: [
    "Production deploy fungerer",
    "Login og rapportflyt fungerer",
    "PDF-, Word- og LaTeX-eksport fungerer",
    "Berekningsark er testa",
    "Feilrapportering fungerer",
    "Pilotfeedback fungerer",
    "Admin kan lese feedback og feil",
    "Test-agent køyrer standardcasar",
    "AI-disclaimer og fagpersonkontroll er synleg",
    "Supabase-migrasjonar er køyrde",
  ],
};

const COPY: Record<Locale, {
  eyebrow: string;
  title: string;
  intro: string;
  loading: string;
  refresh: string;
  pilotStart: string;
  intelligence: string;
  errorReports: string;
  admin: string;
  dataSourcesTitle: string;
  checklistTitle: string;
  checklistIntro: string;
  latestFeedback: string;
  noFeedback: string;
  noComment: string;
  openReport: string;
  rating: Record<PilotFeedbackRating, string>;
}> = {
  nb: {
    eyebrow: "PILAR · Pilot readiness",
    title: "Pilotdashboard",
    intro:
      "Samlet oversikt over pilotstatus, feedback, testgrunnlag og det som må være på plass før du inviterer de første brukerne.",
    loading: "Henter ...",
    refresh: "Oppdater",
    pilotStart: "Pilotstartside",
    intelligence: "Intelligence",
    errorReports: "Feilrapporter",
    admin: "Admin",
    dataSourcesTitle: "Datakilder som må sjekkes",
    checklistTitle: "Pilot-checkliste",
    checklistIntro: "Dette er minimum før du sender lenke til 5–15 pilotbrukere.",
    latestFeedback: "Siste pilotfeedback",
    noFeedback: "Ingen feedback registrert ennå.",
    noComment: "Ingen kommentar.",
    openReport: "Åpne rapport",
    rating: {
      useful: "Nyttig",
      partly: "Delvis",
      not_useful: "Ikke nyttig",
    },
  },
  nn: {
    eyebrow: "PILAR · Pilot readiness",
    title: "Pilotdashboard",
    intro:
      "Samla oversikt over pilotstatus, feedback, testgrunnlag og det som må vere på plass før du inviterer dei første brukarane.",
    loading: "Hentar ...",
    refresh: "Oppdater",
    pilotStart: "Pilotstartside",
    intelligence: "Intelligence",
    errorReports: "Feilrapportar",
    admin: "Admin",
    dataSourcesTitle: "Datakjelder som må sjekkast",
    checklistTitle: "Pilot-sjekkliste",
    checklistIntro: "Dette er minimum før du sender lenke til 5–15 pilotbrukarar.",
    latestFeedback: "Siste pilotfeedback",
    noFeedback: "Ingen feedback registrert enno.",
    noComment: "Ingen kommentar.",
    openReport: "Opne rapport",
    rating: {
      useful: "Nyttig",
      partly: "Delvis",
      not_useful: "Ikkje nyttig",
    },
  },
};

function ratingLabel(value: string, locale: Locale) {
  const T = COPY[locale].rating;
  if (value === "useful" || value === "partly" || value === "not_useful") return T[value];
  return value;
}

export default function AdminPilotPage() {
  const { locale } = useLocale();
  const T = COPY[locale];
  const checklist = CHECKLIST[locale];
  const [data, setData] = useState<PilotMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/pilot/metrics", { cache: "no-store" });
    const json = (await response.json().catch(() => ({ ok: false, error: "Invalid response" }))) as PilotMetricsResponse;
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const cards = data?.cards ?? [];
  const recentFeedback = data?.recentFeedback ?? [];
  const errors = useMemo(() => data?.errors?.filter(Boolean) ?? [], [data]);

  return (
    <main className="admin-pilot-page">
      <section className="admin-pilot-hero">
        <div>
          <p className="admin-pilot-eyebrow">{T.eyebrow}</p>
          <h1>{T.title}</h1>
          <p>{T.intro}</p>
        </div>
        <div className="admin-pilot-actions">
          <button onClick={() => void load()} disabled={loading}>{loading ? T.loading : T.refresh}</button>
          <Link href="/pilot">{T.pilotStart}</Link>
          <Link href="/admin/intelligence">{T.intelligence}</Link>
          <Link href="/admin/error-reports">{T.errorReports}</Link>
          <Link href="/admin">{T.admin}</Link>
        </div>
      </section>

      {errors.length > 0 && (
        <section className="admin-pilot-warning">
          <h2>{T.dataSourcesTitle}</h2>
          <ul>
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </section>
      )}

      <section className="admin-pilot-cards">
        {cards.map((card) => (
          <article key={card.key}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            {card.hint && <p>{card.hint}</p>}
          </article>
        ))}
      </section>

      <section className="admin-pilot-layout">
        <article className="admin-pilot-panel">
          <h2>{T.checklistTitle}</h2>
          <p>{T.checklistIntro}</p>
          <ul className="admin-pilot-checklist">
            {checklist.map((item) => (
              <li key={item}><span aria-hidden="true">□</span>{item}</li>
            ))}
          </ul>
        </article>

        <article className="admin-pilot-panel">
          <h2>{T.latestFeedback}</h2>
          {recentFeedback.length === 0 ? (
            <p className="admin-pilot-muted">{T.noFeedback}</p>
          ) : (
            <div className="admin-pilot-feedback-list">
              {recentFeedback.map((row) => (
                <div className="admin-pilot-feedback" key={row.id}>
                  <div>
                    <strong>{ratingLabel(row.rating, locale)}</strong>
                    <span>{new Date(row.created_at).toLocaleString(locale === "nn" ? "nn-NO" : "nb-NO")}</span>
                  </div>
                  <p>{row.comment || T.noComment}</p>
                  <small>{row.use_case} · {row.trust_level} · {row.source || "rapport"}</small>
                  {row.report_url && <Link href={row.report_url}>{T.openReport}</Link>}
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
