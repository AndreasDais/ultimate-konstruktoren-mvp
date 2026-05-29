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
    if (reduce || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reduce]);

  // Puls bru + ctx-kort på kvar endring; badge-puls berre når support-nivået skiftar.
  useEffect(() => {
    if (tick === 0 || reduce) {
      prevLevel.current = level;
      return;
    }
    pulse(bridgeRef.current, "flow");
    pulse(ctxRef.current, "pulse");
    if (prevLevel.current !== level) pulse(badgeRef.current, "pulse");
    prevLevel.current = level;
  }, [tick, level, reduce]);

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

  return (
    <main className="intl">
      <div className="intl__wrap">
        {/* HERO */}
        <section className="intl-hero reveal">
          <span className="uk-eyebrow intl-hero__eyebrow">International pilot</span>
          <h1 className="intl-hero__title">Set region and engineering standard</h1>
          <p className="intl-hero__lead">{LEAD}</p>
          <Link href="/pilot" className="uk-btn uk-btn--primary intl-hero__cta">
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
          <section className="intl-panel intl-ctx reveal" ref={ctxRef} aria-live="polite">
            <div className="intl-panel__hd">
              <div className="intl-panel__hd-l">
                <span className="live-dot" aria-hidden="true" />
                <span className="intl-panel__title">Engineering context</span>
              </div>
              <span className="intl-panel__step">what the engine receives</span>
            </div>
            <div className="intl-panel__bd intl-ctx__bd">
              <span className="intl-badge" data-level={level} ref={badgeRef}>
                <span className="intl-badge__dot" aria-hidden="true" />
                Support level:{" "}
                <span key={`lvl-${level}`} className={anim("swap").trim()}>
                  {level.replace(/_/g, " ")}
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
                <p key={`adapt-${level}`} className={`intl-limit__adapt${anim("swap")}`}>
                  {adapt}
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
              <Link href="/pilot" className="uk-btn intl-fb__link">
                Open pilot feedback flow{" "}
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </section>
        </div>

        <div className="intl-foot">
          <Link href="/terms">Terms of use →</Link>
        </div>
      </div>
    </main>
  );
}
