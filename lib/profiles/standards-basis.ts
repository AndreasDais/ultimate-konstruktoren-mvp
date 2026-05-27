/**
 * Standards-grunnlag-dispatcher for Pilar-konstruktørane (agent_a / agent_b / agent_d).
 *
 * Vel kva autoritativ verdi-blokk som skal sprøytast inn i prompten, basert
 * på EngineeringContext.standards.family. Blokka er OPPSLAG — agentane skal
 * aldri gjette eigne partialfaktorar.
 *
 *   eurocode_norway   -> norsk NA-blokk (na-basis.ts; autoritativ, verifisert).
 *   eurocode_general  -> generell EN-blokk (EN-anbefalte verdiar, ingen NA).
 *   (ingen kontekst)  -> norsk NA-blokk (det norske domestic-flytet).
 *   eurocode_uk_na    -> INGA blokk (UK NA har eigne NDP-ar; ein verifisert
 *                        UK-blokk er ikkje levert enno. Heller inga blokk
 *                        enn ei blokk merkt "bruk eksakt" med feil tal).
 *   aisc_asce_aci /   -> INGA blokk (ikkje Eurocode; agenten har standarden
 *   canada / australia   frå systemprompt + kontekstblokk).
 *   / unknown
 *
 * REGRESJONSVERN: det norske flytet sender aldri nokon engineering-context
 * (loadEngineeringContextFromStorage strippar NO). Difor MÅ "ingen kontekst"
 * rute til den norske blokka — elles mistar kvar norsk køyring NA-grunnlaget.
 *
 * VERDIANE i EUROCODE_GENERAL er EN-anbefalte verdiar (Recommended values),
 * EN 1990 / EN 1992-1-1 / EN 1993-1-1. Eit prosjekt sitt nasjonale tillegg
 * kan avvike — difor seier blokk-headeren det eksplisitt. Verifiser mot
 * EN-tekst FØR offentleg launch.
 */

import type {
  EngineeringContext,
  EngineeringStandardFamily,
} from "@/lib/engineering-context/types";
import type { SteelProfile } from "./steel-profiles";
import {
  EC0,
  EC2,
  EC3,
  buildNaBasisPromptBlock,
  selectBucklingCurve,
  type Axis,
  type SteelGrade,
} from "./na-basis";

export type StandardsBasisOpts = {
  profiles?: SteelProfile[];
  grade?: SteelGrade;
};

// ─────────────────────────────────────────────────────────────
//  Generell Eurocode — EN-ANBEFALTE verdiar (ingen nasjonalt tillegg)
//
//  Kjelde: EN 1990 / EN 1992-1-1 / EN 1993-1-1, "Recommended values".
//  Gjeld når brukaren har valt Eurocode utan spesifikt NA.
//  Knekkekurver (EC3 tab. 6.2) og f_y (EC3 tab. 3.1) er hovudtekst,
//  ikkje NA — dei er like for alle Eurocode-familiar.
// ─────────────────────────────────────────────────────────────
const EUROCODE_GENERAL = {
  ec0: {
    gammaG_unfav: 1.35, // 6.10a, og basis for 6.10b via xi
    xi_610b: 0.85, // EN 1990 A1.2.2(B), anbefalt reduksjonsfaktor for 6.10b
    gammaG_fav: 1.0,
    gammaQ_unfav: 1.5,
    gammaQ_fav: 0,
    psi0_imposed_A_D: 0.7, // nyttelast kategori A-D
    psi0_imposed_E: 1.0, // lager
    psi0_snow_le1000: 0.5, // snølast, sites <= 1000 m a.s.l.
    psi0_snow_gt1000: 0.7, // snølast, sites > 1000 m a.s.l.
    psi0_wind: 0.6,
  },
  ec3: {
    gammaM0: 1.0, // EN 1993-1-1 6.1, anbefalt (tverrsnitt)
    gammaM1: 1.0, // anbefalt (stabilitet / knekking)
    gammaM2: 1.25, // anbefalt (strekkbrot / boltar)
    E: 210000, // N/mm^2
  },
  ec2: {
    gammaC: 1.5, // betong
    gammaS: 1.15, // armering
    alphaCC: 1.0, // EN 1992-1-1 3.1.6, anbefalt (NA kan velje 0.8-1.0)
  },
} as const;

const EUROCODE_GENERAL_HEADER =
  "STANDARDS BASIS — AUTHORITATIVE VALUES (applies to Constructor A and Constructor B)\n" +
  "The values below are the RECOMMENDED values of EN 1990/1992/1993, used\n" +
  "because this run is Eurocode WITHOUT a specific National Annex. Within\n" +
  "this run there is exactly one correct value for each.\n" +
  "  - Use the values EXACTLY. Never recall, guess or derive your own partial\n" +
  "    factors, code constants or buckling-curve choices.\n" +
  "  - You choose the SOLUTION METHOD yourself (closed form, numerical, free\n" +
  "    body, alternative derivation). The method is yours — the values are not.\n" +
  "  - If the calculation needs a value not listed here: stop and flag it.\n" +
  "    Do not fill the gap from memory.\n" +
  "  - These are EN recommended values; a project's National Annex may set\n" +
  "    different values. State this assumption in the report.\n" +
  "  - Cite the standards-basis reference for every constant you use.\n";

function fmtGeneralEC0(): string {
  const e = EUROCODE_GENERAL.ec0;
  return [
    "EC0 — ACTIONS (EN 1990, recommended values)",
    `  gamma_G = ${e.gammaG_unfav} (unfavourable) / ${e.gammaG_fav} (favourable)`,
    `  gamma_Q = ${e.gammaQ_unfav} (unfavourable) / ${e.gammaQ_fav} (favourable)`,
    `  xi = ${e.xi_610b} (reduction factor for the permanent action in eq. 6.10b)`,
    `  psi0: imposed A-D = ${e.psi0_imposed_A_D} · storage E = ${e.psi0_imposed_E} · ` +
      `snow = ${e.psi0_snow_le1000} (<=1000 m a.s.l.) / ${e.psi0_snow_gt1000} (>1000 m) · ` +
      `wind = ${e.psi0_wind}`,
    "  STR combination (Table A1.2(B)) — use the most unfavourable of:",
    `    6.10a: ${e.gammaG_unfav}·SG + S(${e.gammaQ_unfav}·psi0,i·Q_i)`,
    `    6.10b: ${e.xi_610b}·${e.gammaG_unfav}·SG + ${e.gammaQ_unfav}·Q_1 + ` +
      `S(${e.gammaQ_unfav}·psi0,i·Q_i)  for i != 1`,
    "    (eq. 6.10 = 1.35·G + 1.5·Q is a conservative simplification, not the 6.10a/b pair)",
  ].join("\n");
}

function fmtGeneralEC3(): string {
  const e = EUROCODE_GENERAL.ec3;
  return [
    "EC3 — STEEL (EN 1993-1-1, recommended values)",
    `  gamma_M0 = ${e.gammaM0} (cross-section) · gamma_M1 = ${e.gammaM1} ` +
      `(buckling) · gamma_M2 = ${e.gammaM2} (net-section / bolts)`,
    `  E = ${e.E} N/mm^2`,
    "  f_y: EN 1993-1-1 Table 3.1 — e.g. S355 = 355 (t<=40 mm) / 335 (40<t<=80 mm)",
    "  Buckling curve (rolled I/H, Table 6.2), S235-S420:",
    "    h/b > 1.2, t_f <= 40 mm    -> y-y: a · z-z: b",
    "    h/b > 1.2, 40<t_f<=100 mm  -> y-y: b · z-z: c",
    "    h/b <= 1.2, t_f <= 100 mm  -> y-y: b · z-z: c",
    "    h/b <= 1.2, t_f > 100 mm   -> y-y: d · z-z: d",
    "    alpha: a0=0.13 · a=0.21 · b=0.34 · c=0.49 · d=0.76",
  ].join("\n");
}

function fmtGeneralEC2(): string {
  const e = EUROCODE_GENERAL.ec2;
  return [
    "EC2 — CONCRETE (EN 1992-1-1, recommended values)",
    `  gamma_c = ${e.gammaC} · gamma_s = ${e.gammaS} · alpha_cc = ${e.alphaCC}`,
    "  f_cd = alpha_cc·f_ck/gamma_c · f_yd = f_yk/gamma_s",
    "  Stress block (f_ck <= 50): lambda = 0.8 · eta = 1.0 · eps_cu3 = 0.0035",
    "  xi = x/d (neutral-axis depth / effective depth, EC2 §3.1.7)",
    "  Shear without reinforcement (6.2.2): C_Rd,c = 0.18/gamma_c · " +
      "v_min = 0.035·k^1.5·sqrt(f_ck) · k <= 2.0 · rho_l <= 0.02",
  ].join("\n");
}

function buildConcreteCurveBlockEN(
  profiles: SteelProfile[],
  grade: SteelGrade,
): string {
  const lines = [
    "",
    "CONCRETE BUCKLING CURVE (looked up for the given profiles):",
  ];
  for (const p of profiles) {
    for (const axis of ["y-y", "z-z"] as Axis[]) {
      const { curve, alpha } = selectBucklingCurve(p, grade, axis);
      lines.push(
        `  ${p.name} (${grade}), ${axis}: curve ${curve}, alpha = ${alpha}`,
      );
    }
  }
  return lines.join("\n");
}

/** Bygg den generelle EN-blokka (engelsk, EN-anbefalte verdiar). */
function buildEurocodeGeneralBlock(opts?: StandardsBasisOpts): string {
  const parts = [
    EUROCODE_GENERAL_HEADER,
    "",
    fmtGeneralEC0(),
    "",
    fmtGeneralEC3(),
    "",
    fmtGeneralEC2(),
  ];
  if (opts?.profiles?.length && opts.grade) {
    parts.push(buildConcreteCurveBlockEN(opts.profiles, opts.grade));
  }
  return parts.join("\n") + "\n\n";
}

/**
 * Vel og bygg den autoritative verdi-blokka for ei køyring.
 *
 * `context` er undefined for det norske domestic-flytet — det rutar MED
 * VILJE til den norske NA-blokka (regresjonsvern; sjå fil-headeren).
 */
export function buildStandardsBasisPromptBlock(
  context: EngineeringContext | null | undefined,
  opts?: StandardsBasisOpts,
): string {
  const family = context?.standards?.family;

  switch (family) {
    case undefined:
      // Norsk domestic-flyt sender inga engineering-context.
      // MÅ rute til norsk NA-blokk (regresjonsvern).
      return buildNaBasisPromptBlock(opts);

    case "eurocode_norway":
      return buildNaBasisPromptBlock(opts);

    case "eurocode_general":
      return buildEurocodeGeneralBlock(opts);

    case "eurocode_uk_na":
    case "aisc_asce_aci":
    case "canada":
    case "australia":
    case "unknown":
      return "";

    default: {
      // Ny/ukjend familie: kompileringsfeil her tvingar eit medvite val.
      // Køyretid: inga blokk heller enn feil blokk.
      const _exhaustive: never = family;
      void _exhaustive;
      return "";
    }
  }
}


// ─────────────────────────────────────────────────────────────
//  Faktorsett — normalisert kjelde for dei deterministiske
//  kontrollane i agent-d (NA-avvik + lastkombinasjon)
//
//  EITT opphav: bygd frå na-basis (norsk NA) eller EUROCODE_GENERAL
//  (EN-anbefalt) — slik at prompt-blokka og kontrollane les same tal
//  og aldri kan vere usamde.
// ─────────────────────────────────────────────────────────────

/** Normalisert partialfaktor-sett for deterministisk kontroll. */
export type StructuralFactorSet = {
  family: EngineeringStandardFamily;
  /** Kortlabel for kontroll-meldingar (t.d. "norsk NA"). */
  standardLabel: string;
  // EC0 — STR-lastkombinasjon
  gammaG_610a: number;
  /** Effektiv gamma_G for 6.10b (norsk NA: 1.20; generell EN: xi * 1.35). */
  gammaG_610b: number;
  gammaQ_unfav: number;
  psi0: {
    imposed_A_D: number;
    imposed_E: number;
    snow: number;
    wind: number;
  };
  // EC3/EC2 — NA-avvik-sjekk
  gammaM0: number;
  gammaM1: number;
  gammaC: number;
  gammaS: number;
  alphaCC: number;
};

const NORWAY_FACTOR_SET: StructuralFactorSet = {
  family: "eurocode_norway",
  standardLabel: "norsk NA (NS-EN 1990/1992/1993)",
  gammaG_610a: EC0.gammaG.unfav_610a,
  gammaG_610b: EC0.gammaG.unfav_610b,
  gammaQ_unfav: EC0.gammaQ.unfav,
  psi0: {
    imposed_A_D: EC0.psi0.imposed_A_D,
    imposed_E: EC0.psi0.imposed_E,
    snow: EC0.psi0.snow,
    wind: EC0.psi0.wind,
  },
  gammaM0: EC3.gammaM0,
  gammaM1: EC3.gammaM1,
  gammaC: EC2.gammaC,
  gammaS: EC2.gammaS,
  alphaCC: EC2.alphaCC,
};

const EUROCODE_GENERAL_FACTOR_SET: StructuralFactorSet = {
  family: "eurocode_general",
  standardLabel: "EN 1990/1992/1993 (recommended values)",
  gammaG_610a: EUROCODE_GENERAL.ec0.gammaG_unfav,
  // 6.10b: EN-anbefalt er xi * gamma_G (ikkje ein direkte faktor som norsk NA).
  gammaG_610b: EUROCODE_GENERAL.ec0.xi_610b * EUROCODE_GENERAL.ec0.gammaG_unfav,
  gammaQ_unfav: EUROCODE_GENERAL.ec0.gammaQ_unfav,
  psi0: {
    imposed_A_D: EUROCODE_GENERAL.ec0.psi0_imposed_A_D,
    imposed_E: EUROCODE_GENERAL.ec0.psi0_imposed_E,
    // EN 1990 Tab. A1.1: snø-psi0 er høgde-avhengig (0.5 <=1000 m / 0.7 >1000 m).
    // checkLoadCombination hoppar over generell + snølast sidan høgda er ukjend.
    snow: EUROCODE_GENERAL.ec0.psi0_snow_le1000,
    wind: EUROCODE_GENERAL.ec0.psi0_wind,
  },
  gammaM0: EUROCODE_GENERAL.ec3.gammaM0,
  gammaM1: EUROCODE_GENERAL.ec3.gammaM1,
  gammaC: EUROCODE_GENERAL.ec2.gammaC,
  gammaS: EUROCODE_GENERAL.ec2.gammaS,
  alphaCC: EUROCODE_GENERAL.ec2.alphaCC,
};

/**
 * Vel det autoritative faktorsettet for ei køyring.
 *
 * Returnerer null for familiar utan eit verifisert faktorsett (UK NA, AISC,
 * NBCC, AS) — dei deterministiske kontrollane i agent-d skal då hoppast over,
 * ikkje gjette. `undefined` familie = norsk domestic-flyt (regresjonsvern).
 */
export function resolveFactorSet(
  family: EngineeringStandardFamily | undefined,
): StructuralFactorSet | null {
  switch (family) {
    case undefined:
    case "eurocode_norway":
      return NORWAY_FACTOR_SET;

    case "eurocode_general":
      return EUROCODE_GENERAL_FACTOR_SET;

    case "eurocode_uk_na":
    case "aisc_asce_aci":
    case "canada":
    case "australia":
    case "unknown":
      return null;

    default: {
      const _exhaustive: never = family;
      void _exhaustive;
      return null;
    }
  }
}
