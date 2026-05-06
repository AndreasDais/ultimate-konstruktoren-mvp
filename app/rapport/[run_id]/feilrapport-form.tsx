"use client";

import { useState } from "react";

const ERROR_TYPES = [
  { value: "feil_talverdi", label: "Feil talverdi" },
  { value: "feil_formel", label: "Feil formel" },
  { value: "feil_standardreferanse", label: "Feil standardreferanse" },
  { value: "feil_eining", label: "Feil eining" },
  { value: "feil_foresetnad", label: "Feil føresetnad" },
  { value: "uklart_sprak", label: "Uklart språk" },
  { value: "manglande_kontroll", label: "Manglande kontroll" },
  { value: "anna", label: "Anna" },
];

const SECTIONS = [
  "Heile rapporten",
  "Samandrag",
  "Forespurnad",
  "Input-tolking",
  "Føresetnader",
  "Resultat",
  "Stegvis utrekning",
  "Fagleg vurdering",
  "Kva er ikkje rekna",
  "Åtvaringar",
  "Agentkontroll",
  "Konklusjon",
];

const SEVERITIES = [
  { value: "low", label: "Låg" },
  { value: "medium", label: "Middels" },
  { value: "high", label: "Høg" },
];

type Props = {
  reportId: string;
};

type FormState = "closed" | "open" | "submitting" | "submitted";

export default function FeilrapportForm({ reportId }: Props) {
  const [state, setState] = useState<FormState>("closed");
  const [errorType, setErrorType] = useState("");
  const [section, setSection] = useState("Heile rapporten");
  const [severity, setSeverity] = useState("medium");
  const [comment, setComment] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit() {
    setErrorMessage("");

    if (!errorType) {
      setErrorMessage("Vel kva type feil det er.");
      return;
    }
    if (comment.trim().length < 5) {
      setErrorMessage("Kommentaren må vere minst 5 teikn.");
      return;
    }

    setState("submitting");

    try {
      const res = await fetch("/api/error-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_id: reportId,
          error_type: errorType,
          selected_section: section,
          severity_user: severity,
          user_comment: comment.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Kunne ikkje sende feilrapport");
      }

      setState("submitted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ukjend feil";
      setErrorMessage(msg);
      setState("open");
    }
  }

  function reset() {
    setState("closed");
    setErrorType("");
    setSection("Heile rapporten");
    setSeverity("medium");
    setComment("");
    setErrorMessage("");
  }

  if (state === "closed") {
    return (
      <div className="feilrapport-trigger no-print">
        <div className="feilrapport-trigger-text">
          <h3 className="feilrapport-trigger-title">Fann du noko som ser feil ut?</h3>
          <p className="feilrapport-hint">
            Send ei tilbakemelding så vi kan forbetre systemet. Brukar-feilrapportar
            hjelper oss å fange feil som agentkontrollen ikkje oppdaga.
          </p>
        </div>
        <button onClick={() => setState("open")} className="uk-btn uk-btn--primary">
          Rapporter feil
        </button>
      </div>
    );
  }

  if (state === "submitted") {
    return (
      <div className="feilrapport-success no-print">
        <h3>Takk for tilbakemeldinga</h3>
        <p>
          Feilrapporten er lagra og blir gjennomgått manuelt. Det hjelper oss å
          gjere systemet betre.
        </p>
        <button onClick={reset} className="uk-btn">
          Send ein til
        </button>
      </div>
    );
  }

  const isSubmitting = state === "submitting";

  return (
    <div className="feilrapport-form no-print">
      <h3>Rapporter feil</h3>
      <p className="feilrapport-form-subtitle">
        All informasjon blir lagra og gjennomgått manuelt.
      </p>

      <div className="feilrapport-field">
        <label htmlFor="fr-type" className="feilrapport-field-label">
          Type feil
        </label>
        <select
          id="fr-type"
          className="feilrapport-input"
          value={errorType}
          onChange={(e) => setErrorType(e.target.value)}
          disabled={isSubmitting}
        >
          <option value="">— Vel feiltype —</option>
          {ERROR_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="feilrapport-field">
        <label htmlFor="fr-section" className="feilrapport-field-label">
          Kva del av rapporten gjeld det?
        </label>
        <select
          id="fr-section"
          className="feilrapport-input"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          disabled={isSubmitting}
        >
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="feilrapport-field">
        <span className="feilrapport-field-label">Alvorlegheit</span>
        <div className="feilrapport-severity">
          {SEVERITIES.map((s) => (
            <label key={s.value} className="feilrapport-severity-option">
              <input
                type="radio"
                name="severity"
                value={s.value}
                checked={severity === s.value}
                onChange={() => setSeverity(s.value)}
                disabled={isSubmitting}
              />
              <span>{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="feilrapport-field">
        <label htmlFor="fr-comment" className="feilrapport-field-label">
          Kommentar
        </label>
        <textarea
          id="fr-comment"
          className="feilrapport-input feilrapport-textarea"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Forklar kva som er feil og kva du forventa..."
          rows={5}
          disabled={isSubmitting}
        />
      </div>

      {errorMessage && <p className="feilrapport-error">{errorMessage}</p>}

      <div className="feilrapport-actions">
        <button onClick={reset} className="uk-btn" disabled={isSubmitting}>
          Avbryt
        </button>
        <button
          onClick={handleSubmit}
          className="uk-btn uk-btn--primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sender..." : "Send feilrapport"}
        </button>
      </div>
    </div>
  );
}