"use client";

/**
 * ControllerDecisionCard — "Controller · final decision"-kortet på resultatsida.
 *
 * Porta frå Claude Design-handoff (design_handoff_controller_box): eit roleg,
 * autoritativt "verdict / kontrollert-berekning forside-ark" som erstattar den
 * gamle StatusStripe + chip-stabelen. Identitet skiftar med decision_status
 * (data-status → variant-tokens i controller-card.css).
 *
 * TILLIT (ufråvikeleg): det ståande atterhaldet + "AI-pipeline verdict ·
 * preliminary"-sub-linja er synleg i KVAR variant inkl. approved. Verdikt =
 * AI-pipeline-tiltru, ikkje fagleg godkjenning.
 *
 * Alle disclosure-ar brukar JS-målt pixel-height (Collapse), aldri grid 0fr→1fr.
 * Komponenten eig si eiga disclosure-state + lokale locale-records (rører ikkje
 * lib/result/labels.ts). Data: ControllerDecision + ComparisonResult + chips
 * frå buildKontrollorChips.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/locale";
import { decisionStatusLabel } from "@/lib/format";
import type {
  CalculationResult,
  ComparisonResult,
  ControllerDecision,
  KontrollorChip,
} from "@/lib/result/types";
import type { EngineeringContext } from "@/lib/engineering-context";
import {
  displayLanguageForContext,
  sanitizeAiscGuardedOutputText,
  polishNorwegianRoleText,
} from "@/lib/international/display";
import {
  buildKontrollorChips,
  getVerdiktForMatchStatus,
  getFirstSentence,
} from "@/lib/result/kontrollor-chips";
import { isRealIssue } from "@/lib/compare/consistency-issues";
import "./controller-card.css";

type LangKey = "nb" | "nn" | "en";
type Level = "high" | "medium" | "low";
type Tone = "ok" | "warn" | "bad";

const SEAL: Record<string, string> = {
  approved: "✓",
  approved_with_warnings: "✓",
  uncertain: "?",
  rejected: "✕",
};

const CD_LABELS: Record<
  LangKey,
  {
    eyebrow: string;
    popover: string;
    verdictSub: string;
    risk: string;
    caveatLead: string;
    caveatBody: string;
    engNote: string;
    method: string;
    assumptions: string;
    show: string;
    hide: string;
    blockedHd: string;
    manualReview: string;
    selfLabel: string;
    selfNone: string;
    selfFound: string;
    readAssess: string;
    hideAssess: string;
  }
> = {
  nb: {
    eyebrow: "Kontrollør — endelig avgjørelse",
    popover:
      "Kontrolløren er PILARs siste sikkerhetskontroll. Vurderingen viser AI-pipelinens tiltro til at de to uavhengige konstruktørene er enige — det er ikke faglig godkjenning. En kvalifisert fagperson må kontrollere resultatet.",
    verdictSub: "AI-vurdering · foreløpig",
    risk: "Risiko",
    caveatLead: "Foreløpig.",
    caveatBody:
      "Denne vurderingen er AI-pipelinens tiltro, ikke faglig godkjenning. En kvalifisert fagperson må kontrollere resultatet før bruk i prosjektering.",
    engNote: "Faglig merknad",
    method: "Metode",
    assumptions: "Antakelser og advarsler",
    show: "Vis",
    hide: "Skjul",
    blockedHd: "Blokkerte utdata",
    manualReview: "Manuell kontroll kreves",
    selfLabel: "Selvkontroll",
    selfNone: "Ingen inkonsistenser funnet.",
    selfFound: "{n} inkonsistenser funnet.",
    readAssess: "Les hele vurderingen",
    hideAssess: "Skjul vurderingen",
  },
  nn: {
    eyebrow: "Kontrollør — endeleg avgjerd",
    popover:
      "Kontrolløren er PILAR sin siste tryggleikskontroll. Vurderinga viser AI-pipelinen si tiltru til at dei to uavhengige konstruktørane er einige — det er ikkje fagleg godkjenning. Ein kvalifisert fagperson må kontrollere resultatet.",
    verdictSub: "AI-vurdering · førebels",
    risk: "Risiko",
    caveatLead: "Førebels.",
    caveatBody:
      "Denne vurderinga er AI-pipelinen si tiltru, ikkje fagleg godkjenning. Ein kvalifisert fagperson må kontrollere resultatet før bruk i prosjektering.",
    engNote: "Fagleg merknad",
    method: "Metode",
    assumptions: "Føresetnader og åtvaringar",
    show: "Vis",
    hide: "Skjul",
    blockedHd: "Blokkerte utdata",
    manualReview: "Manuell kontroll krevst",
    selfLabel: "Sjølvkontroll",
    selfNone: "Ingen inkonsistensar funne.",
    selfFound: "{n} inkonsistensar funne.",
    readAssess: "Les heile vurderinga",
    hideAssess: "Skjul vurderinga",
  },
  en: {
    eyebrow: "Controller — final decision",
    popover:
      "The Controller is PILAR's final safety check. Its verdict reflects the AI pipeline's confidence that the two independent engineers agree — it is not professional approval. A qualified engineer must verify the result.",
    verdictSub: "AI-pipeline verdict · preliminary",
    risk: "Risk",
    caveatLead: "Preliminary.",
    caveatBody:
      "This verdict is the AI pipeline's confidence, not professional sign-off. A qualified engineer must verify the result before use in design.",
    engNote: "Engineering note",
    method: "Method",
    assumptions: "Assumptions & warnings",
    show: "Show",
    hide: "Hide",
    blockedHd: "Blocked outputs",
    manualReview: "Manual review required",
    selfLabel: "Self-check",
    selfNone: "No inconsistencies found.",
    selfFound: "{n} inconsistencies found.",
    readAssess: "Read the full Controller assessment",
    hideAssess: "Hide assessment",
  },
};

/** JS-målt pixel-height disclosure (portabel; ingen grid 0fr→1fr). */
function Collapse({
  open,
  reduce,
  children,
}: {
  open: boolean;
  reduce: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (first.current || reduce) {
      first.current = false;
      el.style.height = open ? "auto" : "0px";
      el.style.opacity = open ? "1" : "0";
      return;
    }
    if (open) {
      el.style.opacity = "1";
      el.style.height = `${el.scrollHeight}px`;
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName === "height") {
          el.style.height = "auto";
          el.removeEventListener("transitionend", onEnd);
        }
      };
      el.addEventListener("transitionend", onEnd);
      return () => el.removeEventListener("transitionend", onEnd);
    }
    el.style.height = `${el.scrollHeight}px`;
    void el.offsetWidth;
    el.style.height = "0px";
    el.style.opacity = "0";
  }, [open, reduce]);

  return (
    <div className="cd-collapse" ref={ref}>
      {children}
    </div>
  );
}

function InfoButton({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <button
      ref={ref}
      type="button"
      className="cd__info"
      aria-expanded={open}
      aria-label="About the Controller"
      onClick={(e) => {
        e.stopPropagation();
        setOpen((v) => !v);
      }}
    >
      i
      <span className="cd__pop" role="tooltip">
        {text}
      </span>
    </button>
  );
}

function ConfidenceChip({
  who,
  levelLabel,
  tone,
  note,
  reduce,
}: {
  who: string;
  levelLabel: string;
  tone: Tone;
  note: string;
  reduce: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasNote = !!note.trim();
  return (
    <div className="conf-unit">
      <button
        type="button"
        className="conf-chip"
        data-tone={tone}
        aria-expanded={hasNote ? open : undefined}
        disabled={!hasNote}
        onClick={() => hasNote && setOpen((v) => !v)}
      >
        <span className="conf-chip__who">{who} ·</span>
        <span className="conf-chip__lvl">{levelLabel}</span>
        {hasNote && <span className="conf-chip__chev" aria-hidden="true" />}
      </button>
      {hasNote && (
        <Collapse open={open} reduce={reduce}>
          <div className="conf-note">{note}</div>
        </Collapse>
      )}
    </div>
  );
}

function EvidenceRow({ chip, reduce }: { chip: KontrollorChip; reduce: boolean }) {
  const [open, setOpen] = useState(false);
  const tone = chip.tone;
  const mark = chip.prefix ?? (tone === "info" ? "+" : "⚠");
  const hasBody = !!chip.body && chip.body.trim() !== chip.text.trim();
  return (
    <div className={`cd-row${open ? " is-open" : ""}`} data-tone={tone}>
      <button
        type="button"
        className="cd-row__btn"
        aria-expanded={hasBody ? open : undefined}
        disabled={!hasBody}
        onClick={() => hasBody && setOpen((v) => !v)}
      >
        <span className="cd-row__mark" aria-hidden="true">
          {mark}
        </span>
        <span className="cd-row__text">{chip.text}</span>
        {hasBody ? <span className="cd-row__chev" aria-hidden="true" /> : <span aria-hidden="true" />}
      </button>
      {hasBody && (
        <Collapse open={open} reduce={reduce}>
          <div className="cd-row__panel">
            <p>{chip.body}</p>
          </div>
        </Collapse>
      )}
    </div>
  );
}

export function ControllerDecisionCard({
  controllerDecision,
  comparison,
  calculationA,
  calculationB,
  locale,
  engineeringContext = null,
}: {
  controllerDecision: ControllerDecision;
  comparison: ComparisonResult | null;
  calculationA: CalculationResult;
  calculationB: CalculationResult | null;
  locale: Locale;
  engineeringContext?: EngineeringContext | null;
}) {
  const [reduce, setReduce] = useState(false);
  const [assumptionsCollapsed, setAssumptionsCollapsed] = useState(true);
  const [assessOpen, setAssessOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const displayLanguage = displayLanguageForContext(locale, engineeringContext);
  const isEn = displayLanguage === "en";
  const L = CD_LABELS[displayLanguage];

  const polishControlledVocab = (s: string): string =>
    s
      .replace(/\bKlasse (\d)\b/g, "Class $1")
      .replace(/\bKlasse (I|II|III|IV)\b/g, "Class $1")
      .replace(/\btverrsnittsklass(e)?\b/gi, "section class")
      .replace(/\bbruksgrense\b/gi, "serviceability limit")
      .replace(/\bbruddgrense\b/gi, "ultimate limit")
      .replace(/\beigenvekt\b/gi, "self-weight")
      .replace(/\begenvekt\b/gi, "self-weight");

  const uiText = (value: string | null | undefined): string =>
    isEn
      ? polishControlledVocab(sanitizeAiscGuardedOutputText(String(value ?? "")))
      : polishNorwegianRoleText(String(value ?? ""), displayLanguage);

  const levelLabel = (level: string): string => {
    if (isEn) {
      const en: Record<string, string> = { low: "LOW", medium: "MEDIUM", high: "HIGH", critical: "CRITICAL" };
      return en[level] ?? level.toUpperCase();
    }
    const no: Record<string, string> = {
      low: "LAV",
      medium: "MIDDELS",
      high: displayLanguage === "nn" ? "HØG" : "HØY",
      critical: "KRITISK",
    };
    return no[level] ?? level;
  };

  const status = controllerDecision.decision_status;
  const risk = controllerDecision.risk_level;
  const verdictLabel = uiText(decisionStatusLabel(status, displayLanguage));

  const summary = comparison
    ? getVerdiktForMatchStatus(comparison.match_status, displayLanguage)
    : getFirstSentence(uiText(controllerDecision.user_message));
  const summaryText = uiText(summary);

  // Chips frå builder → uiText-polert → del på kind/tone.
  const chips: KontrollorChip[] = buildKontrollorChips(
    comparison,
    calculationA,
    calculationB,
    controllerDecision,
    displayLanguage,
  ).map((c) => ({
    ...c,
    text: uiText(c.text),
    body: c.body ? uiText(c.body) : c.body,
  }));

  const confChips = chips.filter((c) => c.kind === "confidence");
  const confUnits: { who: string; level: Level; note: string }[] = [];
  let ci = 0;
  if (calculationA?.confidence) {
    confUnits.push({ who: "A", level: calculationA.confidence, note: confChips[ci]?.body ?? "" });
    ci += 1;
  }
  if (calculationB?.confidence) {
    confUnits.push({ who: "B", level: calculationB.confidence, note: confChips[ci]?.body ?? "" });
  }
  const confTone = (lvl: Level): Tone => (lvl === "high" ? "ok" : lvl === "medium" ? "warn" : "bad");

  const methodRows = chips.filter((c) => c.kind !== "confidence" && c.tone === "info");
  const warnRows = chips.filter((c) => c.kind !== "confidence" && c.tone === "warn");

  // Self-check (kun reelle inkonsistensar — same predikat som agent-c).
  const issuesA = (comparison?.internal_consistency_issues?.agent_a ?? []).filter(isRealIssue);
  const issuesB = (comparison?.internal_consistency_issues?.agent_b ?? []).filter(isRealIssue);
  const totalIssues = issuesA.length + issuesB.length;
  const hasCritical = [...issuesA, ...issuesB].some(
    (i) => i.severity === "high" || i.severity === "critical",
  );
  const selfTone: Tone = totalIssues === 0 ? "ok" : hasCritical ? "bad" : "warn";
  const selfIcon = selfTone === "ok" ? "✓" : selfTone === "bad" ? "✕" : "⚠";
  const selfMsg = totalIssues === 0 ? L.selfNone : L.selfFound.replace("{n}", String(totalIssues));

  const blocked = controllerDecision.blocked_outputs ?? [];
  const manualReview = controllerDecision.manual_review_required;
  const showBlocked = status === "rejected" || manualReview;

  const fullMsg = uiText(controllerDecision.user_message);
  const showAssess = !!fullMsg && fullMsg.trim() !== summary.trim();
  const paras = fullMsg
    .split(/(?<=[.!?])\s+(?=[A-ZÆØÅ])/)
    .map((s) => s.trim())
    .filter(Boolean);

  const assumptionsCollapsible = warnRows.length > 4;
  const assumptionsOpen = assumptionsCollapsible ? !assumptionsCollapsed : true;

  return (
    <section className="cd" data-status={status} data-risk={risk} aria-live="polite">
      <div className="cd__edge" aria-hidden="true" />

      <div className="cd__head">
        <div className="cd__head-top">
          <span className="uk-eyebrow cd__eyebrow">
            {L.eyebrow}
            <InfoButton text={L.popover} />
          </span>
          <span className="cd-pill">
            <span className="cd-pill__dot" aria-hidden="true" />
            {verdictLabel}
          </span>
        </div>

        <div className="cd__verdict">
          <span className="cd__seal" aria-hidden="true">
            {SEAL[status] ?? "•"}
          </span>
          <div className="cd__verdict-main">
            <div className="cd__verdict-label">{verdictLabel}</div>
            <div className="cd__verdict-sub">{L.verdictSub}</div>
          </div>
          <div className="cd-risk" data-risk={risk}>
            <span className="cd-risk__lbl">{L.risk}</span>
            <span className="cd-risk__meter" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="cd-risk__val">{levelLabel(risk)}</span>
          </div>
        </div>

        <p className="cd__summary">{summaryText}</p>
      </div>

      {/* Ståande atterhald — synleg i KVAR variant, inkl. approved. */}
      <div className="cd-caveat" role="note">
        <span className="cd-caveat__mark" aria-hidden="true" />
        <p className="cd-caveat__txt">
          <b>{L.caveatLead}</b> {L.caveatBody}
        </p>
      </div>

      <div className="cd__body">
        {confUnits.length > 0 && (
          <div className="cd-group">
            <div className="cd-group__hd">
              <span className="cd-group__label">{L.engNote}</span>
              <span className="cd-group__rule" />
            </div>
            <div className="cd-conf">
              {confUnits.map((u) => (
                <ConfidenceChip
                  key={u.who}
                  who={u.who}
                  levelLabel={levelLabel(u.level)}
                  tone={confTone(u.level)}
                  note={u.note}
                  reduce={reduce}
                />
              ))}
            </div>
          </div>
        )}

        {methodRows.length > 0 && (
          <div className="cd-group">
            <div className="cd-group__hd">
              <span className="cd-group__label">{L.method}</span>
              <span className="cd-group__count">{methodRows.length}</span>
              <span className="cd-group__rule" />
            </div>
            <div className="cd-rows">
              {methodRows.map((c, i) => (
                <EvidenceRow key={`m-${i}`} chip={c} reduce={reduce} />
              ))}
            </div>
          </div>
        )}

        {warnRows.length > 0 && (
          <div
            className={`cd-group${assumptionsCollapsible ? " cd-group--collapsible" : ""}${
              assumptionsCollapsible && !assumptionsOpen ? " is-collapsed" : ""
            }`}
          >
            {assumptionsCollapsible ? (
              <button
                type="button"
                className="cd-group__hd"
                aria-expanded={assumptionsOpen}
                onClick={() => setAssumptionsCollapsed((v) => !v)}
              >
                <span className="cd-group__label">{L.assumptions}</span>
                <span className="cd-group__count">{warnRows.length}</span>
                <span className="cd-group__rule" />
                <span className="cd-group__hint">{assumptionsOpen ? L.hide : L.show}</span>
                <span className="cd-group__chev" aria-hidden="true" />
              </button>
            ) : (
              <div className="cd-group__hd">
                <span className="cd-group__label">{L.assumptions}</span>
                <span className="cd-group__count">{warnRows.length}</span>
                <span className="cd-group__rule" />
              </div>
            )}
            {assumptionsCollapsible ? (
              <Collapse open={assumptionsOpen} reduce={reduce}>
                <div className="cd-rows">
                  {warnRows.map((c, i) => (
                    <EvidenceRow key={`w-${i}`} chip={c} reduce={reduce} />
                  ))}
                </div>
              </Collapse>
            ) : (
              <div className="cd-rows">
                {warnRows.map((c, i) => (
                  <EvidenceRow key={`w-${i}`} chip={c} reduce={reduce} />
                ))}
              </div>
            )}
          </div>
        )}

        {showBlocked && (
          <div className="cd-blocked">
            <div className="cd-blocked__hd">
              <span className="cd-blocked__x" aria-hidden="true">
                ×
              </span>
              {L.blockedHd}
            </div>
            {blocked.length > 0 && (
              <ul className="cd-blocked__list">
                {blocked.map((b, i) => (
                  <li key={i}>
                    <span className="cd-blocked__x" aria-hidden="true">
                      ×
                    </span>
                    {uiText(b)}
                  </li>
                ))}
              </ul>
            )}
            {manualReview && (
              <p className="cd-blocked__review">
                <b>{L.manualReview}</b>
              </p>
            )}
          </div>
        )}

        <div className="cd-selfcheck" data-tone={selfTone}>
          <span className="cd-selfcheck__icon" aria-hidden="true">
            {selfIcon}
          </span>
          <span>
            <b>{L.selfLabel}:</b> {selfMsg}
          </span>
        </div>

        {showAssess && (
          <div className="cd-assess" data-open={assessOpen}>
            <button
              type="button"
              className="cd-assess__btn"
              aria-expanded={assessOpen}
              onClick={() => setAssessOpen((v) => !v)}
            >
              <span className="cd-assess__chev" aria-hidden="true" />
              <span className="cd-assess__lbl">{assessOpen ? L.hideAssess : L.readAssess}</span>
            </button>
            <Collapse open={assessOpen} reduce={reduce}>
              <div className="cd-assess__doc">
                {paras.map((s, i) => {
                  const m = s.match(
                    /^(Engineer [AB]s?|Both engineers?|Begge tilnærmingar?|Begge tilnærminger?|Resultatet|Beregningen|Berekninga)/,
                  );
                  return (
                    <p key={i}>
                      {m ? (
                        <>
                          <strong>{m[0]}</strong>
                          {s.slice(m[0].length)}
                        </>
                      ) : (
                        s
                      )}
                    </p>
                  );
                })}
              </div>
            </Collapse>
          </div>
        )}
      </div>
    </section>
  );
}
