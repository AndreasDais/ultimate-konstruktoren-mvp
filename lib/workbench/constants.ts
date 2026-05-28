/**
 * Konstantar for Workbench-fasen.
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 5.
 */

import type { Locale } from "@/lib/locale";
import type { EngineeringStandardFamily } from "@/lib/engineering-context";
import type { Phase } from "./types";

// Fil-opplasting (chunk 2 dag 14-feature)
export const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB — Vercel Hobby body limit
export const ACCEPTED_FILE_TYPES =
  "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Norsk default (uendra). Brukt for nb/nn-modus uansett profil.
const EXAMPLE_PROMPTS_NORWEGIAN = [
  "Fritt opplagd stålbjelke, L = 5,0 m, q = 8,0 kN/m",
  "Lastkombinasjon for kontorbygg, G = 4,5 kN/m², Q = 3,0 kN/m²",
  "Armering i betongbjelke, MEd = 120 kNm, b = 250 mm, d = 450 mm",
];

// Engelske eksempel knytt til vald standard-profil.
// First-draft, treng SME-review (same som pilot-eksempla).
const EXAMPLE_PROMPTS_EN_BY_PROFILE: Record<EngineeringStandardFamily, string[]> = {
  eurocode_norway: EXAMPLE_PROMPTS_NORWEGIAN,
  eurocode_general: [
    "Simply-supported steel beam, L = 5.0 m, q = 8.0 kN/m",
    "Office load combination per EN 1990, Gk = 4.5 kN/m², Qk = 3.0 kN/m²",
    "Reinforcement in concrete beam, MEd = 120 kNm, b = 250 mm, d = 450 mm",
  ],
  eurocode_uk_na: [
    "Simply-supported steel beam (BS EN 1993), L = 5.0 m, q = 8.0 kN/m",
    "ULS combination per BS EN 1990 + UK NA, Gk = 4.5 kN/m², Qk = 3.0 kN/m²",
    "Reinforced concrete beam to BS EN 1992-1-1, MEd = 120 kNm, b = 250 mm, d = 450 mm",
  ],
  aisc_asce_aci: [
    "Simply-supported W12x26 beam, L = 20 ft, wu = 0.55 kip/ft",
    "ASCE 7 LRFD load combination, D = 0.40 kip/ft, L = 0.55 kip/ft",
    "AISC 360 column buckling, W8x31, Ly = 12 ft, Fy = 50 ksi",
  ],
  // Canada/Australia: fallback til eurocode_general inntil eigne eksempel er
  // forfatta og validert. unknown: same fallback.
  canada: [
    "Simply-supported steel beam, L = 5.0 m, q = 8.0 kN/m",
    "Office load combination per EN 1990, Gk = 4.5 kN/m², Qk = 3.0 kN/m²",
    "Reinforcement in concrete beam, MEd = 120 kNm, b = 250 mm, d = 450 mm",
  ],
  australia: [
    "Simply-supported steel beam, L = 5.0 m, q = 8.0 kN/m",
    "Office load combination per EN 1990, Gk = 4.5 kN/m², Qk = 3.0 kN/m²",
    "Reinforcement in concrete beam, MEd = 120 kNm, b = 250 mm, d = 450 mm",
  ],
  unknown: [
    "Simply-supported steel beam, L = 5.0 m, q = 8.0 kN/m",
    "Office load combination per EN 1990, Gk = 4.5 kN/m², Qk = 3.0 kN/m²",
    "Reinforcement in concrete beam, MEd = 120 kNm, b = 250 mm, d = 450 mm",
  ],
};

/**
 * Returner eksempel-prompts for input-feltet basert på språk og vald profil.
 * Norsk modus får alltid same tre norske eksempel. Engelsk modus får
 * profile-knytte eksempel; ukjent profil fell tilbake til eurocode_general.
 */
export function getExamplePrompts(
  language: "nb" | "nn" | "en",
  profile?: EngineeringStandardFamily | null,
): string[] {
  if (language !== "en") return EXAMPLE_PROMPTS_NORWEGIAN;
  const key = (profile ?? "eurocode_general") as EngineeringStandardFamily;
  return EXAMPLE_PROMPTS_EN_BY_PROFILE[key] ?? EXAMPLE_PROMPTS_EN_BY_PROFILE.eurocode_general;
}

// Backward-compat for gamle norsk-call sites (om nokon framleis bruker konstanten).
export const EXAMPLE_PROMPTS = EXAMPLE_PROMPTS_NORWEGIAN;

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
      title: "Konstruktørene jobber",
      description:
        "Dobbel-kontroll med to uavhengige konstruktører, sammenligning og kontrolløravgjørelse.",
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
      title: "Konstruktørane jobbar",
      description:
        "Dobbel-kontroll med to uavhengige konstruktørar, samanlikning og kontrolløravgjerd.",
    },
    calculation_result: {
      eyebrow: "STEG 3 AV 3 · RESULTAT",
      title: "Berekningsnotat",
      description:
        "Førebels resultat med agentkontroll. Må kontrollerast av fagperson før bruk.",
    },
  },
};