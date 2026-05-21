/**
 * PageStripe — topp-stripe over rapport-forsida.
 *
 * Layout: "BEREKNINGSNOTAT · PILAR-XXX" venstre, dato høgre.
 * Stil: mono uppercase, muted, border-bottom som skil mot serif-tittel.
 *
 * Frå Retning B-designet. Page-numerering (SIDE N AV M) er ikkje
 * inkludert sidan rapporten er ein scrollende single-page på skjerm —
 * @page-numering blir lagt til av print-stylesheet i Fase 3.
 */

import type { Locale } from "@/lib/locale";

const LABELS = {
  berekningsnotat: { nb: "Beregningsnotat", nn: "Berekningsnotat" },
};

type Props = {
  documentId: string;
  date: string;
  locale: Locale;
};

export function PageStripe({ documentId, date, locale }: Props) {
  return (
    <div className="rapport-page-stripe" role="banner" aria-label="Rapport-identitet">
      <span className="rapport-page-stripe__left">
        <span>{LABELS.berekningsnotat[locale]}</span>
        <span className="rapport-page-stripe__sep" aria-hidden="true">·</span>
        <span>{documentId}</span>
      </span>
      <span className="rapport-page-stripe__right">
        <span>{date}</span>
      </span>
    </div>
  );
}