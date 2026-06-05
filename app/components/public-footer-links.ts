// Centralized public-launch footer link definitions with locale variants.
// English content pages are the canonical routes; the Norwegian footer links to
// the same routes with Norwegian labels (Terms -> /vilkar). Dedicated Norwegian
// content pages beyond /vilkar are future work.
export type FooterLink = { href: string; label: string };

export const EN_FOOTER_LINKS: FooterLink[] = [
  { href: "/about", label: "About" },
  { href: "/guide", label: "Guide" },
  { href: "/safety", label: "Safety" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/contact", label: "Contact" },
];

export const NO_FOOTER_LINKS: FooterLink[] = [
  { href: "/about", label: "Om" },
  { href: "/guide", label: "Guide" },
  { href: "/safety", label: "Sikkerhet" },
  { href: "/roadmap", label: "Veikart" },
  { href: "/vilkar", label: "Vilkår" },
  { href: "/privacy", label: "Personvern" },
  { href: "/contact", label: "Kontakt" },
];

export const FOOTER_NOTE: { en: string; no: string } = {
  en:
    "PILAR is an AI-generated assistant in pilot. Results are preliminary and " +
    "must be reviewed by a qualified engineer before use in real projects.",
  no:
    "PILAR er en AI-generert assistent i pilot. Resultatene er foreløpige og " +
    "må kontrolleres av kvalifisert fagperson før bruk i reelle prosjekter.",
};
