import type { Locale } from "@/lib/locale";
import type { PilarDisplayLanguage } from "@/lib/international/display";

const LABELS: Record<PilarDisplayLanguage, { label: string; text: string }> = {
  nb: {
    label: "FORELØPIG",
    text: "Må kontrolleres av kvalifisert fagperson før bruk i prosjektering.",
  },
  nn: {
    label: "FØREBELS",
    text: "Må kontrollerast av kvalifisert fagperson før bruk i prosjektering.",
  },
  en: {
    label: "PRELIMINARY",
    text: "Must be checked by a qualified professional before use in design work.",
  },
};

type Props = {
  locale: Locale;
  displayLanguage?: PilarDisplayLanguage;
};

export function ForebelStripe({ locale, displayLanguage }: Props) {
  const language = displayLanguage ?? locale;
  const label = LABELS[language];

  return (
    <div className="rapport-forebel-stripe" role="note">
      <span className="rapport-forebel-stripe__label">{label.label}</span>
      <span className="rapport-forebel-stripe__text">{label.text}</span>
    </div>
  );
}
