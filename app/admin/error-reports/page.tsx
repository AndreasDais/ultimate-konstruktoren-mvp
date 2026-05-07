"use client";

import { useState, useEffect, useCallback } from "react";

type ErrorReportStatus =
  | "open"
  | "under_review"
  | "confirmed"
  | "rejected"
  | "fixed";

type ErrorReportSeverity = "low" | "medium" | "high";

type ErrorReport = {
  id: string;
  report_id: string;
  user_id: string | null;
  error_type: string;
  selected_section: string;
  severity_user: ErrorReportSeverity;
  user_comment: string;
  status: ErrorReportStatus;
  created_at: string;
  // Frå JOIN med reports-tabellen. Kan vere null om reports-rada manglar
  // eller ikkje har eit run_id sett.
  reports: { run_id: string | null } | null;
};

type BadgeStatus = "ok" | "warn" | "bad" | "info" | "neutral";

const STATUS_LABELS: Record<ErrorReportStatus, string> = {
  open: "Open",
  under_review: "Under gjennomgang",
  confirmed: "Bekrefta feil",
  rejected: "Avvist",
  fixed: "Fiksa",
};

const STATUS_BADGE: Record<ErrorReportStatus, BadgeStatus> = {
  open: "warn",
  under_review: "info",
  confirmed: "bad",
  rejected: "neutral",
  fixed: "ok",
};

const ERROR_TYPE_LABELS: Record<string, string> = {
  feil_talverdi: "Feil talverdi",
  feil_formel: "Feil formel",
  feil_standardreferanse: "Feil standardreferanse",
  feil_eining: "Feil eining",
  feil_foresetnad: "Feil føresetnad",
  uklart_sprak: "Uklart språk",
  manglande_kontroll: "Manglande kontroll",
  anna: "Anna",
};

const SEVERITY_BADGE: Record<ErrorReportSeverity, BadgeStatus> = {
  low: "neutral",
  medium: "warn",
  high: "bad",
};

export default function ErrorReportsAdmin() {
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("error_type", typeFilter);

      const res = await fetch(`/api/admin/error-reports?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Klarte ikkje hente feilrapportar");
        return;
      }

      setReports(data.reports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjend feil");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateStatus = async (id: string, newStatus: ErrorReportStatus) => {
    setUpdatingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/error-reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Oppdatering feila");
        return;
      }

      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjend feil");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="uk-shell">
      <header className="uk-topbar">
        <div className="uk-topbar__brand">
          <div className="uk-topbar__logo">UK</div>
          Konstruktøren — Admin
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <header className="mb-10">
            <div className="uk-eyebrow">ADMIN</div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                margin: "8px 0 6px",
                color: "var(--fg)",
              }}
            >
              Feilrapportar
            </h1>
            <p
              style={{
                color: "var(--fg-muted)",
                fontSize: 14,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {loading
                ? "Lastar..."
                : `${reports.length} rapport${reports.length === 1 ? "" : "ar"}`}
            </p>
          </header>

          {/* Filterrad */}
          <section className="uk-card" style={{ marginBottom: 16 }}>
            <div
              className="uk-card__bd"
              style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
            >
              <div style={{ flex: 1, minWidth: 160 }}>
                <label
                  className="uk-eyebrow"
                  style={{ display: "block", marginBottom: 6 }}
                >
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: 13,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)",
                    color: "var(--fg)",
                  }}
                >
                  <option value="">Alle statusar</option>
                  <option value="open">Open</option>
                  <option value="under_review">Under gjennomgang</option>
                  <option value="confirmed">Bekrefta feil</option>
                  <option value="rejected">Avvist</option>
                  <option value="fixed">Fiksa</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label
                  className="uk-eyebrow"
                  style={{ display: "block", marginBottom: 6 }}
                >
                  Feiltype
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: 13,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-sm)",
                    color: "var(--fg)",
                  }}
                >
                  <option value="">Alle typar</option>
                  {Object.entries(ERROR_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Feilmelding */}
          {error && (
            <StatusStripe status="bad" label="Feil" className="mb-4">
              {error}
            </StatusStripe>
          )}

          {/* Tom-tilstand */}
          {!loading && reports.length === 0 && (
            <section className="uk-card">
              <div
                className="uk-card__bd"
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: "var(--fg-muted)",
                  fontSize: 13,
                }}
              >
                Ingen feilrapportar matchar filteret.
              </div>
            </section>
          )}

          {/* Listing */}
          {reports.map((report) => {
            const runId = report.reports?.run_id ?? null;

            return (
              <section
                key={report.id}
                className="uk-card"
                style={{ marginBottom: 12 }}
              >
                <div className="uk-card__hd">
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
                    >
                      <Badge status={SEVERITY_BADGE[report.severity_user]}>
                        {report.severity_user}
                      </Badge>
                      <span className="uk-eyebrow">
                        {ERROR_TYPE_LABELS[report.error_type] || report.error_type}
                      </span>
                    </div>
                    <span
                      className="uk-mono"
                      style={{ fontSize: 11, color: "var(--fg-muted)" }}
                    >
                      {new Date(report.created_at).toLocaleString("nb-NO")}
                    </span>
                  </div>
                  <Badge status={STATUS_BADGE[report.status]}>
                    {STATUS_LABELS[report.status]}
                  </Badge>
                </div>
                <div
                  className="uk-card__bd"
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <Row label="Seksjon" value={report.selected_section} />
                  <div>
                    <div className="uk-eyebrow" style={{ marginBottom: 6 }}>
                      Brukar-kommentar
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: "var(--fg-2)",
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {report.user_comment}
                    </p>
                  </div>
                  <Row label="Rapport-ID" value={report.report_id} mono />
                  {runId && <Row label="Run-ID" value={runId} mono />}

                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      paddingTop: 10,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <ActionButton
                      onClick={() => updateStatus(report.id, "under_review")}
                      disabled={
                        updatingId === report.id ||
                        report.status === "under_review"
                      }
                    >
                      Under gjennomgang
                    </ActionButton>
                    <ActionButton
                      onClick={() => updateStatus(report.id, "confirmed")}
                      disabled={
                        updatingId === report.id || report.status === "confirmed"
                      }
                    >
                      Bekreft som feil
                    </ActionButton>
                    <ActionButton
                      onClick={() => updateStatus(report.id, "rejected")}
                      disabled={
                        updatingId === report.id || report.status === "rejected"
                      }
                    >
                      Avvis
                    </ActionButton>
                    <ActionButton
                      onClick={() => updateStatus(report.id, "fixed")}
                      disabled={
                        updatingId === report.id || report.status === "fixed"
                      }
                    >
                      Markér som fiksa
                    </ActionButton>
                    {runId ? (
                      <a
                        href={`/rapport/${runId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="uk-btn uk-btn--ghost"
                        style={{ fontSize: 12 }}
                      >
                        Sjå rapport →
                      </a>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--fg-muted)",
                          padding: "6px 10px",
                          fontStyle: "italic",
                        }}
                      >
                        Ingen kjørerapport
                      </span>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="uk-btn"
      style={{
        fontSize: 12,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
      <span style={{ color: "var(--fg-muted)", width: 100, flexShrink: 0 }}>
        {label}
      </span>
      <span
        className={mono ? "uk-mono" : undefined}
        style={{
          color: "var(--fg)",
          fontSize: mono ? 12 : 13,
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Badge({
  status,
  children,
}: {
  status: BadgeStatus;
  children: React.ReactNode;
}) {
  const colors: Record<BadgeStatus, { fg: string; bg: string; border: string }> =
    {
      ok: { fg: "var(--ok)", bg: "var(--ok-bg)", border: "var(--ok-border)" },
      warn: { fg: "var(--warn)", bg: "var(--warn-bg)", border: "var(--warn-border)" },
      bad: { fg: "var(--bad)", bg: "var(--bad-bg)", border: "var(--bad-border)" },
      info: { fg: "var(--info)", bg: "var(--info-bg)", border: "var(--info-border)" },
      neutral: {
        fg: "var(--fg-2)",
        bg: "var(--surface-2)",
        border: "var(--border)",
      },
    };
  const c = colors[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 4,
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.fg,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function StatusStripe({
  status,
  label,
  children,
  className,
}: {
  status: BadgeStatus;
  label?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const colors: Record<BadgeStatus, { fg: string; bg: string; border: string }> =
    {
      ok: { fg: "var(--ok)", bg: "var(--ok-bg)", border: "var(--ok-border)" },
      warn: { fg: "var(--warn)", bg: "var(--warn-bg)", border: "var(--warn-border)" },
      bad: { fg: "var(--bad)", bg: "var(--bad-bg)", border: "var(--bad-border)" },
      info: { fg: "var(--info)", bg: "var(--info-bg)", border: "var(--info-border)" },
      neutral: {
        fg: "var(--fg-2)",
        bg: "var(--surface-2)",
        border: "var(--border)",
      },
    };
  const c = colors[status];
  return (
    <section
      className={className}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.fg}`,
        borderRadius: "var(--r-sm)",
        padding: "14px 16px",
        color: c.fg,
        marginBottom: 16,
      }}
    >
      {label && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 6,
          }}
        >
          {label}
        </div>
      )}
      <div style={{ color: "var(--fg-2)", fontSize: 13, lineHeight: 1.55 }}>
        {children}
      </div>
    </section>
  );
}