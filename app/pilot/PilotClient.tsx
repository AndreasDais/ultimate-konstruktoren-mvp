"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useLocale } from "@/lib/locale-context";
import { PILOT_EXAMPLES } from "@/lib/pilot/examples";
import type { PilotExample, PilotLocale } from "@/lib/pilot/types";
import {
  ENGINEERING_CONTEXT_STORAGE_KEY,
  STANDARD_OPTIONS,
  type EngineeringStandardFamily,
} from "@/lib/engineering-context";
import type { HeaderUiMode } from "../components/Header";
import "./pilot.css";

type LangKey = "nb" | "nn" | "en";
type Diff = "easy" | "medium" | "hard";

type Copy = {
  eyebrow: string;
  title: string;
  lead: string;
  startOwn: string;
  or: string;
  mine: string;
  galleryTitle: string;
  legendLabel: string;
  diff: Record<Diff, string>;
  profileLabel: string;
  show: string;
  hide: string;
  sheetLabel: string;
  copy: string;
  copied: string;
  emptyTitle: string;
  emptyBody: string;
  honestyLabel: string;
  honestyTitle: string;
  honestyBody: string;
  terms: string;
  termsHref: string;
};

const COPY: Record<LangKey, Copy> = {
  nb: {
    eyebrow: "PILAR · Pilot",
    title: "Test PILAR med ferdige oppgaver",
    lead:
      "Målet med piloten er å se om PILAR kan hjelpe byggingeniørstudenter med å tolke, beregne, kontrollere og dokumentere konstruksjonsoppgaver raskere og ryddigere.",
    startOwn: "Start med egen oppgave",
    or: "eller",
    mine: "Mine rapporter",
    galleryTitle: "Ferdige oppgaver",
    legendLabel: "Vanskegrad",
    diff: { easy: "Lett", medium: "Middels", hard: "Vanskelig" },
    profileLabel: "Standardprofil",
    show: "Vis eksempelinput",
    hide: "Skjul eksempelinput",
    sheetLabel: "Eksempelinput · lim inn i PILAR",
    copy: "Kopier",
    copied: "Kopiert",
    emptyTitle: "Ingen eksempel for denne profilen enda",
    emptyBody:
      "Vi jobber med eksempeloppgaver for denne profilen. Du kan starte med en egen oppgave i mellomtiden.",
    honestyLabel: "Pilotmerknad",
    honestyTitle: "Viktig for pilot",
    honestyBody:
      "PILAR er et AI-generert lærings- og dokumentasjonsverktøy. Resultat skal alltid kontrolleres av kvalifisert fagperson før bruk i prosjektering.",
    terms: "Vilkår for bruk →",
    termsHref: "/vilkar",
  },
  nn: {
    eyebrow: "PILAR · Pilot",
    title: "Test PILAR med ferdige oppgåver",
    lead:
      "Målet med piloten er å sjå om PILAR kan hjelpe byggingeniørstudentar med å tolke, berekne, kontrollere og dokumentere konstruksjonsoppgåver raskare og ryddigare.",
    startOwn: "Start med eiga oppgåve",
    or: "eller",
    mine: "Mine rapportar",
    galleryTitle: "Ferdige oppgåver",
    legendLabel: "Vanskegrad",
    diff: { easy: "Lett", medium: "Middels", hard: "Vanskeleg" },
    profileLabel: "Standardprofil",
    show: "Vis eksempelinput",
    hide: "Skjul eksempelinput",
    sheetLabel: "Eksempelinput · lim inn i PILAR",
    copy: "Kopier",
    copied: "Kopiert",
    emptyTitle: "Ingen eksempel for denne profilen enda",
    emptyBody:
      "Vi jobbar med eksempeloppgåver for denne profilen. Du kan starte med ei eiga oppgåve i mellomtida.",
    honestyLabel: "Pilotmerknad",
    honestyTitle: "Viktig for pilot",
    honestyBody:
      "PILAR er eit AI-generert lærings- og dokumentasjonsverktøy. Resultat skal alltid kontrollerast av kvalifisert fagperson før bruk i prosjektering.",
    terms: "Vilkår for bruk →",
    termsHref: "/vilkar",
  },
  en: {
    eyebrow: "PILAR · Pilot",
    title: "Try PILAR with ready-made tasks",
    lead:
      "The pilot's goal is to see whether PILAR can help structural engineering students interpret, calculate, check and document design tasks faster and more clearly.",
    startOwn: "Start with your own task",
    or: "or",
    mine: "My reports",
    galleryTitle: "Ready-made tasks",
    legendLabel: "Difficulty",
    diff: { easy: "Easy", medium: "Medium", hard: "Hard" },
    profileLabel: "Standard profile",
    show: "Show example input",
    hide: "Hide example input",
    sheetLabel: "Example input · paste into PILAR",
    copy: "Copy",
    copied: "Copied",
    emptyTitle: "No example tasks for this profile yet",
    emptyBody:
      "We are still authoring example tasks for this engineering standard. You can start with your own task in the meantime.",
    honestyLabel: "Pilot notice",
    honestyTitle: "Important for the pilot",
    honestyBody:
      "PILAR is an AI-generated learning and documentation tool. Results must always be verified by a qualified engineer before use in real design work.",
    terms: "Terms of use →",
    termsHref: "/terms",
  },
};

// Per-eksempel fallback-kjede: aktivt språk → en → nb → nn.
function pickText(
  field: Partial<Record<PilotLocale, string>> | undefined,
  lang: LangKey,
): string {
  if (!field) return "";
  return field[lang] ?? field.en ?? field.nb ?? field.nn ?? "";
}

function countLabel(n: number, lang: LangKey): string {
  if (lang === "en") return `${n} ${n === 1 ? "task" : "tasks"}`;
  if (lang === "nn") return `${n} ${n === 1 ? "oppgåve" : "oppgåver"}`;
  return `${n} ${n === 1 ? "oppgave" : "oppgaver"}`;
}

// Trufast problem-ark: behald råteksten; berre attkjende section-heads (korte
// linjer som sluttar med ":") og leiande steg-nummer ("1. ") blir framheva.
function formatLine(line: string): ReactNode {
  if (line.length <= 60 && /^[A-Za-z][A-Za-z0-9 ,()/+_'.-]*:\s*$/.test(line)) {
    return <span className="sheet-h">{line}</span>;
  }
  const m = line.match(/^(\d+\.)(\s.*)$/);
  if (m) {
    return (
      <>
        <span className="sheet-n">{m[1]}</span>
        {m[2]}
      </>
    );
  }
  return line;
}

function renderSheet(raw: string): ReactNode {
  const lines = raw.split("\n");
  return lines.map((line, i) => (
    <span key={i}>
      {formatLine(line)}
      {i < lines.length - 1 ? "\n" : ""}
    </span>
  ));
}

function TaskCard({
  example,
  index,
  langKey,
  t,
  reduce,
}: {
  example: PilotExample;
  index: number;
  langKey: LangKey;
  t: Copy;
  reduce: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const diff = example.difficulty as Diff;
  const std = example.tags.slice(0, 2).join(" · ");
  const title = pickText(example.title, langKey);
  const desc = pickText(example.description, langKey);
  const prompt = pickText(example.prompt, langKey);

  function toggle() {
    const wrap = wrapRef.current;
    const next = !open;
    setOpen(next);
    if (!wrap) return;
    if (next) {
      wrap.style.opacity = "1";
      wrap.style.marginTop = "16px";
      if (reduce) {
        wrap.style.height = "auto";
        return;
      }
      wrap.style.height = `${wrap.scrollHeight}px`;
      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName === "height") {
          wrap.style.height = "auto";
          wrap.removeEventListener("transitionend", onEnd);
        }
      };
      wrap.addEventListener("transitionend", onEnd);
    } else {
      wrap.style.opacity = "0";
      wrap.style.marginTop = "0";
      if (reduce) {
        wrap.style.height = "0px";
        return;
      }
      // frå auto → målt px → reflow → 0, så transisjonen har ein startverdi
      wrap.style.height = `${wrap.scrollHeight}px`;
      void wrap.offsetWidth;
      wrap.style.height = "0px";
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      // Clipboard kan vere utilgjengeleg (usikker kontekst) — ikkje krasj.
    }
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className="task-card reveal" data-diff={diff} style={{ ["--i"]: index } as CSSProperties}>
      <div className="task-card__top">
        <span className="task-diff">
          <span className="diff-rungs" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="diff-label">{t.diff[diff]}</span>
        </span>
        <span className="task-card__std">{std}</span>
      </div>
      <h3 className="task-card__title">{title}</h3>
      <p className="task-card__desc">{desc}</p>
      <div className={`task-disclosure${open ? " open" : ""}`}>
        <button
          type="button"
          className="task-disclosure__trigger"
          aria-expanded={open}
          onClick={toggle}
        >
          <span className="chev" aria-hidden="true" />
          <span className="trig-label">{open ? t.hide : t.show}</span>
        </button>
        <div className="task-sheet-wrap" ref={wrapRef}>
          <div className="task-sheet">
            <div className="task-sheet__hd">
              <span className="task-sheet__label">{t.sheetLabel}</span>
              <button
                type="button"
                className={`task-sheet__copy${copied ? " is-copied" : ""}`}
                onClick={copyPrompt}
              >
                <span className="copy-label">{copied ? t.copied : t.copy}</span>
              </button>
            </div>
            <pre className="task-sheet__body">{renderSheet(prompt)}</pre>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function PilotClient({ uiMode }: { uiMode: HeaderUiMode }) {
  const { locale } = useLocale();
  const langKey: LangKey = uiMode === "intl" ? "en" : locale;
  const t = COPY[langKey];

  // Standardprofil: norske brukarar → Eurocode-Norge; intl → Eurocode general.
  // Overstyrast frå lagra engineering-context (/international) etter mount.
  const [profile, setProfile] = useState<EngineeringStandardFamily>(
    uiMode === "no" ? "eurocode_norway" : "eurocode_general",
  );
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onMq = (e: MediaQueryListEvent) => setReduce(e.matches);
    mq.addEventListener("change", onMq);

    try {
      const raw = window.localStorage.getItem(ENGINEERING_CONTEXT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { standards?: { family?: string } };
        const fam = parsed?.standards?.family;
        if (fam && STANDARD_OPTIONS.some((o) => o.value === fam)) {
          setProfile(fam as EngineeringStandardFamily);
        }
      }
    } catch {
      // ignorer korrupt localStorage — held trygg default
    }

    return () => mq.removeEventListener("change", onMq);
  }, []);

  const filtered = PILOT_EXAMPLES.filter((e) => e.profiles.includes(profile));

  // Scroll-reveal (gata bak .js-anim). Re-køyr ved profil/lang-byte slik at
  // nye kort (remounta via key på grid) blir observert + staggar inn på nytt.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".pilot");
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));
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
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
    );
    els.forEach((el) => {
      if (!el.classList.contains("in")) io.observe(el);
    });
    // Safety-net: avslør alt som alt er i syne om observeren aldri fyrer.
    const safety = window.setTimeout(() => {
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("in");
      });
    }, 1200);
    return () => {
      io.disconnect();
      window.clearTimeout(safety);
    };
  }, [reduce, profile, langKey]);

  return (
    <main className="pilot">
      <div className="pilot__wrap">
        {/* HERO */}
        <section className="pilot-hero reveal">
          <span className="uk-eyebrow pilot-hero__eyebrow">{t.eyebrow}</span>
          <h1 className="pilot-hero__title">{t.title}</h1>
          <p className="pilot-hero__lead">{t.lead}</p>
          <div className="pilot-hero__cta">
            <Link href="/" className="uk-btn uk-btn--primary pilot-hero__btn">
              {t.startOwn}{" "}
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <span className="pilot-hero__sep">{t.or}</span>
            <Link href="/mine" className="uk-btn pilot-hero__btn">
              {t.mine}
            </Link>
          </div>
        </section>

        {/* GALLERY */}
        <section className="pilot-gallery" aria-label={t.galleryTitle}>
          <div className="gallery-bar reveal">
            <div className="gallery-bar__l">
              <h2 className="gallery-title">{t.galleryTitle}</h2>
              <span className="gallery-count">{countLabel(filtered.length, langKey)}</span>
            </div>
            <div className="gallery-bar__r">
              <div className="legend" aria-hidden="true">
                <span className="legend__lbl">{t.legendLabel}</span>
                {(["easy", "medium", "hard"] as const).map((d) => (
                  <span className="legend__item" data-diff={d} key={d}>
                    <span className="diff-rungs">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="diff-label">{t.diff[d]}</span>
                  </span>
                ))}
              </div>
              <label className="gallery-profile">
                <span className="gallery-profile__lbl">{t.profileLabel}</span>
                <select
                  className="pilot-select"
                  value={profile}
                  onChange={(e) => setProfile(e.target.value as EngineeringStandardFamily)}
                >
                  {STANDARD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="task-grid" key={profile}>
              {filtered.map((example, i) => (
                <TaskCard
                  key={example.id}
                  example={example}
                  index={i}
                  langKey={langKey}
                  t={t}
                  reduce={reduce}
                />
              ))}
            </div>
          ) : (
            <div className="pilot-empty reveal">
              <span className="pilot-empty__icon" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </span>
              <h3 className="pilot-empty__title">{t.emptyTitle}</h3>
              <p className="pilot-empty__body">{t.emptyBody}</p>
              <Link href="/" className="uk-btn uk-btn--primary pilot-hero__btn">
                {t.startOwn}{" "}
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          )}
        </section>

        {/* HONESTY NOTE — tillitsfunksjon, prominent */}
        <section className="pilot-honesty reveal">
          <div className="uk-disclaimer pilot-disclaimer">
            <div className="pilot-disclaimer__stripe" aria-hidden="true" />
            <div>
              <div className="pilot-disclaimer__label">{t.honestyLabel}</div>
              <h2 className="pilot-disclaimer__title">{t.honestyTitle}</h2>
              <p className="pilot-disclaimer__body">{t.honestyBody}</p>
            </div>
          </div>
        </section>

        <div className="pilot-foot">
          <Link href={t.termsHref}>{t.terms}</Link>
        </div>
      </div>
    </main>
  );
}
