"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { InfoPopover } from "@/app/components/InfoPopover";
import type { Locale } from "@/lib/locale";
import { useLocale } from "@/lib/locale-context";

// === DELT TYPE — speilar serverdefinert MineRow i page.tsx ===
export type MineRow = {
  key: string;
  title: string;
  date: string | null;
  phase: "workbench" | "mission_control" | "rapport" | "krasja";
  href: string;
  tillit: number | null;
  documentId: string | null;
};

// === FASE-MAPPING ===
// PHASE_COLORS er språknøytrale Tailwind-klassar.
// PHASE_LABELS_BY_LOCALE held label + forklaring per fase per språk.
const PHASE_COLORS: Record<MineRow["phase"], string> = {
  workbench: "bg-amber-50 text-amber-800 border-amber-200",
  mission_control: "bg-blue-50 text-blue-800 border-blue-200",
  rapport: "bg-emerald-50 text-emerald-800 border-emerald-200",
  krasja: "bg-red-50 text-red-800 border-red-200",
};

type PhaseLabelInfo = { label: string; explanation: string };

const PHASE_LABELS_BY_LOCALE: Record<Locale, Record<MineRow["phase"], PhaseLabelInfo>> = {
  nb: {
    workbench: {
      label: "Workbench",
      explanation:
        "Tolkeren har lest spørsmålet, men beregningen er ikke startet ennå. Klikk på raden for å fortsette derfra.",
    },
    mission_control: {
      label: "Mission Control",
      explanation:
        "Konstruktør A og B er ferdige med utregningen. Klikk for å se sammenligning, kontrollør-vurdering og generere rapporten.",
    },
    rapport: {
      label: "Rapport",
      explanation:
        "Ferdig beregningsnotat. Klikk for å lese, eksportere til Word eller dele via QR-kode.",
    },
    krasja: {
      label: "Krasjet",
      explanation:
        "Beregningen ble avbrutt eller feilet. Du kan starte på nytt fra samme input ved å klikke på raden.",
    },
  },
  nn: {
    workbench: {
      label: "Workbench",
      explanation:
        "Tolkar har lese spørsmålet, men berekninga er ikkje starta enno. Klikk på rada for å halde fram derifrå.",
    },
    mission_control: {
      label: "Mission Control",
      explanation:
        "Konstruktør A og B er ferdige med utrekninga. Klikk for å sjå samanlikning, kontrollør-vurdering og generere rapporten.",
    },
    rapport: {
      label: "Rapport",
      explanation:
        "Ferdig berekningsnotat. Klikk for å lese, eksportere til Word eller dele via QR-kode.",
    },
    krasja: {
      label: "Krasja",
      explanation:
        "Berekninga vart avbroten eller feila. Du kan starte på nytt frå same input ved å klikke på rada.",
    },
  },
};

// === ANDRE UI-STRENGER ===
const ML_LABELS: Record<string, Record<Locale, string>> = {
  sokPlaceholder: { nb: "Søk i beregninger...", nn: "Søk i berekningar..." },
  sokAriaLabel: { nb: "Søk i beregninger", nn: "Søk i berekningar" },
  ingenTreffPre: { nb: 'Ingen treff for "', nn: 'Ingen treff for "' },
  ingenTreffPost: { nb: '".', nn: '".' },
  tillit: { nb: "Tillit", nn: "Tillit" },
  tillitSkarLabel: { nb: "Tillit-skår", nn: "Tillit-skår" },
  tillitPopover1: { nb: "AI-pipelinens interne enighet (0–100). Måler hvor godt konstruktørene og kontrolløren er enige om resultatet.", nn: "AI-pipeline si interne semje (0–100). Måler kor godt konstruktørane og kontrolløren er einige om resultatet." },
  tillitPopover2Pre: { nb: "Erstatter", nn: "Erstattar" },
  tillitPopover2Mid: { nb: "ikke", nn: "ikkje" },
  tillitPopover2Post: { nb: "fagperson-kontroll. Formelen er en pilot-hypotese og blir kalibrert i v0.2.", nn: "fagperson-kontroll. Formelen er ein pilot-hypotese og blir kalibrert i v0.2." },
};

// Vis-rekkjefølge — pipeline-orden + Krasja sist.
const PHASE_ORDER: MineRow["phase"][] = [
  "workbench",
  "mission_control",
  "rapport",
  "krasja",
];

function formatDate(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const tag = locale === "nb" ? "nb-NO" : "nn-NO";
  return new Intl.DateTimeFormat(tag, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getTillitColor(score: number): string {
  if (score >= 90) return "text-emerald-800";
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function MineList({ rows }: { rows: MineRow[] }) {
  const { locale } = useLocale();
  const [search, setSearch] = useState("");
  // Folde-state per fase. Default: alle opne.
  const [collapsed, setCollapsed] = useState<Record<MineRow["phase"], boolean>>(
    {
      workbench: false,
      mission_control: false,
      rapport: false,
      krasja: false,
    }
  );

  function toggle(phase: MineRow["phase"]) {
    setCollapsed((prev) => ({ ...prev, [phase]: !prev[phase] }));
  }

  // Filtrer på søk (title + document_id, case-insensitive)
  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.documentId?.toLowerCase().includes(q) ?? false)
    );
  }, [search, rows]);

  // Grupper på fase
  const grouped = useMemo(() => {
    const out: Record<MineRow["phase"], MineRow[]> = {
      workbench: [],
      mission_control: [],
      rapport: [],
      krasja: [],
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
          placeholder={ML_LABELS.sokPlaceholder[locale]}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          aria-label={ML_LABELS.sokAriaLabel[locale]}
        />
      </div>

      {filteredRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
          {ML_LABELS.ingenTreffPre[locale]}{search}{ML_LABELS.ingenTreffPost[locale]}
        </p>
      ) : (
        <div className="space-y-6">
          {PHASE_ORDER.map((phase) => {
            const phaseRows = grouped[phase];
            if (phaseRows.length === 0) return null;

            const info = PHASE_LABELS_BY_LOCALE[locale][phase];
            const color = PHASE_COLORS[phase];
            const isCollapsed = collapsed[phase];
            const sectionId = `mine-section-${phase}`;

            return (
              <section key={phase}>
                <div className="flex items-center gap-2 px-1 py-2">
                  <button
                    type="button"
                    onClick={() => toggle(phase)}
                    className="group flex flex-1 items-center gap-2 rounded-md text-left hover:bg-neutral-100 transition-colors py-1 px-1 -mx-1"
                    aria-expanded={!isCollapsed}
                    aria-controls={sectionId}
                  >
                    <span
                      className={`inline-block transition-transform text-neutral-400 group-hover:text-neutral-600 ${
                        isCollapsed ? "" : "rotate-90"
                      }`}
                      aria-hidden="true"
                    >
                      ▶
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${color}`}
                    >
                      {info.label}
                    </span>
                    <span className="text-xs text-neutral-500">
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
                        <CalculationCard row={row} locale={locale} />
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

function CalculationCard({ row, locale }: { row: MineRow; locale: Locale }) {
  const phaseLabel = PHASE_LABELS_BY_LOCALE[locale][row.phase];
  const phaseColor = PHASE_COLORS[row.phase];
  const date = formatDate(row.date, locale);

  return (
    <Link
      href={row.href}
      className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400 hover:shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-neutral-900 truncate">
              {row.title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
              <span>{date}</span>
              {row.documentId && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{row.documentId}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {row.tillit !== null && (
              <div className="text-right">
                <div
                  className={`text-xl font-semibold leading-none ${getTillitColor(
                    row.tillit
                  )}`}
                >
                  {row.tillit}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-neutral-500 mt-1 inline-flex items-center">
                  <span>{ML_LABELS.tillit[locale]}</span>
                  <InfoPopover label={ML_LABELS.tillitSkarLabel[locale]}>
                    <p>{ML_LABELS.tillitPopover1[locale]}</p>
                    <p>
                      {ML_LABELS.tillitPopover2Pre[locale]} <strong>{ML_LABELS.tillitPopover2Mid[locale]}</strong> {ML_LABELS.tillitPopover2Post[locale]}
                    </p>
                  </InfoPopover>
                </div>
              </div>
            )}
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${phaseColor}`}
            >
              {phaseLabel.label}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}