"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "@/lib/locale-context";
import type { Locale } from "@/lib/locale";
import "./intelligence.css";

type Finding = {
  category: string;
  title: string;
  detail: string;
  severity: "low" | "medium" | "high" | "critical";
};

type Recommendation = {
  title: string;
  description: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  expectedImpact: string;
  effort: "small" | "medium" | "large";
  riskLevel: "low" | "medium" | "high";
};

type ImprovementStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "planned"
  | "implemented"
  | "verified"
  | "deferred";

type ImplementationPlanStep = {
  title: string;
  detail: string;
  files?: string[];
  doneWhen?: string;
};

type ImplementationPlan = {
  version: string;
  generatedAt: string;
  mode: string;
  summary: string;
  riskLevel: "low" | "medium" | "high";
  recommendedBranch: string;
  touchedAreas: string[];
  filesToInspect: string[];
  steps: ImplementationPlanStep[];
  tests: string[];
  acceptanceCriteria: string[];
  rollbackPlan: string[];
  humanApprovalRequired: boolean;
  autonomousExecutionAllowed: boolean;
  notes: string[];
};

type ImprovementAction = Recommendation & {
  id: string;
  reportId: string | null;
  status: ImprovementStatus;
  proposedByAgent: boolean;
  approvedByUser: boolean;
  implementedAt: string | null;
  resultSummary: string | null;
  userFeedback: string | null;
  metadata?: { implementationPlan?: ImplementationPlan; [key: string]: unknown };
  createdAt: string;
  updatedAt: string;
};

type IntelligenceReport = {
  id: string;
  reportDate: string;
  summary: string;
  pipelineFindings: Finding[];
  productFindings: Finding[];
  costFindings: Finding[];
  marketingFindings: Finding[];
  pricingFindings: Finding[];
  recommendations: Recommendation[];
  proposedActions: Recommendation[];
  carryoverFromPreviousDay: Recommendation[];
  riskNotes: Finding[];
  metrics: {
    counts: {
      runsTotal: number;
      runsCompleted: number;
      reportsGenerated: number;
      controllerUncertainOrRejected: number;
      comparisonsWithDeviation: number;
      errorReportsTotal: number;
      activeUsersApprox: number;
    };
    quality: {
      avgTillitScore: number | null;
      lowTillitReports: number;
    };
  };
};

type ApiResponse = {
  reports?: IntelligenceReport[];
  report?: IntelligenceReport;
  actions?: ImprovementAction[];
  action?: ImprovementAction;
  plan?: ImplementationPlan;
  error?: string;
};

type Labels = {
  status: Record<ImprovementStatus, string>;
  severity: Record<string, string>;
  effort: Record<string, string>;
  risk: Record<string, string>;
  todayErrorReport: string;
  unknownError: string;
  fetchReportsError: string;
  fetchActionsError: string;
  generateError: string;
  cronError: string;
  updateActionError: string;
  planError: string;
  reportDate: string;
  implementationPlan: string;
  branch: string;
  touchedAreas: string;
  filesToInspect: string;
  testsAndAcceptance: string;
  tests: string;
  acceptance: string;
  rollback: string;
  doneWhen: string;
  recommendationsTitle: string;
  recommendationsIntro: string;
  expectedImpact: string;
  feedbackTitle: string;
  feedbackIntro: string;
  feedbackPlaceholder: string;
  outcomePlaceholder: string;
  feedbackLabel: string;
  outcomeLabel: string;
  ratingLabel: string;
  noRating: string;
  rating5: string;
  rating4: string;
  rating3: string;
  rating2: string;
  rating1: string;
  agent: string;
  manual: string;
  effortLabel: string;
  riskLabel: string;
  approve: string;
  plan: string;
  makePlan: string;
  makingPlan: string;
  implemented: string;
  verified: string;
  defer: string;
  reject: string;
  heroKicker: string;
  heroTitle: string;
  heroText: string;
  admin: string;
  errorReports: string;
  workbench: string;
  date: string;
  makeOrFetch: string;
  generating: string;
  regenerate: string;
  runDailyAgent: string;
  downloadMarkdown: string;
  proposals: string;
  openProposals: string;
  allProposals: string;
  loadingReports: string;
  loadingActions: string;
  exportMarkdown: string;
  runs: string;
  reports: string;
  uncertainRejected: string;
  abDeviation: string;
  errorReportsMetric: string;
  trust: string;
  average: string;
  pipelineFindings: string;
  productFindings: string;
  cost: string;
  marketing: string;
  pricing: string;
  riskFindings: string;
  emptyTitle: string;
  emptyText: string;
};

const LABELS: Record<Locale, Labels> = {
  nb: {
    status: {
      proposed: "Foreslått",
      approved: "Godkjent",
      rejected: "Avvist",
      planned: "Planlagt",
      implemented: "Implementert",
      verified: "Verifisert",
      deferred: "Utsatt",
    },
    severity: { low: "lav", medium: "middels", high: "høy", critical: "kritisk" },
    effort: { small: "liten", medium: "middels", large: "stor" },
    risk: { low: "lav", medium: "middels", high: "høy" },
    todayErrorReport: "Dagens rapport",
    unknownError: "Ukjent feil",
    fetchReportsError: "Klarte ikke hente intelligence-rapporter",
    fetchActionsError: "Klarte ikke hente forbedringsforslag",
    generateError: "Klarte ikke generere rapport",
    cronError: "Klarte ikke kjøre daglig agent",
    updateActionError: "Klarte ikke oppdatere forbedringsforslag",
    planError: "Klarte ikke lage implementeringsplan",
    reportDate: "Rapportdato",
    implementationPlan: "Implementeringsplan",
    branch: "Branch",
    touchedAreas: "Område",
    filesToInspect: "Filer agenten bør lese først",
    testsAndAcceptance: "Test og akseptansekriterier",
    tests: "Tester",
    acceptance: "Akseptanse",
    rollback: "Rollback",
    doneWhen: "Ferdig når",
    recommendationsTitle: "Agentens anbefalinger",
    recommendationsIntro: "Disse blir også lagret som forbedringsforslag under, slik at du kan godkjenne, avvise og gi feedback.",
    expectedImpact: "Forventet effekt",
    feedbackTitle: "Forbedringsforslag og feedback-loop",
    feedbackIntro: "Bruk dette som treningsdata for agenten. Neste dag leser agenten status, feedback og verifiseringer før han lager nye forslag.",
    feedbackPlaceholder: "Hvorfor er dette nyttig/ikke nyttig? Hva bør agenten lære?",
    outcomePlaceholder: "Hva skjedde etter tiltaket? Fungerte det?",
    feedbackLabel: "Feedback til agenten",
    outcomeLabel: "Resultat / effekt etter implementering",
    ratingLabel: "Rating",
    noRating: "Ingen",
    rating5: "5 — veldig nyttig",
    rating4: "4 — nyttig",
    rating3: "3 — ok",
    rating2: "2 — lite nyttig",
    rating1: "1 — dårlig forslag",
    agent: "Agent",
    manual: "Manuell",
    effortLabel: "Innsats",
    riskLabel: "Risiko",
    approve: "Godkjenn",
    plan: "Planlegg",
    makePlan: "Lag implementeringsplan",
    makingPlan: "Lager plan …",
    implemented: "Implementert",
    verified: "Verifisert",
    defer: "Utsett",
    reject: "Avvis",
    heroKicker: "PILAR Operating Intelligence",
    heroTitle: "Daglig lærings- og forbedringsagent",
    heroText: "Samler pipeline-, produkt-, kostnads-, markeds- og prisingssignal fra Supabase og lager en daglig forbedringsrapport. Siden følger aktivt språkvalg og temaene Slate, Stone og Graphite.",
    admin: "Admin",
    errorReports: "Feilrapporter",
    workbench: "Workbench",
    date: "Dato",
    makeOrFetch: "Lag / hent rapport",
    generating: "Genererer …",
    regenerate: "Regenerer",
    runDailyAgent: "Kjør daglig agent",
    downloadMarkdown: "Last ned Markdown",
    proposals: "Forslag",
    openProposals: "Åpne forslag",
    allProposals: "Alle forslag",
    loadingReports: "Henter rapporter …",
    loadingActions: "Henter forbedringsforslag …",
    exportMarkdown: "Eksporter rapport som Markdown",
    runs: "Runs",
    reports: "Rapporter",
    uncertainRejected: "Usikre/avvist",
    abDeviation: "A/B-avvik",
    errorReportsMetric: "Feilrapporter",
    trust: "Tillit",
    average: "gj.snitt",
    pipelineFindings: "Pipeline-funn",
    productFindings: "Produktfunn",
    cost: "Kostnad",
    marketing: "Markedsføring",
    pricing: "Prising",
    riskFindings: "Risiko",
    emptyTitle: "Ingen rapporter ennå",
    emptyText: "Velg dato og trykk “Lag / hent rapport” for å starte læringsagenten.",
  },
  nn: {
    status: {
      proposed: "Foreslått",
      approved: "Godkjent",
      rejected: "Avvist",
      planned: "Planlagt",
      implemented: "Implementert",
      verified: "Verifisert",
      deferred: "Utsett",
    },
    severity: { low: "låg", medium: "middels", high: "høg", critical: "kritisk" },
    effort: { small: "liten", medium: "middels", large: "stor" },
    risk: { low: "låg", medium: "middels", high: "høg" },
    todayErrorReport: "Dagens rapport",
    unknownError: "Ukjend feil",
    fetchReportsError: "Klarte ikkje hente intelligence-rapportar",
    fetchActionsError: "Klarte ikkje hente forbetringsforslag",
    generateError: "Klarte ikkje generere rapport",
    cronError: "Klarte ikkje køyre dagleg agent",
    updateActionError: "Klarte ikkje oppdatere forbetringsforslag",
    planError: "Klarte ikkje lage implementeringsplan",
    reportDate: "Rapportdato",
    implementationPlan: "Implementeringsplan",
    branch: "Branch",
    touchedAreas: "Område",
    filesToInspect: "Filer agenten bør lese først",
    testsAndAcceptance: "Test og akseptansekriterium",
    tests: "Testar",
    acceptance: "Akseptanse",
    rollback: "Rollback",
    doneWhen: "Ferdig når",
    recommendationsTitle: "Agenten sine anbefalingar",
    recommendationsIntro: "Desse blir også lagra som forbetringsforslag under, slik at du kan godkjenne, avvise og gi feedback.",
    expectedImpact: "Forventa effekt",
    feedbackTitle: "Forbetringsforslag og feedback-loop",
    feedbackIntro: "Bruk dette som treningsdata for agenten. Neste dag les agenten status, feedback og verifiseringar før han lagar nye forslag.",
    feedbackPlaceholder: "Kvifor er dette nyttig/ikkje nyttig? Kva bør agenten lære?",
    outcomePlaceholder: "Kva skjedde etter tiltaket? Fungerte det?",
    feedbackLabel: "Feedback til agenten",
    outcomeLabel: "Resultat / effekt etter implementering",
    ratingLabel: "Rating",
    noRating: "Ingen",
    rating5: "5 — veldig nyttig",
    rating4: "4 — nyttig",
    rating3: "3 — ok",
    rating2: "2 — lite nyttig",
    rating1: "1 — dårleg forslag",
    agent: "Agent",
    manual: "Manuell",
    effortLabel: "Innsats",
    riskLabel: "Risiko",
    approve: "Godkjenn",
    plan: "Planlegg",
    makePlan: "Lag implementeringsplan",
    makingPlan: "Lagar plan …",
    implemented: "Implementert",
    verified: "Verifisert",
    defer: "Utsett",
    reject: "Avvis",
    heroKicker: "PILAR Operating Intelligence",
    heroTitle: "Dagleg lærings- og forbetringsagent",
    heroText: "Samlar pipeline-, produkt-, kostnads-, marknads- og prisingssignal frå Supabase og lagar ein dagleg forbetringsrapport. Sida følgjer aktivt språkval og temaa Slate, Stone og Graphite.",
    admin: "Admin",
    errorReports: "Feilrapportar",
    workbench: "Workbench",
    date: "Dato",
    makeOrFetch: "Lag / hent rapport",
    generating: "Genererer …",
    regenerate: "Regenerer",
    runDailyAgent: "Køyr dagleg agent",
    downloadMarkdown: "Last ned Markdown",
    proposals: "Forslag",
    openProposals: "Opne forslag",
    allProposals: "Alle forslag",
    loadingReports: "Hentar rapportar …",
    loadingActions: "Hentar forbetringsforslag …",
    exportMarkdown: "Eksporter rapport som Markdown",
    runs: "Runs",
    reports: "Rapportar",
    uncertainRejected: "Usikre/avvist",
    abDeviation: "A/B-avvik",
    errorReportsMetric: "Feilrapportar",
    trust: "Tillit",
    average: "gj.snitt",
    pipelineFindings: "Pipeline-funn",
    productFindings: "Produktfunn",
    cost: "Kostnad",
    marketing: "Marknadsføring",
    pricing: "Prising",
    riskFindings: "Risiko",
    emptyTitle: "Ingen rapportar endå",
    emptyText: "Vel dato og trykk “Lag / hent rapport” for å starte læringsagenten.",
  },
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function badgeClass(value: string) {
  return `intelligence-badge intelligence-badge--${value}`;
}

function statusLabel(status: ImprovementStatus, labels: Labels) {
  return labels.status[status] ?? status;
}

function pretty(value: string, map: Record<string, string>) {
  return map[value] ?? value;
}

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="intelligence-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function FindingList({ title, items, labels }: { title: string; items: Finding[]; labels: Labels }) {
  if (!items.length) return null;
  return (
    <section className="intelligence-panel">
      <h2>{title}</h2>
      <div className="intelligence-stack">
        {items.map((item, index) => (
          <article className="intelligence-finding" key={`${item.title}-${index}`}>
            <div>
              <span className={badgeClass(item.severity)}>{pretty(item.severity, labels.severity)}</span>
              <span className="intelligence-category">{item.category}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecommendationList({ items, labels }: { items: Recommendation[]; labels: Labels }) {
  if (!items.length) return null;
  return (
    <section className="intelligence-panel intelligence-panel--accent">
      <h2>{labels.recommendationsTitle}</h2>
      <p className="intelligence-muted">{labels.recommendationsIntro}</p>
      <div className="intelligence-stack">
        {items.map((item, index) => (
          <article className="intelligence-recommendation" key={`${item.title}-${index}`}>
            <div className="intelligence-row">
              <span className={badgeClass(item.priority)}>{pretty(item.priority, labels.severity)}</span>
              <span>{item.category}</span>
              <span>{labels.effortLabel}: {pretty(item.effort, labels.effort)}</span>
              <span>{labels.riskLabel}: {pretty(item.riskLevel, labels.risk)}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <p className="intelligence-impact">{labels.expectedImpact}: {item.expectedImpact}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ImplementationPlanView({ plan, labels }: { plan: ImplementationPlan; labels: Labels }) {
  return (
    <div className="intelligence-plan">
      <div className="intelligence-row intelligence-row--space">
        <div>
          <p className="intelligence-kicker">{labels.implementationPlan}</p>
          <h4>{plan.summary}</h4>
        </div>
        <span className={badgeClass(plan.riskLevel)}>{pretty(plan.riskLevel, labels.risk)} risk</span>
      </div>
      <div className="intelligence-plan-grid">
        <div>
          <strong>{labels.branch}</strong>
          <code>{plan.recommendedBranch}</code>
        </div>
        <div>
          <strong>{labels.touchedAreas}</strong>
          <span>{plan.touchedAreas.join(" · ")}</span>
        </div>
      </div>
      {plan.filesToInspect.length ? (
        <details className="intelligence-details">
          <summary>{labels.filesToInspect}</summary>
          <ul>
            {plan.filesToInspect.slice(0, 12).map((file) => <li key={file}><code>{file}</code></li>)}
          </ul>
        </details>
      ) : null}
      <ol className="intelligence-plan-steps">
        {plan.steps.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <p>{step.detail}</p>
            {step.doneWhen ? <small>{labels.doneWhen}: {step.doneWhen}</small> : null}
          </li>
        ))}
      </ol>
      <details className="intelligence-details">
        <summary>{labels.testsAndAcceptance}</summary>
        <h5>{labels.tests}</h5>
        <ul>{plan.tests.map((test) => <li key={test}>{test}</li>)}</ul>
        <h5>{labels.acceptance}</h5>
        <ul>{plan.acceptanceCriteria.map((item) => <li key={item}>{item}</li>)}</ul>
        <h5>{labels.rollback}</h5>
        <ul>{plan.rollbackPlan.map((item) => <li key={item}>{item}</li>)}</ul>
      </details>
    </div>
  );
}

function ActionCard({
  action,
  labels,
  locale,
  onUpdate,
  onPlan,
}: {
  action: ImprovementAction;
  labels: Labels;
  locale: Locale;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
  onPlan: (id: string) => Promise<void>;
}) {
  const [feedback, setFeedback] = useState(action.userFeedback ?? "");
  const [outcome, setOutcome] = useState(action.resultSummary ?? "");
  const [rating, setRating] = useState("");
  const [saving, setSaving] = useState(false);
  const [planning, setPlanning] = useState(false);
  const plan = action.metadata?.implementationPlan;

  async function update(status: ImprovementStatus, shouldRepeatPattern?: boolean) {
    setSaving(true);
    try {
      await onUpdate(action.id, {
        status,
        user_feedback: feedback,
        result_summary: outcome,
        user_rating: rating ? Number(rating) : undefined,
        should_repeat_pattern: shouldRepeatPattern,
        feedback_type: status === "verified" ? "outcome_review" : "status_update",
      });
    } finally {
      setSaving(false);
    }
  }

  async function generatePlan() {
    setPlanning(true);
    try {
      await onPlan(action.id);
    } finally {
      setPlanning(false);
    }
  }

  return (
    <article className="intelligence-action-card">
      <div className="intelligence-row intelligence-row--space">
        <div className="intelligence-row">
          <span className={badgeClass(action.priority)}>{pretty(action.priority, labels.severity)}</span>
          <span className={badgeClass(action.status)}>{statusLabel(action.status, labels)}</span>
          <span>{action.category}</span>
          <span>{action.proposedByAgent ? labels.agent : labels.manual}</span>
        </div>
        <small>{new Date(action.createdAt).toLocaleDateString(locale === "nn" ? "nn-NO" : "nb-NO")}</small>
      </div>
      <h3>{action.title}</h3>
      <p>{action.description}</p>
      <p className="intelligence-impact">{labels.expectedImpact}: {action.expectedImpact}</p>
      <div className="intelligence-row">
        <span>{labels.effortLabel}: {pretty(action.effort, labels.effort)}</span>
        <span>{labels.riskLabel}: {pretty(action.riskLevel, labels.risk)}</span>
      </div>

      <div className="intelligence-feedback-grid">
        <label>
          {labels.feedbackLabel}
          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder={labels.feedbackPlaceholder}
          />
        </label>
        <label>
          {labels.outcomeLabel}
          <textarea
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
            placeholder={labels.outcomePlaceholder}
          />
        </label>
        <label>
          {labels.ratingLabel}
          <select value={rating} onChange={(event) => setRating(event.target.value)}>
            <option value="">{labels.noRating}</option>
            <option value="5">{labels.rating5}</option>
            <option value="4">{labels.rating4}</option>
            <option value="3">{labels.rating3}</option>
            <option value="2">{labels.rating2}</option>
            <option value="1">{labels.rating1}</option>
          </select>
        </label>
      </div>

      <div className="intelligence-action-buttons">
        <button disabled={saving} onClick={() => update("approved", true)}>{labels.approve}</button>
        <button disabled={saving} onClick={() => update("planned", true)}>{labels.plan}</button>
        <button className="secondary" disabled={saving || planning} onClick={generatePlan}>{planning ? labels.makingPlan : labels.makePlan}</button>
        <button disabled={saving} onClick={() => update("implemented", true)}>{labels.implemented}</button>
        <button disabled={saving} onClick={() => update("verified", true)}>{labels.verified}</button>
        <button className="secondary" disabled={saving} onClick={() => update("deferred")}>{labels.defer}</button>
        <button className="danger" disabled={saving} onClick={() => update("rejected", false)}>{labels.reject}</button>
      </div>

      {plan ? <ImplementationPlanView plan={plan} labels={labels} /> : null}
    </article>
  );
}

function ActionBoard({
  actions,
  labels,
  locale,
  onUpdate,
  onPlan,
}: {
  actions: ImprovementAction[];
  labels: Labels;
  locale: Locale;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
  onPlan: (id: string) => Promise<void>;
}) {
  if (!actions.length) return null;

  const groups: ImprovementStatus[] = ["proposed", "approved", "planned", "implemented", "verified", "deferred", "rejected"];

  return (
    <section className="intelligence-panel intelligence-panel--actions">
      <h2>{labels.feedbackTitle}</h2>
      <p className="intelligence-muted">{labels.feedbackIntro}</p>
      {groups.map((status) => {
        const items = actions.filter((action) => action.status === status);
        if (!items.length) return null;
        return (
          <div className="intelligence-action-group" key={status}>
            <h3>{statusLabel(status, labels)}</h3>
            <div className="intelligence-stack">
              {items.map((action) => (
                <ActionCard key={action.id} action={action} labels={labels} locale={locale} onUpdate={onUpdate} onPlan={onPlan} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default function IntelligenceAdminPage() {
  const { locale } = useLocale();
  const labels = LABELS[locale];

  const [reports, setReports] = useState<IntelligenceReport[]>([]);
  const [actions, setActions] = useState<ImprovementAction[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [actionFilter, setActionFilter] = useState<"open" | "all">("open");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedReport = useMemo(() => reports[0] ?? null, [reports]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/intelligence/daily?limit=7`);
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) {
        setError(data.error ?? labels.fetchReportsError);
        return;
      }
      setReports(data.reports ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.unknownError);
    } finally {
      setLoading(false);
    }
  }, [labels.fetchReportsError, labels.unknownError]);

  const fetchActions = useCallback(async (reportId?: string) => {
    setLoadingActions(true);
    try {
      const params = new URLSearchParams({ limit: "100", status: actionFilter });
      if (reportId) params.set("reportId", reportId);
      const res = await fetch(`/api/admin/intelligence/actions?${params.toString()}`);
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) {
        setError(data.error ?? labels.fetchActionsError);
        return;
      }
      setActions(data.actions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.unknownError);
    } finally {
      setLoadingActions(false);
    }
  }, [actionFilter, labels.fetchActionsError, labels.unknownError]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    fetchActions(selectedReport?.id);
  }, [fetchActions, selectedReport?.id]);

  const generateReport = async (force = false) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/intelligence/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportDate: selectedDate, force }),
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok || !data.report) {
        setError(data.error ?? labels.generateError);
        return;
      }
      setReports((prev) => [data.report!, ...prev.filter((r) => r.id !== data.report!.id)]);
      await fetchActions(data.report.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.unknownError);
    } finally {
      setGenerating(false);
    }
  };

  const downloadMarkdown = (report?: IntelligenceReport | null) => {
    const params = new URLSearchParams();
    if (report?.id) params.set("reportId", report.id);
    else if (selectedDate) params.set("date", selectedDate);
    window.location.href = `/api/admin/intelligence/daily/markdown?${params.toString()}`;
  };

  const runCronNow = async () => {
    setGenerating(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date: selectedDate, force: "0" });
      const res = await fetch(`/api/admin/intelligence/cron?${params.toString()}`, { method: "POST" });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok || !data.report) {
        setError(data.error ?? labels.cronError);
        return;
      }
      setReports((prev) => [data.report!, ...prev.filter((r) => r.id !== data.report!.id)]);
      await fetchActions(data.report.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : labels.unknownError);
    } finally {
      setGenerating(false);
    }
  };

  const updateAction = async (id: string, payload: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/intelligence/actions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as ApiResponse;
    if (!res.ok || !data.action) {
      setError(data.error ?? labels.updateActionError);
      return;
    }
    setActions((prev) => prev.map((item) => (item.id === id ? data.action! : item)));
  };

  const generateImplementationPlan = async (id: string) => {
    const res = await fetch(`/api/admin/intelligence/actions/${id}/plan`, { method: "POST" });
    const data = (await res.json()) as ApiResponse;
    if (!res.ok || !data.action) {
      setError(data.error ?? labels.planError);
      return;
    }
    setActions((prev) => prev.map((item) => (item.id === id ? data.action! : item)));
  };

  return (
    <main className="intelligence-page">
      <header className="intelligence-hero">
        <div>
          <p className="intelligence-kicker">{labels.heroKicker}</p>
          <h1>{labels.heroTitle}</h1>
          <p>{labels.heroText}</p>
          <nav className="intelligence-admin-links" aria-label="Admin-navigasjon">
            <Link href="/admin">{labels.admin}</Link>
            <Link href="/admin/error-reports">{labels.errorReports}</Link>
            <Link href="/">{labels.workbench}</Link>
          </nav>
        </div>
        <div className="intelligence-actions">
          <label>
            {labels.date}
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          <button disabled={generating} onClick={() => generateReport(false)}>
            {generating ? labels.generating : labels.makeOrFetch}
          </button>
          <button className="secondary" disabled={generating} onClick={() => generateReport(true)}>
            {labels.regenerate}
          </button>
          <button className="secondary" disabled={generating} onClick={runCronNow}>
            {labels.runDailyAgent}
          </button>
          <button className="secondary" disabled={!selectedReport} onClick={() => downloadMarkdown(selectedReport)}>
            {labels.downloadMarkdown}
          </button>
          <label>
            {labels.proposals}
            <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value as "open" | "all")}>
              <option value="open">{labels.openProposals}</option>
              <option value="all">{labels.allProposals}</option>
            </select>
          </label>
        </div>
      </header>

      {error ? <div className="intelligence-error">{error}</div> : null}
      {loading ? <div className="intelligence-loading">{labels.loadingReports}</div> : null}
      {loadingActions ? <div className="intelligence-loading">{labels.loadingActions}</div> : null}

      {selectedReport ? (
        <>
          <section className="intelligence-summary">
            <div>
              <p className="intelligence-kicker">{labels.reportDate}</p>
              <h2>{selectedReport.reportDate}</h2>
              <p>{selectedReport.summary}</p>
              <div className="intelligence-row">
                <button className="secondary" onClick={() => downloadMarkdown(selectedReport)}>
                  {labels.exportMarkdown}
                </button>
              </div>
            </div>
            <div className="intelligence-metrics-grid">
              <MetricCard label={labels.runs} value={selectedReport.metrics.counts.runsTotal} />
              <MetricCard label={labels.reports} value={selectedReport.metrics.counts.reportsGenerated} />
              <MetricCard label={labels.uncertainRejected} value={selectedReport.metrics.counts.controllerUncertainOrRejected} />
              <MetricCard label={labels.abDeviation} value={selectedReport.metrics.counts.comparisonsWithDeviation} />
              <MetricCard label={labels.errorReportsMetric} value={selectedReport.metrics.counts.errorReportsTotal} />
              <MetricCard label={labels.trust} value={selectedReport.metrics.quality.avgTillitScore ?? "—"} hint={labels.average} />
            </div>
          </section>

          <ActionBoard actions={actions} labels={labels} locale={locale} onUpdate={updateAction} onPlan={generateImplementationPlan} />
          <RecommendationList items={selectedReport.recommendations} labels={labels} />
          <FindingList title={labels.pipelineFindings} items={selectedReport.pipelineFindings} labels={labels} />
          <FindingList title={labels.productFindings} items={selectedReport.productFindings} labels={labels} />
          <FindingList title={labels.cost} items={selectedReport.costFindings} labels={labels} />
          <FindingList title={labels.marketing} items={selectedReport.marketingFindings} labels={labels} />
          <FindingList title={labels.pricing} items={selectedReport.pricingFindings} labels={labels} />
          <FindingList title={labels.riskFindings} items={selectedReport.riskNotes} labels={labels} />
        </>
      ) : !loading ? (
        <section className="intelligence-empty">
          <h2>{labels.emptyTitle}</h2>
          <p>{labels.emptyText}</p>
        </section>
      ) : null}
    </main>
  );
}
