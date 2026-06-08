"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { InfoPopover } from "@/app/components/InfoPopover";
import type { Locale } from "@/lib/locale";
import { useLocale } from "@/lib/locale-context";
import { loadSharedReportShortcuts } from "@/lib/shared-report-shortcuts";

// === DELT TYPE — speilar serverdefinert MineRow i page.tsx ===
export type MineRow = {
  key: string;
  title: string;
  date: string | null;
  phase: "workbench" | "mission_control" | "rapport" | "shared";
  href: string | null;
  pipelineHref: string | null;
  tillit: number | null;
  documentId: string | null;
};

// === FASE-MAPPING ===
// PHASE_COLORS er språknøytrale token-baserte stilar.
// PHASE_LABELS_BY_LANG held label + forklaring per fase per språk.
const PHASE_COLORS: Record<MineRow["phase"], CSSProperties> = {
  workbench: { background: "var(--warn-bg)", color: "var(--warn)", borderColor: "var(--warn-border)" },
  mission_control: { background: "var(--info-bg)", color: "var(--info)", borderColor: "var(--info-border)" },
  rapport: { background: "var(--ok-bg)", color: "var(--ok)", borderColor: "var(--ok-border)" },
  shared: { background: "var(--surface-2)", color: "var(--fg-2)", borderColor: "var(--border-2)" },
};

type PhaseLabelInfo = { label: string; explanation: string };
type LangKey = "nb" | "nn" | "en";

const PHASE_LABELS_BY_LANG: Record<LangKey, Record<MineRow["phase"], PhaseLabelInfo>> = {
  nb: {
    workbench: {
      label: "Workbench",
      explanation:
        "Tolkeren har lest spørsmålet, men det finnes ikke en ferdig rapport ennå.",
    },
    mission_control: {
      label: "Status",
      explanation:
        "Beregningen har pipeline-status, men ingen ferdig rapport som kan åpnes her ennå.",
    },
    rapport: {
      label: "Rapport",
      explanation:
        "Ferdig beregningsnotat. Åpne rapporten eller se en sanitert pipeline-review.",
    },
    shared: {
      label: "Delt",
      explanation:
        "Rapporter du har åpnet via en delelenke i denne nettleseren.",
    },
  },
  nn: {
    workbench: {
      label: "Workbench",
      explanation:
        "Tolkar har lese spørsmålet, men det finst ikkje ein ferdig rapport enno.",
    },
    mission_control: {
      label: "Status",
      explanation:
        "Berekninga har pipeline-status, men ingen ferdig rapport som kan opnast her enno.",
    },
    rapport: {
      label: "Rapport",
      explanation:
        "Ferdig berekningsnotat. Opne rapporten eller sjå ein sanitert pipeline-review.",
    },
    shared: {
      label: "Delt",
      explanation:
        "Rapportar du har opna via ei delelenkje i denne nettlesaren.",
    },
  },
  en: {
    workbench: {
      label: "Workbench",
      explanation:
        "The interpreter has read the request, but there is no completed report yet.",
    },
    mission_control: {
      label: "Status",
      explanation:
        "The run has pipeline status, but no completed report is available here yet.",
    },
    rapport: {
      label: "Report",
      explanation:
        "Completed calculation note. Open the report or inspect a sanitized pipeline review.",
    },
    shared: {
      label: "Shared",
      explanation:
        "Reports you have opened from a share link in this browser.",
    },
  },
};

// === ANDRE UI-STRENGER ===
const ML_LABELS: Record<string, Record<LangKey, string>> = {
  sokPlaceholder: {
    nb: "Søk i beregninger...",
    nn: "Søk i berekningar...",
    en: "Search calculations...",
  },
  sokAriaLabel: {
    nb: "Søk i beregninger",
    nn: "Søk i berekningar",
    en: "Search calculations",
  },
  ingenTreffPre: { nb: 'Ingen treff for "', nn: 'Ingen treff for "', en: 'No results for "' },
  ingenTreffPost: { nb: '".', nn: '".', en: '".' },
  tillit: { nb: "Tillit", nn: "Tillit", en: "Trust" },
  tillitSkarLabel: { nb: "Tillit-skår", nn: "Tillit-skår", en: "Trust score" },
  tillitPopover1: {
    nb: "AI-pipelinens interne enighet (0–100). Måler hvor godt konstruktørene og kontrolløren er enige om resultatet.",
    nn: "AI-pipeline si interne semje (0–100). Måler kor godt konstruktørane og kontrolløren er einige om resultatet.",
    en: "Internal agreement across the AI pipeline (0–100). Measures how well the engineers and the controller agree on the result.",
  },
  tillitPopover2Pre: { nb: "Erstatter", nn: "Erstattar", en: "Does" },
  tillitPopover2Mid: { nb: "ikke", nn: "ikkje", en: "not" },
  tillitPopover2Post: {
    nb: "fagperson-kontroll. Formelen er en pilot-hypotese og blir kalibrert i v0.2.",
    nn: "fagperson-kontroll. Formelen er ein pilot-hypotese og blir kalibrert i v0.2.",
    en: "replace professional review. The formula is a pilot hypothesis and will be recalibrated in v0.2.",
  },
  openReport: { nb: "Åpne rapport", nn: "Opne rapport", en: "Open report" },
  openMissionControl: {
    nb: "Åpne Mission Control",
    nn: "Opne Mission Control",
    en: "Open Mission Control",
  },
  openWorkbench: { nb: "Åpne Workbench", nn: "Opne Workbench", en: "Open Workbench" },
  openSharedReport: { nb: "Åpne delt rapport", nn: "Opne delt rapport", en: "Open shared report" },
  pipelineReview: { nb: "Pipeline-review", nn: "Pipeline-review", en: "Pipeline review" },
  noReportYet: { nb: "Ingen rapport ennå", nn: "Ingen rapport enno", en: "No report yet" },
  processing: { nb: "Behandles fortsatt", nn: "Blir framleis behandla", en: "Still processing" },
  ingenBerekningar: {
    nb: "Ingen beregninger ennå",
    nn: "Ingen berekningar enno",
    en: "No calculations yet",
  },
  narDuStartar: {
    nb: "Når du starter din første beregning, dukker den opp her.",
    nn: "Når du startar di første berekning, dukkar ho opp her.",
    en: "When you start your first calculation, it will appear here.",
  },
  startEiBerekning: {
    nb: "Start en beregning →",
    nn: "Start ei berekning →",
    en: "Start a calculation →",
  },
};

// Vis-rekkjefølge — pipeline-orden.
const PHASE_ORDER: MineRow["phase"][] = [
  "workbench",
  "mission_control",
  "rapport",
  "shared",
];

function formatDate(iso: string | null, langKey: LangKey): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const tag = langKey === "en" ? "en-US" : langKey === "nb" ? "nb-NO" : "nn-NO";
  return new Intl.DateTimeFormat(tag, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getTillitColor(score: number): string {
  if (score >= 75) return "var(--ok)";
  if (score >= 50) return "var(--warn)";
  return "var(--bad)";
}

export function MineList({
  rows,
  displayLanguage,
}: {
  rows: MineRow[];
  /** Frå server (mine/page.tsx) basert på pilar-ui-mode cookie. */
  displayLanguage?: LangKey;
}) {
  const { locale } = useLocale();
  const langKey: LangKey = displayLanguage ?? locale;
  const [search, setSearch] = useState("");
  const [sharedRows, setSharedRows] = useState<MineRow[]>([]);
  // Folde-state per fase. Default: alle opne.
  const [collapsed, setCollapsed] = useState<Record<MineRow["phase"], boolean>>(
    {
      workbench: false,
      mission_control: false,
      rapport: false,
      shared: false,
    }
  );

  useEffect(() => {
    const load = () => {
      setSharedRows(
        loadSharedReportShortcuts().map((row) => ({
          key: `shared-${row.runId}`,
          title: row.title,
          date: row.date ?? row.savedAt,
          phase: "shared" as const,
          href: row.href,
          pipelineHref: null,
          tillit: null,
          documentId: row.documentId,
        })),
      );
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  function toggle(phase: MineRow["phase"]) {
    setCollapsed((prev) => ({ ...prev, [phase]: !prev[phase] }));
  }

  const hasAnyRows = rows.length > 0 || sharedRows.length > 0;

  // Filtrer på søk (title + document_id, case-insensitive)
  const filteredRows = useMemo(() => {
    const allRows = [...rows, ...sharedRows];
    const q = search.toLowerCase().trim();
    if (!q) return allRows;
    return allRows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.documentId?.toLowerCase().includes(q) ?? false)
    );
  }, [search, rows, sharedRows]);

  // Grupper på fase
  const grouped = useMemo(() => {
    const out: Record<MineRow["phase"], MineRow[]> = {
      workbench: [],
      mission_control: [],
      rapport: [],
      shared: [],
    };
    for (const row of filteredRows) {
      out[row.phase].push(row);
    }
    return out;
  }, [filteredRows]);

  return (
    <>
      {/* Søkefelt */}
      <div className="mb-6">
        <input
          type="search"
          placeholder={ML_LABELS.sokPlaceholder[langKey]}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500"
          style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--fg)" }}
          aria-label={ML_LABELS.sokAriaLabel[langKey]}
        />
      </div>

      {!hasAnyRows && !search ? (
        <div
          className="rounded-lg border border-dashed p-10 text-center"
          style={{ borderColor: "var(--border-2)", background: "var(--surface-2)" }}
        >
          <p className="font-medium mb-1" style={{ color: "var(--fg-2)" }}>
            {ML_LABELS.ingenBerekningar[langKey]}
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
            {ML_LABELS.narDuStartar[langKey]}
          </p>
          <Link href="/" className="uk-btn uk-btn--primary">
            {ML_LABELS.startEiBerekning[langKey]}
          </Link>
        </div>
      ) : filteredRows.length === 0 ? (
        <p
          className="rounded-lg border border-dashed p-6 text-center text-sm"
          style={{ borderColor: "var(--border-2)", background: "var(--surface-2)", color: "var(--fg-muted)" }}
        >
          {ML_LABELS.ingenTreffPre[langKey]}{search}{ML_LABELS.ingenTreffPost[langKey]}
        </p>
      ) : (
        <div className="space-y-6">
          {PHASE_ORDER.map((phase) => {
            const phaseRows = grouped[phase];
            if (phaseRows.length === 0) return null;

            const info = PHASE_LABELS_BY_LANG[langKey][phase];
            const color = PHASE_COLORS[phase];
            const isCollapsed = collapsed[phase];
            const sectionId = `mine-section-${phase}`;

            return (
              <section key={phase}>
                <div className="flex items-center gap-2 px-1 py-2">
                  <button
                    type="button"
                    onClick={() => toggle(phase)}
                    className="flex flex-1 items-center gap-2 rounded-md text-left transition-colors py-1 px-1 -mx-1"
                    aria-expanded={!isCollapsed}
                    aria-controls={sectionId}
                  >
                    <span
                      className={`inline-block transition-transform ${
                        isCollapsed ? "" : "rotate-90"
                      }`}
                      style={{ color: "var(--fg-faint)" }}
                      aria-hidden="true"
                    >
                      ▶
                    </span>
                    <span
                      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
                      style={color}
                    >
                      {info.label}
                    </span>
                    <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                      ({phaseRows.length})
                    </span>
                  </button>
                  <InfoPopover label={info.label}>
                    <p>{info.explanation}</p>
                  </InfoPopover>
                </div>

                {!isCollapsed && (
                  <ul id={sectionId} className="mt-2 space-y-3">
                    {phaseRows.map((row) => (
                      <li key={row.key}>
                        <CalculationCard row={row} langKey={langKey} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function CalculationCard({ row, langKey }: { row: MineRow; langKey: LangKey }) {
  const phaseLabel = PHASE_LABELS_BY_LANG[langKey][row.phase];
  const phaseColor = PHASE_COLORS[row.phase];
  const date = formatDate(row.date, langKey);
  const statusText =
    row.phase === "mission_control"
        ? ML_LABELS.noReportYet[langKey]
        : row.phase === "workbench"
          ? ML_LABELS.processing[langKey]
          : null;
  const primaryActionLabel =
    row.phase === "rapport"
      ? ML_LABELS.openReport[langKey]
      : row.phase === "shared"
        ? ML_LABELS.openSharedReport[langKey]
      : row.phase === "mission_control"
        ? ML_LABELS.openMissionControl[langKey]
        : ML_LABELS.openWorkbench[langKey];

  return (
    <article className="uk-card p-4 transition-colors hover:shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="font-medium truncate" style={{ color: "var(--fg)" }}>
              {row.title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--fg-muted)" }}>
              <span>{date}</span>
              {row.documentId && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{row.documentId}</span>
                </>
              )}
            </div>
            {statusText && (
              <p className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>
                {statusText}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 sm:justify-end">
            {row.tillit !== null && (
              <div className="text-left sm:text-right">
                <div
                  className="text-xl font-semibold leading-none"
                  style={{ color: getTillitColor(row.tillit) }}
                >
                  {row.tillit}
                </div>
                <div className="text-[10px] uppercase tracking-wider mt-1 inline-flex items-center" style={{ color: "var(--fg-muted)" }}>
                  <span>{ML_LABELS.tillit[langKey]}</span>
                  <InfoPopover label={ML_LABELS.tillitSkarLabel[langKey]}>
                    <p>{ML_LABELS.tillitPopover1[langKey]}</p>
                    <p>
                      {ML_LABELS.tillitPopover2Pre[langKey]} <strong>{ML_LABELS.tillitPopover2Mid[langKey]}</strong> {ML_LABELS.tillitPopover2Post[langKey]}
                    </p>
                  </InfoPopover>
                </div>
              </div>
            )}
            <span
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap"
              style={phaseColor}
            >
              {phaseLabel.label}
            </span>
          </div>
        </div>

        {(row.href || row.pipelineHref) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {row.href && (
              <Link href={row.href} className="uk-btn uk-btn--primary">
                {primaryActionLabel}
              </Link>
            )}
            {row.pipelineHref && (
              <Link href={row.pipelineHref} className="uk-btn">
                {ML_LABELS.pipelineReview[langKey]}
              </Link>
            )}
          </div>
        )}
    </article>
  );
}
