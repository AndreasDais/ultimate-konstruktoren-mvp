export type ReportSectionId =
  | "cover"
  | "summary"
  | "interpretation"
  | "key-results"
  | "calculation"
  | "assessment"
  | "limitations"
  | "warnings"
  | "control"
  | "conclusion"
  | "signature";

export type PageBreakPolicy = "always-before" | "avoid-inside" | "allow-break" | "keep-with-next";

export type ReportTemplateSection = {
  id: ReportSectionId;
  label: string;
  required: boolean;
  pagePolicy: PageBreakPolicy;
  printHint: string;
};

export const PILAR_REPORT_TEMPLATE: ReportTemplateSection[] = [
  {
    id: "cover",
    label: "Forside",
    required: true,
    pagePolicy: "always-before",
    printHint: "Side 1: metadata, nøkkelresultat, QR, kort disclaimer.",
  },
  {
    id: "summary",
    label: "Sammendrag",
    required: true,
    pagePolicy: "avoid-inside",
    printHint: "Kort oversikt over oppgåve, hovudresultat og viktigaste forbehold.",
  },
  {
    id: "interpretation",
    label: "Input og forutsetninger",
    required: false,
    pagePolicy: "allow-break",
    printHint: "Kan bryte over sider ved lang assumptionsliste.",
  },
  {
    id: "key-results",
    label: "Nøkkelresultat",
    required: false,
    pagePolicy: "avoid-inside",
    printHint: "Bruk kort/lister, ikkje brei tabell på forsida.",
  },
  {
    id: "calculation",
    label: "Stegvis beregning",
    required: false,
    pagePolicy: "allow-break",
    printHint: "Store steg kan bryte. Formelblokkar bør haldast samla.",
  },
  {
    id: "assessment",
    label: "Faglig vurdering",
    required: false,
    pagePolicy: "allow-break",
    printHint: "Vanleg tekstseksjon. Skal ikkje tvingast inn på éi side.",
  },
  {
    id: "limitations",
    label: "Hva er ikke beregnet",
    required: false,
    pagePolicy: "allow-break",
    printHint: "Punktliste eller kompakt kontrollmatrise.",
  },
  {
    id: "warnings",
    label: "Advarsler",
    required: false,
    pagePolicy: "avoid-inside",
    printHint: "Varselboks. Kort og tydeleg.",
  },
  {
    id: "control",
    label: "Kontroll",
    required: true,
    pagePolicy: "allow-break",
    printHint: "Controlleravgjerd, samanlikning og pipeline-status.",
  },
  {
    id: "conclusion",
    label: "Konklusjon",
    required: true,
    pagePolicy: "avoid-inside",
    printHint: "Praktisk sluttekst som speglar kontrollørstatus.",
  },
  {
    id: "signature",
    label: "Signatur",
    required: true,
    pagePolicy: "avoid-inside",
    printHint: "Skal ikkje splittast over sider.",
  },
];
