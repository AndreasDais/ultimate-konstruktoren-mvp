"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import "./international.css";
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
} from "@/lib/engineering-context";

type Copy = {
  eyebrow: string;
  title: string;
  lead: string;
  languagePolicyLabel: string;
  languagePolicyValue: string;
  languagePolicyHelp: string;
  regionLabel: string;
  standardLabel: string;
  supportLabel: string;
  unitsLabel: string;
  notationLabel: string;
  warningTitle: string;
  warningBody: string;
  bugTitle: string;
  bugBody: string;
  save: string;
  saved: string;
  start: string;
  whatThisDoes: string;
  bullets: string[];
  termsLink: string;
};

const COPY: Copy = {
  eyebrow: "International pilot",
  title: "Set region and engineering standard",
  lead:
    "PILAR's international pilot uses English as the default interface language. The agents should answer in the same language as the user's prompt, while the engineering standard is selected separately.",
  languagePolicyLabel: "Agent language policy",
  languagePolicyValue: "Same language as the user's prompt",
  languagePolicyHelp:
    "If the prompt language is unclear or heavily mixed, PILAR should fall back to English. Language never decides the engineering standard.",
  regionLabel: "Country / region",
  standardLabel: "Standard profile",
  supportLabel: "Support level",
  unitsLabel: "Units",
  notationLabel: "Notation",
  warningTitle: "Important pilot limitation",
  warningBody:
    "PILAR currently supports Eurocode/Norway best. Other standard profiles are experimental and must not be used as verified design basis.",
  bugTitle: "Wrong language or wrong standard?",
  bugBody:
    "Report it as pilot feedback. The international mode is intentionally feedback-driven so language and regional-standard bugs can be corrected quickly.",
  save: "Save context",
  saved: "Context saved",
  start: "Go to pilot",
  whatThisDoes: "This will later be used to",
  bullets: [
    "tell the agents which engineering standard/profile the user selected",
    "make the agents answer in the same language as the prompt",
    "prevent the agents from silently mixing Eurocode with other regional standards",
    "collect international pilot feedback on which standards should be prioritized first",
  ],
  termsLink: "Terms of use →",
};

const REGION_OPTIONS = Object.entries(REGION_LABELS) as [EngineeringRegionCode, string][];

function supportTone(level: string) {
  if (level === "supported") return "ok";
  if (level === "partial") return "warn";
  if (level === "experimental") return "info";
  return "bad";
}

export default function InternationalPilotPage() {
  const [region, setRegion] = useState<EngineeringRegionCode>("OTHER");
  const [standard, setStandard] = useState<EngineeringStandardFamily>("unknown");
  const [saved, setSaved] = useState(false);

  const standardOption = getStandardOption(standard);
  const context = useMemo(
    () =>
      buildEngineeringContext({
        language: "en",
        languagePolicy: {
          uiLocale: "en",
          outputMode: "same_as_prompt",
          fallbackLanguage: "en",
        },
        region: { countryCode: region, countryName: REGION_LABELS[region] },
        standards: {
          family: standard,
          label: standardOption.label,
          supportLevel: standardOption.supportLevel,
          confidence: "user_selected",
        },
        outputPreferences: {
          units: standardOption.recommendedUnits,
          notationStyle: standardOption.notationStyle,
        },
      }),
    [region, standard, standardOption],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ENGINEERING_CONTEXT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ReturnType<typeof buildEngineeringContext>>;

      const countryCode = parsed.region?.countryCode;
      if (countryCode && countryCode in REGION_LABELS) {
        setRegion(countryCode as EngineeringRegionCode);
      }

      const family = parsed.standards?.family;
      if (family && STANDARD_OPTIONS.some((option) => option.value === family)) {
        setStandard(family as EngineeringStandardFamily);
      }
    } catch {
      // Ignore corrupt localStorage and keep safe international defaults.
    }
  }, []);

  function handleRegionChange(nextRegion: EngineeringRegionCode) {
    setRegion(nextRegion);
    setStandard(getRecommendedStandardForRegion(nextRegion));
    setSaved(false);
  }

  async function saveContext() {
    window.localStorage.setItem(ENGINEERING_CONTEXT_STORAGE_KEY, JSON.stringify(context));
    setSaved(true);

    try {
      await fetch("/api/engineering-context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context, source: "international_page" }),
      });
    } catch {
      // Local save is enough for MVP; server logging is optional.
    }
  }

  return (
    <main className="international-page">
      <section className="international-hero">
        <div>
          <p className="international-eyebrow">{COPY.eyebrow}</p>
          <h1>{COPY.title}</h1>
          <p className="international-lead">{COPY.lead}</p>
        </div>
        <div className="international-actions">
          <Link href="/pilot" className="international-button primary">
            {COPY.start}
          </Link>
        </div>
      </section>

      <section className="international-grid">
        <form className="international-card" onSubmit={(event) => event.preventDefault()}>
          <div className="policy-box">
            <span>{COPY.languagePolicyLabel}</span>
            <strong>{COPY.languagePolicyValue}</strong>
            <p>{COPY.languagePolicyHelp}</p>
          </div>

          <label>
            <span>{COPY.regionLabel}</span>
            <select value={region} onChange={(event) => handleRegionChange(event.target.value as EngineeringRegionCode)}>
              {REGION_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>{COPY.standardLabel}</span>
            <select value={standard} onChange={(event) => { setStandard(event.target.value as EngineeringStandardFamily); setSaved(false); }}>
              {STANDARD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <button className="international-button primary full" type="button" onClick={saveContext}>
            {saved ? COPY.saved : COPY.save}
          </button>
        </form>

        <aside className="international-card context-card">
          <div className={`support-badge ${supportTone(context.standards.supportLevel)}`}>
            {COPY.supportLabel}: {context.standards.supportLevel}
          </div>
          <h2>{context.standards.label}</h2>
          <p>{standardOption.description}</p>
          <dl>
            <div><dt>{COPY.unitsLabel}</dt><dd>{context.outputPreferences.units}</dd></div>
            <div><dt>{COPY.notationLabel}</dt><dd>{context.outputPreferences.notationStyle}</dd></div>
          </dl>
          <div className="international-warning">
            <strong>{COPY.warningTitle}</strong>
            <p>{COPY.warningBody}</p>
            <p>{standardSupportNotice(context)}</p>
          </div>
        </aside>
      </section>

      <section className="international-card wide">
        <h2>{COPY.whatThisDoes}</h2>
        <ul className="international-bullets">
          {COPY.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
      </section>

      <section className="international-card wide bug-card">
        <h2>{COPY.bugTitle}</h2>
        <p>{COPY.bugBody}</p>
        <Link href="/pilot" className="international-button subtle">
          Open pilot feedback flow
        </Link>
      </section>

      <div
        style={{
          marginTop: "3rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid var(--border)",
          textAlign: "center",
          fontSize: "0.875rem",
        }}
      >
        <Link
          href="/terms"
          style={{ color: "var(--fg-muted)", textDecoration: "none" }}
        >
          {COPY.termsLink}
        </Link>
      </div>
    </main>
  );
}
