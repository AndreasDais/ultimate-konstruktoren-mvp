/**
 * ForebelStripe — DNA-element som signaliserer at rapporten er førebels.
 *
 * Mono "FØREBELS"-label + sans-tekst "Må kontrollerast av fagperson...".
 * Skal sjå identisk ut overalt (designer-tilråding: "DNA-element som
 * koplar rapporten til Pilar-merket og må alltid stå sterkt").
 *
 * Brukast over signatur-blokken i § 04 Kontroll. Frå Retning B/C-designa.
 */

import type { Locale } from "@/lib/locale";

const LABELS = {
  label: { nb: "FORELØPIG", nn: "FØREBELS" },
  text: {
    nb: "Må kontrolleres av fagperson før bruk i prosjektering.",
    nn: "Må kontrollerast av fagperson før bruk i prosjektering.",
  },
};

type Props = {
  locale: Locale;
};

export function ForebelStripe({ locale }: Props) {
  return (
    <div className="rapport-forebel-stripe" role="note">
      <span className="rapport-forebel-stripe__label">{LABELS.label[locale]}</span>
      <span className="rapport-forebel-stripe__text">{LABELS.text[locale]}</span>
    </div>
  );
}