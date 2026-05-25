/**
 * PageStripe — top stripe above the report cover.
 */

import type { Locale } from "@/lib/locale";
import type { PilarDisplayLanguage } from "@/lib/international/display";

const LABELS: Record<PilarDisplayLanguage, string> = {
  nb: "Beregningsnotat",
  nn: "Berekningsnotat",
  en: "CALCULATION NOTE",
};

type Props = {
  documentId: string;
  date: string;
  locale: Locale;
  displayLanguage?: PilarDisplayLanguage;
};

export function PageStripe({ documentId, date, locale, displayLanguage }: Props) {
  const language = displayLanguage ?? locale;

  return (
    <div className="rapport-page-stripe" role="banner" aria-label="Report identity">
      <span className="rapport-page-stripe__left">
        <span>{LABELS[language]}</span>
        <span className="rapport-page-stripe__sep" aria-hidden="true">·</span>
        <span>{documentId}</span>
      </span>
      <span className="rapport-page-stripe__right">
        <span>{date}</span>
      </span>
    </div>
  );
}
