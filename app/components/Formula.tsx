"use client";

import { Component, ReactNode } from "react";
import katex from "katex";

type Props = {
  /** LaTeX-strengen som skal renderast (utan $...$ eller \[...\]-fences). */
  latex: string;
  /** Plain-text-versjon av same utleiing. Vert vist viss LaTeX feilar. */
  fallbackText: string;
};

/**
 * Inner-komponent som faktisk kallar katex.renderToString.
 * Try/catch fangar KaTeX sine parse-feil — typisk ved ugyldig syntaks
 * frå agenten. ErrorBoundary nedanfor er belt-and-suspenders for 
 * React-nivå-feil utanfor parsinga.
 */
function FormulaInner({ latex, fallbackText }: Props) {
  try {
    const html = katex.renderToString(latex, {
      displayMode: true,
      throwOnError: true,
      strict: "warn", // Ikkje krasj på ukjende kommandoar, berre logg
      output: "html",
    });
    return (
      // Ytre wrapper med overflow-x: auto er siste sikkerheitsnett mot
      // overflyt. FormulaStack pakkar opp aligned-formlar og splittar lange
      // utrekningar, men eit ENKELT segment kan framleis vere for breitt
      // (digert \frac, lang \sqrt e.l.). Då kan brukaren scrolle segmentet
      // horisontalt i staden for at det stikk ut av arket.
      <div className="rapport-formula-scroll">
        <div
          className="rapport-formula"
          // Trygt fordi katex sanitiserar output-en sin sjølv,
          // og kjelda (våre eigne agentar) er ikkje brukar-input.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  } catch (e) {
    console.error("KaTeX parse error:", e, { latex });
    return <pre className="rapport-step-text">{fallbackText}</pre>;
  }
}

/**
 * ErrorBoundary må vere class component — React har ikkje hook for
 * dette enno. Fangar React-nivå-feil under rendring (eks. inne i
 * katex sin DOM-output) og fell tilbake til fallback-tekst.
 */
class FormulaErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Formula render boundary caught:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export default function Formula({ latex, fallbackText }: Props) {
  return (
    <FormulaErrorBoundary
      fallback={<pre className="rapport-step-text">{fallbackText}</pre>}
    >
      <FormulaInner latex={latex} fallbackText={fallbackText} />
    </FormulaErrorBoundary>
  );
}