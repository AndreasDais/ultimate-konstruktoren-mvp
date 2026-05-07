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
  // Frå manual_reviews-tabellen — count av eksisterande reviews
  review_count: number;
};

type BadgeStatus = "ok" | "warn" | "bad" | "info" | "neutral";

// Berre desse statusane utløyser review-modal. "under_review" er ein
// arbeidstilstand utan endeleg avgjerd og lagrast direkte.
type SubstantialDecision = "confirmed" | "rejected" | "fixed";

type ReviewModalState = {
  errorReportId: string;
  decision: SubstantialDecision;
};

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

const DECISION_LABELS: Record<SubstantialDecision, string> = {
  confirmed: "Bekreft som feil",
  rejected: "Avvis",
  fixed: "Markér som fiksa",
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

  // Review-modal state
  const [reviewModal, setReviewModal] = useState<ReviewModalState | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewActionTaken, setReviewActionTaken] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

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

  // Direkte oppdatering — berre for "under_review" (ingen review-data nødvendig)
  const quickUpdate = async (id: string, newStatus: ErrorReportStatus) => {
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

  // Substansiell avgjerd — opnar modal for å samle notes/action_taken
  const openReviewModal = (id: string, decision: SubstantialDecision) => {
    setReviewModal({ errorReportId: id, decision });
    setReviewNotes("");
    setReviewActionTaken("");
  };

  const closeReviewModal = () => {
    setReviewModal(null);
    setReviewNotes("");
    setReviewActionTaken("");
  };

  const submitReview = async () => {
    if (!reviewModal) return;
    setSubmittingReview(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/error-reports/${reviewModal.errorReportId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: reviewModal.decision,
            notes: reviewNotes.trim() || null,
            action_taken: reviewActionTaken.trim() || null,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Oppdatering feila");
        return;
      }

      closeReviewModal();
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjend feil");
    } finally {
      setSubmittingReview(false);
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
            <div className="uk-eyebrow" style={{ marginBottom: 8 }}>
              Admin · feilrapportar
            </div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                fontWeight: 600,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Feilrapportar
            </h1>
            <p
              style={{
                color: "var(--fg-muted)",
                fontSize: 13,
                marginTop: 8,
                lineHeight: 1.55,
              }}
            >
              Triage av brukarrapporterte feil. Substansielle avgjerder (Bekreft,
              Avvis, Fiksa) blir lagra i manual_reviews med notat for læringssløyfa.
            </p>
          </header>

          {/* Filter */}
          <section className="uk-card" style={{ marginBottom: 16 }}>
            <div
              className="uk-card__bd"
              style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}
            >
              <div>
                <label
                  className="uk-eyebrow"
                  style={{ marginBottom: 6, display: "block" }}
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
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="uk-eyebrow"
                  style={{ marginBottom: 6, display: "block" }}
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
                      {report.review_count > 0 && (
                        <Badge status="info">
                          {report.review_count} review
                          {report.review_count !== 1 ? "s" : ""}
                        </Badge>
                      )}
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
                      onClick={() => quickUpdate(report.id, "under_review")}
                      disabled={
                        updatingId === report.id ||
                        report.status === "under_review"
                      }
                    >
                      Under gjennomgang
                    </ActionButton>
                    <ActionButton
                      onClick={() => openReviewModal(report.id, "confirmed")}
                      disabled={
                        updatingId === report.id || report.status === "confirmed"
                      }
                    >
                      Bekreft som feil
                    </ActionButton>
                    <ActionButton
                      onClick={() => openReviewModal(report.id, "rejected")}
                      disabled={
                        updatingId === report.id || report.status === "rejected"
                      }
                    >
                      Avvis
                    </ActionButton>
                    <ActionButton
                      onClick={() => openReviewModal(report.id, "fixed")}
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

      {/* Review-modal */}
      {reviewModal && (
        <ReviewModal
          decision={reviewModal.decision}
          notes={reviewNotes}
          actionTaken={reviewActionTaken}
          submitting={submittingReview}
          onNotesChange={setReviewNotes}
          onActionTakenChange={setReviewActionTaken}
          onSubmit={submitReview}
          onCancel={closeReviewModal}
        />
      )}
    </div>
  );
}

function ReviewModal({
  decision,
  notes,
  actionTaken,
  submitting,
  onNotesChange,
  onActionTakenChange,
  onSubmit,
  onCancel,
}: {
  decision: SubstantialDecision;
  notes: string;
  actionTaken: string;
  submitting: boolean;
  onNotesChange: (v: string) => void;
  onActionTakenChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        className="uk-card"
        style={{
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          background: "var(--bg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="uk-card__hd">
          <div>
            <div className="uk-eyebrow" style={{ marginBottom: 4 }}>
              Avgjerd
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 600,
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {DECISION_LABELS[decision]}
            </h2>
          </div>
        </div>
        <div
          className="uk-card__bd"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--fg-muted)",
              lineHeight: 1.55,
            }}
          >
            Avgjerda blir lagra i manual_reviews. Notatet er for ditt eige
            framtidige sjølv — kvifor tok du denne avgjerda? Kva såg du?
          </p>

          <div>
            <label
              className="uk-eyebrow"
              style={{ marginBottom: 6, display: "block" }}
            >
              Notat (kvifor)
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Kva er grunnlaget for avgjerda?"
              rows={4}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: "var(--font-body)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                color: "var(--fg)",
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
          </div>

          <div>
            <label
              className="uk-eyebrow"
              style={{ marginBottom: 6, display: "block" }}
            >
              Tiltak (valfritt)
            </label>
            <textarea
              value={actionTaken}
              onChange={(e) => onActionTakenChange(e.target.value)}
              placeholder="Kva endringar gjorde du? Oppdatert prompt? Lagt til test?"
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: "var(--font-body)",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                color: "var(--fg)",
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              paddingTop: 6,
            }}
          >
            <button
              onClick={onCancel}
              disabled={submitting}
              className="uk-btn uk-btn--ghost"
              style={{ fontSize: 12 }}
            >
              Avbryt
            </button>
            <button
              onClick={onSubmit}
              disabled={submitting}
              className="uk-btn"
              style={{
                fontSize: 12,
                opacity: submitting ? 0.5 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Lagrar..." : "Lagre avgjerd"}
            </button>
          </div>
        </div>
      </div>
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