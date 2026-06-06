"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ENGINEERING_CONTEXT_STORAGE_KEY,
  REGION_LABELS,
  STANDARD_OPTIONS,
  buildEngineeringContext,
  getRecommendedStandardForRegion,
  getStandardOption,
  standardSupportNotice,
} from "@/lib/engineering-context";
import type {
  EngineeringRegionCode,
  EngineeringStandardFamily,
  StandardSupportLevel,
} from "@/lib/engineering-context";

const REGION_OPTIONS = Object.entries(REGION_LABELS) as [EngineeringRegionCode, string][];
const UI_MODE_COOKIE = "pilar-ui-mode";

const LEAD =
  "PILAR's international pilot uses English as the default interface language. The agents should answer in the same language as the user's prompt, while the engineering standard is selected separately.";

const BULLETS = [
  "Tell the agents which engineering standard / profile the user selected.",
  "Make the agents answer in the same language as the prompt.",
  "Prevent the agents from silently mixing Eurocode with other regional standards.",
  "Collect international pilot feedback on which standards should be prioritized first.",
];

function setUiModeCookie(mode: "no" | "intl") {
  // 1 år, server-readable for SSR av Header — same mønster som /pilot.
  document.cookie = `${UI_MODE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

function getUiModeCookie(): "no" | "intl" | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${UI_MODE_COOKIE}=`));
  if (!match) return null;
  const value = match.split("=")[1];
  return value === "intl" ? "intl" : value === "no" ? "no" : null;
}

function uiModeForRegion(region: EngineeringRegionCode): "no" | "intl" {
  return region === "NO" ? "no" : "intl";
}

// Re-trigg ein CSS-animasjon imperativt (fjern -> reflow -> legg på).
function pulse(el: HTMLElement | null, cls: string) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

export default function InternationalClient() {
  const router = useRouter();
  const [region, setRegion] = useState<EngineeringRegionCode>("OTHER");
  const [standard, setStandard] = useState<EngineeringStandardFamily>("unknown");
  const [saved, setSaved] = useState(false);
  const [autoSuggest, setAutoSuggest] = useState<string | null>(null);
  const [reduce, setReduce] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [tick, setTick] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [fbRegion, setFbRegion] = useState("");
  const [fbStandard, setFbStandard] = useState("");
  const [fbImprove, setFbImprove] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbMessage, setFbMessage] = useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );

  const ctxRef = useRef<HTMLElement>(null);
  const bridgeRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const prevLevel = useRef<StandardSupportLevel | null>(null);

  const option = getStandardOption(standard);
  const level = option.supportLevel;

  const context = useMemo(
    () =>
      buildEngineeringContext({
        language: "en",
        languagePolicy: { uiLocale: "en", outputMode: "same_as_prompt", fallbackLanguage: "en" },
        region: { countryCode: region, countryName: REGION_LABELS[region] },
        standards: {
          family: standard,
          label: option.label,
          supportLevel: option.supportLevel,
          confidence: "user_selected",
        },
        outputPreferences: { units: option.recommendedUnits, notationStyle: option.notationStyle },
      }),
    [region, standard, option],
  );

  const units = context.outputPreferences.units;
  const notation = context.outputPreferences.notationStyle;
  const adapt = standardSupportNotice(context);

  // UI-affordance: Eurocode-Norge er den mest implementerte pilot-profilen, so
  // badgen lyser grønt "supported". Dette er REINT UI — den lagra konteksten og
  // agent-prompten held fram med ekte supportLevel ("partial"), so motoren ikkje
  // slappar av på compliance-vakta. Grønt = "mest implementert", ikkje "verifisert".
  const isBestImplemented = standard === "eurocode_norway";
  const displayLevel: StandardSupportLevel = isBestImplemented ? "supported" : level;
  const adaptText = isBestImplemented
    ? "Marked supported only because this is the most implemented profile in the pilot — not a claim of full code compliance. Output is AI-generated and still requires professional review."
    : adapt;

  const animate = interacted && !reduce;
  const anim = (cls: string) => (animate ? ` ${cls}` : "");

  const applyUiMode = (mode: "no" | "intl") => {
    if (getUiModeCookie() === mode) return;
    setUiModeCookie(mode);
    router.refresh();
  };

  // Respekter prefers-reduced-motion (live).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Å besøke /international aktiverer intl-modus; hydrer evt. lagra val.
  useEffect(() => {
    applyUiMode("intl");
    try {
      const raw = window.localStorage.getItem(ENGINEERING_CONTEXT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ReturnType<typeof buildEngineeringContext>>;
      const cc = parsed.region?.countryCode;
      if (cc && cc in REGION_LABELS) {
        setRegion(cc as EngineeringRegionCode);
        applyUiMode(uiModeForRegion(cc as EngineeringRegionCode));
      }
      const fam = parsed.standards?.family;
      if (fam && STANDARD_OPTIONS.some((o) => o.value === fam)) {
        setStandard(fam as EngineeringStandardFamily);
      }
    } catch {
      // Ignorer korrupt localStorage, hald trygge intl-defaultar.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll-reveal.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".intl .reveal"));
    // Brua er ikkje .reveal (den teiknar si eiga linje), men vi observerer ho
    // for å trigge draw-on (§3.11a) + ein innleiande flyt-puls (#16).
    const bridge = bridgeRef.current;
    if (bridge) els.push(bridge);
    if (reduce || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    let pulseTimer: number | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
            if (e.target === bridge) {
              pulseTimer = window.setTimeout(() => {
                pulse(bridgeRef.current, "flow");
                pulse(ctxRef.current, "pulse");
              }, 760);
            }
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      if (pulseTimer) window.clearTimeout(pulseTimer);
    };
  }, [reduce]);

  // Puls bru + ctx-kort på kvar endring; badge-puls berre når support-nivået skiftar.
  useEffect(() => {
    if (tick === 0 || reduce) {
      prevLevel.current = displayLevel;
      return;
    }
    pulse(bridgeRef.current, "flow");
    pulse(ctxRef.current, "pulse");
    if (prevLevel.current !== displayLevel) pulse(badgeRef.current, "pulse");
    prevLevel.current = displayLevel;
  }, [tick, displayLevel, reduce]);

  function changeRegion(next: EngineeringRegionCode) {
    const rec = getRecommendedStandardForRegion(next);
    setRegion(next);
    if (rec !== standard) {
      setStandard(rec);
      setAutoSuggest(REGION_LABELS[next]);
    } else {
      setAutoSuggest(null);
    }
    setSaved(false);
    setInteracted(true);
    setTick((t) => t + 1);
    applyUiMode(uiModeForRegion(next));
  }

  function changeStandard(next: EngineeringStandardFamily) {
    setStandard(next);
    setAutoSuggest(null);
    setSaved(false);
    setInteracted(true);
    setTick((t) => t + 1);
  }

  async function save() {
    window.localStorage.setItem(ENGINEERING_CONTEXT_STORAGE_KEY, JSON.stringify(context));
    setSaved(true);
    if (!reduce) pulse(ctxRef.current, "pulse");
    try {
      await fetch("/api/engineering-context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context, source: "international_page" }),
      });
    } catch {
      // Lokal lagring er nok for MVP; server-logging er valfritt.
    }
  }

  async function submitFeedback() {
    if (fbSubmitting) return;
    setFbMessage(null);
    const regionText = fbRegion.trim();
    const standardText = fbStandard.trim();
    const improveText = fbImprove.trim();
    const emailText = fbEmail.trim();
    if (!regionText && !standardText && !improveText) {
      setFbMessage({
        kind: "error",
        text: "Add a region, standard, or improvement before submitting.",
      });
      return;
    }

    const lines = [
      regionText ? `Region/country: ${regionText}` : null,
      standardText ? `Standard/profile: ${standardText}` : null,
      improveText ? `What to implement/improve:\n${improveText}` : null,
      emailText ? `Contact: ${emailText}` : null,
    ].filter(Boolean);

    setFbSubmitting(true);
    try {
      const response = await fetch("/api/pilot/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rating: "partly",
          trustLevel: "not_sure",
          useCase: "international_support",
          comment: lines.join("\n\n"),
          wantsFollowup: Boolean(emailText),
          reportUrl: `${window.location.pathname}${window.location.search}`,
          source: "international_page",
          metadata: {
            region: regionText,
            standard: standardText,
            requested_improvement: improveText,
            followup_email: emailText,
            current_path: `${window.location.pathname}${window.location.search}`,
            ui_mode: "intl",
            locale: "en",
            selected_region: region,
            selected_standard: standard,
            support_level: option.supportLevel,
            page: "international",
          },
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setFbMessage({
          kind: "error",
          text: data?.error || "Could not save feedback. Try again in a moment.",
        });
        return;
      }

      setFbMessage({
        kind: "success",
        text: "Feedback saved. Thank you - the pilot team can review it in admin.",
      });
      setFbRegion("");
      setFbStandard("");
      setFbImprove("");
      setFbEmail("");
    } catch {
      setFbMessage({
        kind: "error",
        text: "Could not save feedback. Try again in a moment.",
      });
    } finally {
      setFbSubmitting(false);
    }
  }

  return (
    <main className="intl">
      <div className="intl__wrap">
        {/* HERO */}
        <section className="intl-hero reveal">
          <div className="intl-hero__text">
            <span className="uk-eyebrow intl-hero__eyebrow">International pilot</span>
            <h1 className="intl-hero__title">Set region and engineering standard</h1>
            <p className="intl-hero__lead">{LEAD}</p>
          </div>
          <Link href="/pilot" className="uk-btn uk-btn--primary intl-cta intl-hero__cta">
            Go to pilot{" "}
            <span className="arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </section>

        {/* CONFIGURE ⇄ LIVE PREVIEW */}
        <div className="intl-grid">
          {/* LEFT: form */}
          <section className="intl-panel reveal" aria-label="Engineering context configuration">
            <div className="intl-panel__hd">
              <div className="intl-panel__hd-l">
                <span className="intl-panel__title">Configure context</span>
              </div>
              <span className="intl-panel__step">01 · inputs</span>
            </div>
            <div className="intl-panel__bd">
              <div className="intl-note">
                <div className="intl-note__label">
                  <span className="intl-note__lock" aria-hidden="true" /> Agent language policy
                </div>
                <div className="intl-note__value">Same language as the user&apos;s prompt</div>
                <p className="intl-note__help">
                  If the prompt language is unclear or heavily mixed, PILAR should fall back to
                  English. Language never decides the engineering standard.
                </p>
              </div>

              <div className="intl-field">
                <label className="intl-field__label" htmlFor="intl-region">
                  Country / region
                </label>
                <select
                  id="intl-region"
                  className="intl-select"
                  value={region}
                  onChange={(e) => changeRegion(e.target.value as EngineeringRegionCode)}
                >
                  {REGION_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="intl-field">
                <label className="intl-field__label" htmlFor="intl-standard">
                  Standard profile
                </label>
                <select
                  id="intl-standard"
                  className="intl-select"
                  value={standard}
                  onChange={(e) => changeStandard(e.target.value as EngineeringStandardFamily)}
                >
                  {STANDARD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className={`intl-field__hint${autoSuggest ? " is-auto" : ""}`}>
                  {autoSuggest ? `Auto-suggested for ${autoSuggest}` : ""}
                </p>
              </div>

              <button
                type="button"
                className={`uk-btn uk-btn--primary intl-save${saved ? " is-saved" : ""}`}
                onClick={save}
              >
                <span className="intl-save__txt">
                  <svg
                    className="intl-save__check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span>{saved ? "Context saved" : "Save context"}</span>
                </span>
              </button>
            </div>
          </section>

          {/* CENTER: data-flow bridge */}
          <div className="intl-bridge" ref={bridgeRef} aria-hidden="true">
            <div className="intl-bridge__line">
              <span className="intl-bridge__src" />
              <span className="intl-bridge__pulse" />
              <span className="intl-bridge__chev" />
            </div>
            <span className="intl-bridge__label">Live</span>
          </div>

          {/* RIGHT: live engineering context */}
          <section className="intl-panel intl-ctx reveal assemble" ref={ctxRef} aria-live="polite">
            <div className="intl-panel__hd">
              <div className="intl-panel__hd-l">
                <span className="live-dot" aria-hidden="true" />
                <span className="intl-panel__title">Engineering context</span>
              </div>
              <span className="intl-panel__step">what the engine receives</span>
            </div>
            <div className="intl-panel__bd intl-ctx__bd">
              <span className="intl-badge" data-level={displayLevel} ref={badgeRef}>
                <span className="intl-badge__dot" aria-hidden="true" />
                Support level:{" "}
                <span key={`lvl-${displayLevel}`} className={anim("swap").trim()}>
                  {displayLevel.replace(/_/g, " ")}
                </span>
              </span>

              <h3 key={`name-${option.label}`} className={`intl-ctx__name${anim("swap")}`}>
                {option.label}
              </h3>
              <p key={`desc-${option.value}`} className={`intl-ctx__desc${anim("swap")}`}>
                {option.description}
              </p>

              <div className="intl-chips">
                <div className="intl-chip">
                  <div className="intl-chip__k">Units</div>
                  <div key={`u-${units}`} className={`intl-chip__v${anim("flip")}`}>
                    {units}
                  </div>
                </div>
                <div className="intl-chip">
                  <div className="intl-chip__k">Notation</div>
                  <div key={`n-${notation}`} className={`intl-chip__v${anim("flip")}`}>
                    {notation}
                  </div>
                </div>
              </div>

              <div className="intl-limit">
                <div className="intl-limit__label">Important pilot limitation</div>
                <p className="intl-limit__body">
                  PILAR currently supports Eurocode / Norway best. Other standard profiles are
                  experimental and must not be used as a verified design basis.
                </p>
                <p key={`adapt-${displayLevel}`} className={`intl-limit__adapt${anim("swap")}`}>
                  {adaptText}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* BELOW: uses + feedback */}
        <div className="intl-below">
          <section className="intl-panel intl-uses reveal">
            <div className="intl-panel__bd">
              <h2 className="intl-uses__title">This will later be used to</h2>
              <ul className="intl-uses__list">
                {BULLETS.map((b, i) => (
                  <li key={b}>
                    <span className="intl-uses__num">{String(i + 1).padStart(2, "0")}</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="intl-panel intl-fb reveal">
            <div className="intl-panel__bd">
              <h2 className="intl-fb__title">Wrong language or wrong standard?</h2>
              <p className="intl-fb__body">
                Report it as pilot feedback. The international mode is intentionally feedback-driven
                so language and regional-standard bugs can be corrected quickly.
              </p>
              <button
                type="button"
                className="uk-btn intl-fb__link"
                onClick={() => setFeedbackOpen(true)}
              >
                Open pilot feedback flow{" "}
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {feedbackOpen && (
        <div
          className="intl-modal-backdrop"
          role="presentation"
          onClick={() => setFeedbackOpen(false)}
        >
          <div
            className="intl-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intl-fb-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="intl-fb-modal-title" className="intl-modal__title">
              Help improve international support
            </h2>
            <p className="intl-modal__intro">
              Tell us which region, standard, or language support you need. This
              helps prioritize the pilot roadmap.
            </p>
            <label className="intl-modal__field">
              <span>Region / country</span>
              <input
                type="text"
                value={fbRegion}
                onChange={(event) => setFbRegion(event.target.value)}
                placeholder="e.g. United States, Germany"
              />
            </label>
            <label className="intl-modal__field">
              <span>Standard / profile</span>
              <input
                type="text"
                value={fbStandard}
                onChange={(event) => setFbStandard(event.target.value)}
                placeholder="e.g. AISC 360, DIN EN 1993"
              />
            </label>
            <label className="intl-modal__field">
              <span>What should PILAR implement or improve?</span>
              <textarea
                rows={4}
                value={fbImprove}
                onChange={(event) => setFbImprove(event.target.value)}
                placeholder="Describe the region, standard or language support you need."
              />
            </label>
            <label className="intl-modal__field">
              <span>Email (optional)</span>
              <input
                type="email"
                value={fbEmail}
                onChange={(event) => setFbEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            <p className="intl-modal__note">
              Feedback is saved for pilot review. PILAR output stays preliminary
              and requires review by a qualified engineer.
            </p>
            {fbMessage && (
              <p className={`intl-modal__status is-${fbMessage.kind}`} role="status">
                {fbMessage.text}
              </p>
            )}
            <div className="intl-modal__actions">
              <button
                type="button"
                className="uk-btn"
                onClick={() => setFeedbackOpen(false)}
                disabled={fbSubmitting}
              >
                {fbMessage?.kind === "success" ? "Close" : "Cancel"}
              </button>
              <button
                type="button"
                className="uk-btn uk-btn--primary"
                onClick={submitFeedback}
                disabled={
                  fbSubmitting ||
                  (!fbRegion.trim() && !fbStandard.trim() && !fbImprove.trim())
                }
              >
                {fbSubmitting ? "Sending..." : "Send feedback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
