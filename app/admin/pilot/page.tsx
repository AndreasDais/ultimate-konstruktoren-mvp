"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/locale";
import type { PilotFeedbackRating, PilotFeedbackRow, PilotMetricCard } from "@/lib/pilot/types";
import type { PilotReadinessOpsResponse } from "@/lib/pilot/qa-status";
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
    "Daily-agent har fersk overvåkingsrapport",
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
    "Daily-agent har fersk overvakingsrapport",
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
  qaTitle: string;
  qaIntro: string;
  qaNoReport: string;
  qaGreen: string;
  qaRed: string;
  qaUnknown: string;
  qaCommand: string;
  qaLatest: string;
  qaCases: string;
  qaPort1: string;
  qaPort2: string;
  failingCases: string;
  noFailingCases: string;
  dailyTitle: string;
  dailyIntro: string;
  dailyNoReport: string;
  dailyCommand: string;
  dailyRuns: string;
  dailyDisagreement: string;
  dailyDangerous: string;
  anomalies: string;
  noAnomalies: string;
  topClusters: string;
  readinessTitle: string;
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
    qaTitle: "Test-agent status",
    qaIntro: "Siste golden-set rapport frå QA-agenten. Denne må være grønn før større pilot.",
    qaNoReport: "Ingen QA-rapport funnet. Kjør test-agenten før pilot.",
    qaGreen: "QA grønn",
    qaRed: "QA må sjekkes",
    qaUnknown: "Ukjent QA-status",
    qaCommand: "Kommando",
    qaLatest: "Siste rapport",
    qaCases: "Case bestått",
    qaPort1: "Port 1",
    qaPort2: "Port 2",
    failingCases: "Case som må sjekkes",
    noFailingCases: "Ingen feila case i siste rapport.",
    dailyTitle: "Daily monitoring",
    dailyIntro: "Siste daglige overvåkingsrapport. Denne viser signal, ikke fasit.",
    dailyNoReport: "Ingen daily-rapport funnet.",
    dailyCommand: "Kommando",
    dailyRuns: "Runs analysert",
    dailyDisagreement: "Sammenligner-usemje",
    dailyDangerous: "Farlig-feil-kandidater",
    anomalies: "Anomalier",
    noAnomalies: "Ingen anomalier i siste rapport.",
    topClusters: "Største klynger",
    readinessTitle: "Operativ pilotstatus",
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
    qaTitle: "Test-agent-status",
    qaIntro: "Siste golden-set-rapport frå QA-agenten. Denne må vere grøn før større pilot.",
    qaNoReport: "Ingen QA-rapport funnen. Køyr test-agenten før pilot.",
    qaGreen: "QA grøn",
    qaRed: "QA må sjekkast",
    qaUnknown: "Ukjend QA-status",
    qaCommand: "Kommando",
    qaLatest: "Siste rapport",
    qaCases: "Case bestått",
    qaPort1: "Port 1",
    qaPort2: "Port 2",
    failingCases: "Case som må sjekkast",
    noFailingCases: "Ingen feila case i siste rapport.",
    dailyTitle: "Daily monitoring",
    dailyIntro: "Siste daglege overvakingsrapport. Denne viser signal, ikkje fasit.",
    dailyNoReport: "Ingen daily-rapport funnen.",
    dailyCommand: "Kommando",
    dailyRuns: "Runs analysert",
    dailyDisagreement: "Samanliknar-usemje",
    dailyDangerous: "Farleg-feil-kandidatar",
    anomalies: "Anomaliar",
    noAnomalies: "Ingen anomaliar i siste rapport.",
    topClusters: "Største klynger",
    readinessTitle: "Operativ pilotstatus",
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

function percent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "–";
  return `${(value * (value <= 1 ? 100 : 1)).toFixed(1)} %`;
}

function dateLabel(value: string | null | undefined, locale: Locale) {
  if (!value) return "–";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === "nn" ? "nn-NO" : "nb-NO");
}

export default function AdminPilotPage() {
  const { locale } = useLocale();
  const T = COPY[locale];
  const checklist = CHECKLIST[locale];
  const [data, setData] = useState<PilotMetricsResponse | null>(null);
  const [ops, setOps] = useState<PilotReadinessOpsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [metricsResponse, opsResponse] = await Promise.all([
      fetch("/api/admin/pilot/metrics", { cache: "no-store" }),
      fetch("/api/admin/pilot/qa-status", { cache: "no-store" }),
    ]);

    const metricsJson = (await metricsResponse.json().catch(() => ({ ok: false, error: "Invalid response" }))) as PilotMetricsResponse;
    const opsJson = (await opsResponse.json().catch(() => null)) as PilotReadinessOpsResponse | null;

    setData(metricsJson);
    setOps(opsJson);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const cards = data?.cards ?? [];
  const recentFeedback = data?.recentFeedback ?? [];
  const errors = useMemo(() => {
    const metricErrors = data?.errors?.filter(Boolean) ?? [];
    const opsErrors = ops?.errors?.filter(Boolean) ?? [];
    return [...metricErrors, ...opsErrors];
  }, [data, ops]);

  const qa = ops?.qa;
  const daily = ops?.daily;
  const qaGreen = ops?.readiness.qaGreen;

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

      <section className="admin-pilot-layout admin-pilot-layout-ops">
        <article className="admin-pilot-panel admin-pilot-qa-panel">
          <div className="admin-pilot-panel-head">
            <div>
              <h2>{T.qaTitle}</h2>
              <p>{T.qaIntro}</p>
            </div>
            <span className={`admin-pilot-status ${qaGreen === true ? "ok" : qaGreen === false ? "bad" : "neutral"}`}>
              {qaGreen === true ? T.qaGreen : qaGreen === false ? T.qaRed : T.qaUnknown}
            </span>
          </div>

          {!qa?.hasReport ? (
            <p className="admin-pilot-muted">{T.qaNoReport}</p>
          ) : (
            <>
              <div className="admin-pilot-mini-grid">
                <div><span>{T.qaCases}</span><strong>{qa.casesPassed}/{qa.casesTotal}</strong></div>
                <div><span>{T.qaPort1}</span><strong>{qa.port1Pct?.toFixed(1) ?? "–"} %</strong></div>
                <div><span>{T.qaPort2}</span><strong>{qa.port2Count ?? "–"}</strong></div>
                <div><span>{T.qaLatest}</span><strong>{dateLabel(qa.timestamp, locale)}</strong></div>
              </div>

              <div className="admin-pilot-codeblock">
                <span>{T.qaCommand}</span>
                <code>{qa.command}</code>
              </div>

              <div className="admin-pilot-subsection">
                <h3>{T.failingCases}</h3>
                {qa.failingCases.length === 0 ? (
                  <p className="admin-pilot-muted">{T.noFailingCases}</p>
                ) : (
                  <ul className="admin-pilot-compact-list">
                    {qa.failingCases.map((item) => (
                      <li key={item.caseId}>
                        <strong>{item.caseId}</strong>
                        <span>{item.correctRuns}/{item.totalRuns} · {item.worstVerdict}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </article>

        <article className="admin-pilot-panel admin-pilot-daily-panel">
          <h2>{T.dailyTitle}</h2>
          <p>{T.dailyIntro}</p>

          {!daily?.hasReport ? (
            <p className="admin-pilot-muted">{T.dailyNoReport}</p>
          ) : (
            <>
              <div className="admin-pilot-mini-grid">
                <div><span>{T.dailyRuns}</span><strong>{daily.runs ?? "–"}</strong></div>
                <div><span>{T.dailyDisagreement}</span><strong>{percent(daily.disagreementRate)}</strong></div>
                <div><span>{T.dailyDangerous}</span><strong>{daily.dangerousCandidates ?? "–"}</strong></div>
                <div><span>{T.qaLatest}</span><strong>{daily.date ?? "–"}</strong></div>
              </div>

              <div className="admin-pilot-codeblock">
                <span>{T.dailyCommand}</span>
                <code>{daily.command}</code>
              </div>

              <div className="admin-pilot-subsection">
                <h3>{T.anomalies}</h3>
                {daily.anomalies.length === 0 ? (
                  <p className="admin-pilot-muted">{T.noAnomalies}</p>
                ) : (
                  <ul className="admin-pilot-compact-list">
                    {daily.anomalies.map((item) => (
                      <li key={`${item.signal}-${item.severity}`}>
                        <strong>{item.signal}</strong>
                        <span>{item.severity} · {percent(item.current)} vs {percent(item.baseline)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="admin-pilot-subsection">
                <h3>{T.topClusters}</h3>
                <ul className="admin-pilot-compact-list">
                  {daily.topClusters.map((item) => (
                    <li key={item.type}>
                      <strong>{item.type}</strong>
                      <span>{item.count} · {item.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </article>
      </section>

      {ops?.readiness.recommendation && (
        <section className="admin-pilot-readiness-note">
          <h2>{T.readinessTitle}</h2>
          <p>{ops.readiness.recommendation}</p>
        </section>
      )}

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
