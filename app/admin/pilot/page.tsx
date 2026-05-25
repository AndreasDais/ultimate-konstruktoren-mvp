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

type FinalReadinessState = "ok" | "warn" | "blocked" | "manual";

type FinalReadinessItem = {
  key: string;
  label: string;
  description: string;
  state: FinalReadinessState;
  automated: boolean;
};

type FinalReadinessSummary = {
  status: "ready" | "caution" | "blocked";
  readyCount: number;
  automatedCount: number;
  manualCount: number;
  blockers: number;
  items: FinalReadinessItem[];
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
  finalTitle: string;
  finalIntro: string;
  finalReady: string;
  finalCaution: string;
  finalBlocked: string;
  finalProgress: string;
  finalAutomatedChecks: string;
  finalManualChecks: string;
  finalStatus: Record<FinalReadinessState, string>;
  finalItems: Record<string, { label: string; description: string }>;
  rating: Record<PilotFeedbackRating, string>;
}> = {
  nb: {
    eyebrow: "PILAR · Pilot readiness",
    title: "Pilotdashboard",
    intro:
      "Samlet oversikt over pilotstatus, feedback, testgrunnlag og det som må være på plass før du inviterer de første usene.",
    loading: "Henter ...",
    refresh: "Oppdater",
    pilotStart: "Pilotstartside",
    intelligence: "Intelligence",
    errorReports: "Feilrapporter",
    admin: "Admin",
    dataSourcesTitle: "Datakilder som må sjekkes",
    checklistTitle: "Pilot-checkliste",
    checklistIntro: "Dette er minimum før du sender lenke til 5–15 pilotusee.",
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
    dailyDisagreement: "Comparator-usemje",
    dailyDangerous: "Farlig-feil-kandidater",
    anomalies: "Anomalier",
    noAnomalies: "Ingen anomalier i siste rapport.",
    topClusters: "Største klynger",
    readinessTitle: "Operativ pilotstatus",
    finalTitle: "Klar for pilot?",
    finalIntro: "Automatisk sjekkliste basert på test-agent, daily-agent, Supabase, feedbackflyt og manuelle sistekontroller.",
    finalReady: "Klar for kontrollert pilot",
    finalCaution: "Nesten klar — manuell sjekk gjenstår",
    finalBlocked: "Ikke klar — blokkering må løses",
    finalProgress: "Automatiske sjekker bestått",
    finalAutomatedChecks: "Automatiske sjekker",
    finalManualChecks: "Manuelle sistekontroller",
    finalStatus: {
      ok: "OK",
      warn: "Sjekk",
      blocked: "Blokkerer",
      manual: "Manuell",
    },
    finalItems: {
      qa: { label: "Test-agent grønn", description: "Golden-set og Port 1/Port 2 bør være bestått før eksterne usee inviteres." },
      dangerous: { label: "Ingen farlige regresjoner", description: "Test-agenten skal ikke rapportere farlig-feil-kandidater eller regresjon i funn." },
      daily: { label: "Daily-agent fersk", description: "Daglig overvåking bør ha minst én rapport slik at signaler fra ekte kjøringer fanges." },
      feedback: { label: "Pilotfeedback fungerer", description: "Feedbackskjema og Supabase-tabellen pilot_feedback må fungere." },
      supabase: { label: "Supabase-migrasjoner OK", description: "Pilotfeedback og målinger må kunne leses uten datakildefeil." },
      errors: { label: "Ingen datakildevarsler", description: "Dashboardet bør ikke vise feil fra tabeller, dato-kolonner eller manglende rapportmapper." },
      admin: { label: "Admin-dashboard klart", description: "Adminsidene må være tilgjengelige for oppfølging av pilot, feil og intelligence." },
      exports: { label: "Rapporteksport manuelt testet", description: "PDF, Word, LaTeX og beregningsark bør verifiseres med minst én ny rapport." },
      localeTheme: { label: "Språk og tema manuelt testet", description: "Bokmål/nynorsk og Slate/Stone/Graphite bør sjekkes på pilot- og adminsidene." },
      deploy: { label: "Production deploy verifisert", description: "Produksjonslenke, login og miljøvariabler må kontrolleres før deling." },
    },
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
      "Samla oversikt over pilotstatus, feedback, testgrunnlag og det som må vere på plass før du inviterer dei første useane.",
    loading: "Hentar ...",
    refresh: "Oppdater",
    pilotStart: "Pilotstartside",
    intelligence: "Intelligence",
    errorReports: "Feilrapportar",
    admin: "Admin",
    dataSourcesTitle: "Datakjelder som må sjekkast",
    checklistTitle: "Pilot-sjekkliste",
    checklistIntro: "Dette er minimum før du sender lenke til 5–15 pilotusear.",
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
    dailyDisagreement: "Comparator-usemje",
    dailyDangerous: "Farleg-feil-kandidatar",
    anomalies: "Anomaliar",
    noAnomalies: "Ingen anomaliar i siste rapport.",
    topClusters: "Største klynger",
    readinessTitle: "Operativ pilotstatus",
    finalTitle: "Klar for pilot?",
    finalIntro: "Automatisk sjekkliste basert på test-agent, daily-agent, Supabase, feedbackflyt og manuelle sistekontrollar.",
    finalReady: "Klar for kontrollert pilot",
    finalCaution: "Nesten klar — manuell sjekk står att",
    finalBlocked: "Ikkje klar — blokkering må løysast",
    finalProgress: "Automatiske sjekkar bestått",
    finalAutomatedChecks: "Automatiske sjekkar",
    finalManualChecks: "Manuelle sistekontrollar",
    finalStatus: {
      ok: "OK",
      warn: "Sjekk",
      blocked: "Blokkerer",
      manual: "Manuell",
    },
    finalItems: {
      qa: { label: "Test-agent grøn", description: "Golden-set og Port 1/Port 2 bør vere bestått før eksterne usear blir inviterte." },
      dangerous: { label: "Ingen farlege regresjonar", description: "Test-agenten skal ikkje rapportere farleg-feil-kandidatar eller regresjon i funn." },
      daily: { label: "Daily-agent fersk", description: "Dagleg overvaking bør ha minst éin rapport slik at signal frå ekte køyringar blir fanga." },
      feedback: { label: "Pilotfeedback fungerer", description: "Feedbackskjema og Supabase-tabellen pilot_feedback må fungere." },
      supabase: { label: "Supabase-migrasjonar OK", description: "Pilotfeedback og målingar må kunne lesast utan datakjeldefeil." },
      errors: { label: "Ingen datakjeldevarsel", description: "Dashboardet bør ikkje vise feil frå tabellar, dato-kolonnar eller manglande rapportmapper." },
      admin: { label: "Admin-dashboard klart", description: "Adminsidene må vere tilgjengelege for oppfølging av pilot, feil og intelligence." },
      exports: { label: "Rapporteksport manuelt testa", description: "PDF, Word, LaTeX og berekningsark bør verifiserast med minst éin ny rapport." },
      localeTheme: { label: "Språk og tema manuelt testa", description: "Bokmål/nynorsk og Slate/Stone/Graphite bør sjekkast på pilot- og adminsidene." },
      deploy: { label: "Production deploy verifisert", description: "Produksjonslenke, login og miljøvariablar må kontrollerast før deling." },
    },
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

function boolState(value: boolean | null | undefined): FinalReadinessState {
  if (value === true) return "ok";
  if (value === false) return "blocked";
  return "warn";
}

function buildFinalReadiness(
  ops: PilotReadinessOpsResponse | null,
  metrics: PilotMetricsResponse | null,
  T: (typeof COPY)[Locale],
): FinalReadinessSummary {
  const info = T.finalItems;
  const items = [
    { key: "qa", ...info.qa, state: boolState(ops?.readiness?.qaGreen), automated: true },
    {
      key: "dangerous",
      ...info.dangerous,
      state: boolState(ops?.readiness?.dangerousFindingsClear),
      automated: true,
    },
    {
      key: "daily",
      ...info.daily,
      state: (ops?.readiness?.dailyAvailable ? "ok" : "warn") as FinalReadinessState,
      automated: true,
    },
    {
      key: "feedback",
      ...info.feedback,
      state: boolState(metrics?.readiness?.feedbackFlow),
      automated: true,
    },
    {
      key: "supabase",
      ...info.supabase,
      state: boolState(metrics?.readiness?.supabaseMigration),
      automated: true,
    },
    {
      key: "errors",
      ...info.errors,
      state: (metrics?.errors?.length ? "warn" : "ok") as FinalReadinessState,
      automated: true,
    },
    {
      key: "admin",
      ...info.admin,
      state: boolState(metrics?.readiness?.adminDashboard),
      automated: true,
    },
    {
      key: "exports",
      ...info.exports,
      state: "manual" as FinalReadinessState,
      automated: false,
    },
    {
      key: "localeTheme",
      ...info.localeTheme,
      state: "manual" as FinalReadinessState,
      automated: false,
    },
    {
      key: "deploy",
      ...info.deploy,
      state: "manual" as FinalReadinessState,
      automated: false,
    },
  ] satisfies FinalReadinessItem[];

  const automated = items.filter((item) => item.automated);
  const readyCount = automated.filter((item) => item.state === "ok").length;
  const blockers = items.filter((item) => item.state === "blocked").length;
  const warnings = items.filter((item) => item.state === "warn").length;
  const manualCount = items.filter((item) => item.state === "manual").length;

  return {
    status: blockers > 0 ? "blocked" : warnings > 0 || manualCount > 0 ? "caution" : "ready",
    readyCount,
    automatedCount: automated.length,
    manualCount,
    blockers,
    items,
  };
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
  const qaGreen = ops?.readiness?.qaGreen;
  const finalReadiness = useMemo(
    () => buildFinalReadiness(ops, data, T),
    [ops, data, T],
  );
  const finalStatusLabel =
    finalReadiness.status === "ready"
      ? T.finalReady
      : finalReadiness.status === "blocked"
        ? T.finalBlocked
        : T.finalCaution;

  return (
    <main className="admin-pilot-page">
      <section className="admin-pilot-hero">
        <div>
          <p className="uk-eyebrow">{T.eyebrow}</p>
          <h1>{T.title}</h1>
          <p>{T.intro}</p>
        </div>
        <div className="admin-pilot-actions">
          <button className="uk-btn" onClick={() => void load()} disabled={loading}>{loading ? T.loading : T.refresh}</button>
          <Link className="uk-btn" href="/pilot">{T.pilotStart}</Link>
          <Link className="uk-btn" href="/admin/intelligence">{T.intelligence}</Link>
          <Link className="uk-btn" href="/admin/error-reports">{T.errorReports}</Link>
          <Link className="uk-btn" href="/admin">{T.admin}</Link>
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

      <section className={`admin-pilot-final-readiness ${finalReadiness.status}`}>
        <div className="admin-pilot-final-summary">
          <div>
            <p className="uk-eyebrow">{T.finalTitle}</p>
            <h2>{finalStatusLabel}</h2>
            <p>{T.finalIntro}</p>
          </div>
          <div className="admin-pilot-readiness-score">
            <strong>{finalReadiness.readyCount}/{finalReadiness.automatedCount}</strong>
            <span>{T.finalProgress}</span>
            <div className="admin-pilot-progress" aria-hidden="true">
              <i style={{ width: `${Math.round((finalReadiness.readyCount / Math.max(finalReadiness.automatedCount, 1)) * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="admin-pilot-final-checklist">
          <div>
            <h3>{T.finalAutomatedChecks}</h3>
            {finalReadiness.items.filter((item) => item.automated).map((item) => (
              <article className={`admin-pilot-final-item ${item.state}`} key={item.key}>
                <span>{T.finalStatus[item.state]}</span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
          <div>
            <h3>{T.finalManualChecks}</h3>
            {finalReadiness.items.filter((item) => !item.automated).map((item) => (
              <article className={`admin-pilot-final-item ${item.state}`} key={item.key}>
                <span>{T.finalStatus[item.state]}</span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

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
            <span className={`admin-pilot-status ${qaGreen === true ? "ok" : qaGreen === false ? "blocked" : "neutral"}`}>
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

      {ops?.readiness?.recommendation && (
        <section className="admin-pilot-readiness-note">
          <h2>{T.readinessTitle}</h2>
          <p>{ops.readiness?.recommendation}</p>
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
