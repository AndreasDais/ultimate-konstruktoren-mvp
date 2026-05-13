"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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

// === FASE-MAPPING (same som server) ===
const PHASE_STYLES: Record<
  MineRow["phase"],
  { label: string; color: string }
> = {
  workbench: {
    label: "Workbench",
    color: "bg-amber-50 text-amber-800 border-amber-200",
  },
  mission_control: {
    label: "Mission Control",
    color: "bg-blue-50 text-blue-800 border-blue-200",
  },
  rapport: {
    label: "Rapport",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  krasja: {
    label: "Krasja",
    color: "bg-red-50 text-red-800 border-red-200",
  },
};

// Vis-rekkjefølge — pipeline-orden + Krasja sist.
const PHASE_ORDER: MineRow["phase"][] = [
  "workbench",
  "mission_control",
  "rapport",
  "krasja",
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("nn-NO", {
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
          placeholder="Søk i berekningar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          aria-label="Søk i berekningar"
        />
      </div>

      {filteredRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
          Ingen treff for &quot;{search}&quot;.
        </p>
      ) : (
        <div className="space-y-6">
          {PHASE_ORDER.map((phase) => {
            const phaseRows = grouped[phase];
            if (phaseRows.length === 0) return null;

            const info = PHASE_STYLES[phase];
            const isCollapsed = collapsed[phase];
            const sectionId = `mine-section-${phase}`;

            return (
              <section key={phase}>
                <button
                  type="button"
                  onClick={() => toggle(phase)}
                  className="group flex w-full items-center justify-between gap-3 rounded-md px-1 py-2 text-left hover:bg-neutral-100 transition-colors"
                  aria-expanded={!isCollapsed}
                  aria-controls={sectionId}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block transition-transform text-neutral-400 group-hover:text-neutral-600 ${
                        isCollapsed ? "" : "rotate-90"
                      }`}
                      aria-hidden="true"
                    >
                      ▶
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${info.color}`}
                    >
                      {info.label}
                    </span>
                    <span className="text-xs text-neutral-500">
                      ({phaseRows.length})
                    </span>
                  </div>
                </button>

                {!isCollapsed && (
                  <ul id={sectionId} className="mt-2 space-y-3">
                    {phaseRows.map((row) => (
                      <li key={row.key}>
                        <CalculationCard row={row} />
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

function CalculationCard({ row }: { row: MineRow }) {
  const phaseInfo = PHASE_STYLES[row.phase];
  const date = formatDate(row.date);

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
                <div className="text-[10px] uppercase tracking-wider text-neutral-500 mt-1">
                  Tillit
                </div>
              </div>
            )}
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${phaseInfo.color}`}
            >
              {phaseInfo.label}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}