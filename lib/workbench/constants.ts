/**
 * Konstantar for Workbench-fasen.
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 5.
 */

import type { Locale } from "@/lib/locale";
import type { Phase } from "./types";

// Fil-opplasting (chunk 2 dag 14-feature)
export const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB — Vercel Hobby body limit
export const ACCEPTED_FILE_TYPES =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Døme-prompts vist i workbench-fasen som hint
export const EXAMPLE_PROMPTS = [
  "Fritt opplagd stålbjelke, L = 5,0 m, q = 8,0 kN/m",
  "Lastkombinasjon for kontorbygg, G = 4,5 kN/m², Q = 3,0 kN/m²",
  "Armering i betongbjelke, MEd = 120 kNm, b = 250 mm, d = 450 mm",
];

// Header-tekstar (eyebrow + tittel + beskriving) per fase × locale
export const PHASE_HEADERS: Record<
  Locale,
  Record<Phase, { eyebrow: string; title: string; description: string }>
> = {
  nb: {
    workbench: {
      eyebrow: "NY BEREGNING",
      title: "Beskriv oppgaven",
      description:
        "Skriv inn forespørselen. Pilar leser og viser tolkningen her — du kan redigere og tolke på nytt før du starter beregningen.",
    },
    calculating: {
      eyebrow: "REGNER",
      title: "Engineerene jobber",
      description:
        "Dobbel-kontroll med to uavhengige engineers, sammenligning og kontrolløravgjørelse.",
    },
    calculation_result: {
      eyebrow: "STEG 3 AV 3 · RESULTAT",
      title: "Beregningsnotat",
      description:
        "Foreløpig resultat med agentkontroll. Må kontrolleres av fagperson før bruk.",
    },
  },
  nn: {
    workbench: {
      eyebrow: "NY BEREKNING",
      title: "Beskriv oppgåva",
      description:
        "Skriv inn forespørselen. Pilar les og viser tolkinga her — du kan redigere og tolke på nytt før du startar berekninga.",
    },
    calculating: {
      eyebrow: "REKNAR",
      title: "Engineerane jobbar",
      description:
        "Dobbel-kontroll med to uavhengige engineers, samanlikning og kontrolløravgjerd.",
    },
    calculation_result: {
      eyebrow: "STEG 3 AV 3 · RESULTAT",
      title: "Berekningsnotat",
      description:
        "Førebels resultat med agentkontroll. Må kontrollerast av fagperson før bruk.",
    },
  },
};