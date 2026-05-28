"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/lib/locale-context";
import type { HeaderUiMode } from "./Header";

type Palette = "slate" | "stone" | "graphite";
type LangKey = "nb" | "nn" | "en";

const STORAGE_KEY = "pilar-theme";

const OPTIONS: Record<LangKey, { value: Palette; label: string; description: string }[]> = {
  nb: [
    { value: "slate", label: "Slate", description: "Lyst, kjølig" },
    { value: "stone", label: "Stone", description: "Lyst, varmt" },
    { value: "graphite", label: "Graphite", description: "Mørkt, teknisk" },
  ],
  nn: [
    { value: "slate", label: "Slate", description: "Lyst, kjøleg" },
    { value: "stone", label: "Stone", description: "Lyst, varmt" },
    { value: "graphite", label: "Graphite", description: "Mørkt, teknisk" },
  ],
  en: [
    { value: "slate", label: "Slate", description: "Light, cool" },
    { value: "stone", label: "Stone", description: "Light, warm" },
    { value: "graphite", label: "Graphite", description: "Dark, technical" },
  ],
};

const THEME_COPY: Record<LangKey, { trigger: string; aria: string }> = {
  nb: { trigger: "Tema", aria: "Velg tema" },
  nn: { trigger: "Tema", aria: "Vel tema" },
  en: { trigger: "Theme", aria: "Pick theme" },
};

type Props = {
  uiMode?: HeaderUiMode;
};

export default function ThemeToggle({ uiMode = "no" }: Props) {
  const { locale } = useLocale();
  const langKey: LangKey = uiMode === "intl" ? "en" : locale;
  const copy = THEME_COPY[langKey];
  const options = OPTIONS[langKey];

  const [palette, setPalette] = useState<Palette>(() => {
    if (typeof document === "undefined") return "slate";
    const current = document.documentElement.dataset.palette as Palette | undefined;
    return current === "slate" || current === "stone" || current === "graphite" ? current : "slate";
  });
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initial sync med <html data-palette>
  useEffect(() => {
    setMounted(true);
  }, []);

  // DOM/localStorage-sideeffektar ligg i effect, ikkje i event-handleren.
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    try {
      localStorage.setItem(STORAGE_KEY, palette);
    } catch {
      // localStorage kan vere blokkert (privacy-modus); ignorer
    }
  }, [palette]);

  const apply = (next: Palette) => {
    setPalette(next);
    setOpen(false);
  };

  const calcPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  };

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    calcPosition();
    setOpen(true);
    // Lukk andre popovers (gjenuse InfoPopover si event)
    window.dispatchEvent(new CustomEvent("info-popover-open"));
  };

  // Outside-click + ESC + scroll/resize reposition + lytt etter andre popovers
  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const handleOther = () => setOpen(false);
    const handleReposition = () => calcPosition();

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    window.addEventListener("info-popover-open", handleOther);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
      window.removeEventListener("info-popover-open", handleOther);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open]);

  // Hold plass i layout under hydration for å unngå hopp
  if (!mounted) {
    return (
      <div
        className="uk-theme-trigger"
        style={{ visibility: "hidden" }}
        aria-hidden="true"
      />
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="uk-theme-trigger"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={copy.aria}
        title={copy.aria}
      >
        <span
          className={`uk-theme-swatch uk-theme-swatch--${palette}`}
          aria-hidden="true"
        />
        <span className="uk-theme-trigger__label">{copy.trigger}</span>
        <span className="uk-theme-trigger__caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && position &&
        createPortal(
          <div
            ref={popoverRef}
            className="uk-theme-popover"
            role="listbox"
            aria-label={copy.trigger}
            style={{
              position: "fixed",
              top: `${position.top}px`,
              right: `${position.right}px`,
            }}
          >
            {options.map((opt) => {
              const isActive = palette === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`uk-theme-option ${
                    isActive ? "uk-theme-option--active" : ""
                  }`}
                  onClick={() => apply(opt.value)}
                >
                  <span
                    className={`uk-theme-option__swatch uk-theme-swatch--${opt.value}`}
                    aria-hidden="true"
                  />
                  <span className="uk-theme-option__text">
                    <span className="uk-theme-option__label">{opt.label}</span>
                    <span className="uk-theme-option__desc">
                      {opt.description}
                    </span>
                  </span>
                  {isActive && (
                    <span
                      className="uk-theme-option__check"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}