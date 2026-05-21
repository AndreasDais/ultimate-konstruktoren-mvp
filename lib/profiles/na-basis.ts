/**
 * NA-grunnlag for Pilar-konstruktørane (agent_a / agent_b).
 *
 * Dette er den AUTORITATIVE kjelda for nasjonalt bestemte parametrar (NDP)
 * og kodefesta klassifiseringsreglar. Same rolle som steel-profiles.ts har
 * for tverrsnittsdata: oppslagsverdiar — ikkje noko ein agent skal hugse,
 * gjette eller utleie.
 *
 * GJELD BEGGE KONSTRUKTØRAR. B vel framleis sjølv løysingsmetode (numerisk,
 * fritt legeme, alternativ utleiing) — men verdiane her er bindande for både
 * A og B. Ein partialfaktor er ikkje ein "metode".
 *
 * VERIFISERT 21.05.2026 mot NS-EN 1990/1992/1993 + norske nasjonale tillegg.
 * Pilotomfang: EC0 lastkombinasjon, EC3 stål (tverrsnitt + knekking),
 * EC2 betong (bøyning + skjær). Konstantar utanfor dette må leggjast til av
 * fagperson FØR omfanget blir utvida — funksjonane kastar heller enn å gjette.
 *
 * VERSJONER endringar i Git, slik at agent_i kan flagge påverka rapportar.
 */

import { SteelProfile } from "./steel-profiles";

// ─────────────────────────────────────────────────────────────
//  Typar
// ─────────────────────────────────────────────────────────────

export type SteelGrade = "S235" | "S275" | "S355" | "S420" | "S460";
export type Axis = "y-y" | "z-z";
export type BucklingCurve = "a0" | "a" | "b" | "c" | "d";

// ─────────────────────────────────────────────────────────────
//  EC0 — laster (NS-EN 1990 + NA)
// ─────────────────────────────────────────────────────────────
/**
 * STR-lastkombinasjon, tabell NA.A1.2(B) — dimensjonerande er den
 * ugunstigaste av:
 *   6.10a:  1,35·ΣG + Σ(1,5·ψ0,i·Q_i)
 *   6.10b:  1,20·ΣG + 1,5·Q_1 + Σ(1,5·ψ0,i·Q_i)   for i ≠ 1
 * Ligning 6.10 (1,35·G + 1,5·Q) er ei konservativ FORENKLING, ikkje
 * NA-kombinasjonen. Bruk paret 6.10a/6.10b.
 */
export const EC0 = {
  gammaG: { unfav_610a: 1.35, unfav_610b: 1.2, fav: 1.0 },
  gammaQ: { unfav: 1.5, fav: 0 },
  psi0: {
    imposed_A_D: 0.7, // nyttelast kategori A-D
    imposed_E: 1.0, // lager
    snow: 0.7, // snølast, Noreg — alle høgder
    wind: 0.6,
  },
} as const;

// ─────────────────────────────────────────────────────────────
//  EC3 — stål (NS-EN 1993-1-1 + NA)
// ─────────────────────────────────────────────────────────────
export const EC3 = {
  gammaM0: 1.05, // tverrsnittskapasitet
  gammaM1: 1.05, // stabilitet / knekking
  gammaM2: 1.25, // brot i strekk netto tverrsnitt / boltar
  E: 210000, // N/mm², elastisitetsmodul
} as const;

const IMPERFECTION_FACTOR: Record<BucklingCurve, number> = {
  a0: 0.13,
  a: 0.21,
  b: 0.34,
  c: 0.49,
  d: 0.76,
};

const FY_TABLE: Record<SteelGrade, { tle40: number; tle80: number }> = {
  S235: { tle40: 235, tle80: 215 },
  S275: { tle40: 275, tle80: 255 },
  S355: { tle40: 355, tle80: 335 },
  S420: { tle40: 420, tle80: 390 },
  S460: { tle40: 460, tle80: 430 },
};

/**
 * Flytespenning f_y (N/mm²) etter EC3 tabell 3.1, varmvalsa konstruksjonsstål.
 * t = relevant tjukkleik (mm), normalt flenstjukkleik t_f.
 * MERK: EC3 tabell 3.1 brukar banda ≤40 mm / 40-80 mm — IKKJE EN 10025-2 sitt
 * ≤16 mm-band. Pilar skal bruke tabell 3.1 konsekvent.
 */
export function yieldStrength(grade: SteelGrade, t: number): number {
  const row = FY_TABLE[grade];
  if (t <= 40) return row.tle40;
  if (t <= 80) return row.tle80;
  throw new Error(
    `f_y for t = ${t} mm (> 80 mm) er utanfor EC3 tabell 3.1 sitt ` +
      `pilotomfang — fagperson må leggje til verdien.`,
  );
}

/**
 * Vel knekkekurve + imperfeksjonsfaktor α for VALSA I-/H-profil etter
 * EC3 tabell 6.2.
 *
 * Gjeld berre valsa I-/H-tverrsnitt. For sveisa profil, hulprofil, vinkel
 * osv. skal funksjonen IKKJE brukast — orkestreringa må då flagge, ikkje
 * gjette. Funksjonen er ein reint deterministisk oppslag: agenten skal
 * aldri velje kurve sjølv.
 */
export function selectBucklingCurve(
  profile: Pick<SteelProfile, "h" | "b" | "tf">,
  grade: SteelGrade,
  axis: Axis,
): { curve: BucklingCurve; alpha: number } {
  const hb = profile.h / profile.b;
  const tf = profile.tf;
  let curve: BucklingCurve;

  if (grade === "S460") {
    if (hb > 1.2) {
      if (tf <= 40) curve = "a0";
      else if (tf <= 100) curve = "a";
      else throw new Error(curveOutOfScope(hb, tf));
    } else {
      curve = tf <= 100 ? "a0" : "c";
    }
  } else {
    // S235 / S275 / S355 / S420
    if (hb > 1.2) {
      if (tf <= 40) curve = axis === "y-y" ? "a" : "b";
      else if (tf <= 100) curve = axis === "y-y" ? "b" : "c";
      else throw new Error(curveOutOfScope(hb, tf));
    } else {
      curve = tf <= 100 ? (axis === "y-y" ? "b" : "c") : "d";
    }
  }
  return { curve, alpha: IMPERFECTION_FACTOR[curve] };
}

function curveOutOfScope(hb: number, tf: number): string {
  return (
    `Knekkekurve for h/b = ${hb.toFixed(2)}, t_f = ${tf} mm er ikkje dekt ` +
    `av EC3 tabell 6.2 for valsa I-profil — fagperson må vurdere.`
  );
}

// ─────────────────────────────────────────────────────────────
//  EC2 — betong (NS-EN 1992-1-1 + NA)
// ─────────────────────────────────────────────────────────────
export const EC2 = {
  gammaC: 1.5, // betong
  gammaS: 1.15, // armering
  alphaCC: 0.85, // f_cd = alphaCC · f_ck / gammaC
  stressBlock: {
    // rektangulær spenningsblokk, f_ck ≤ 50 MPa
    lambda: 0.8,
    eta: 1.0,
    epsCu3: 0.0035,
  },
  // ξ pinna som x/d (nøytralakse-djupne / effektiv høgd), EC2 §3.1.7.
  // Begge konstruktørar OG ξ_lim-sjekken skal bruke denne normaliseringa.
  xiDefinition: "x/d" as const,
  shear: {
    // skjær utan skjærarmering, EC2 6.2.2
    cRdcFactor: 0.18, // C_Rd,c = 0.18 / gammaC
    vminFactor: 0.035, // v_min = 0.035 · k^1.5 · √f_ck
    kMax: 2.0,
    rhoLMax: 0.02,
  },
} as const;

// ─────────────────────────────────────────────────────────────
//  Prompt-blokk for innsprøyting i agent_a / agent_b
// ─────────────────────────────────────────────────────────────

const NA_BASIS_HEADER =
  "NA-GRUNNLAG — AUTORITATIVE VERDIAR (gjeld både Konstruktør A og B)\n" +
  "Verdiane under er nasjonalt bestemte parametrar og kodefesta\n" +
  "klassifiseringsreglar (NS-EN 1990/1992/1993 + norsk NA). Det finst\n" +
  "nøyaktig éin rett verdi for kvar.\n" +
  "  - Bruk verdiane EKSAKT. Aldri hugs, gjett eller utlei eigne\n" +
  "    partialfaktorar, NA-konstantar eller knekkekurve-val.\n" +
  "  - Du vel sjølv LØYSINGSMETODE (lukka formel, numerisk, fritt legeme,\n" +
  "    alternativ utleiing). Metoden er din — verdiane er det ikkje.\n" +
  "  - Manglar utrekninga ein NA-verdi som ikkje står her: stopp og\n" +
  "    flagg det. Ikkje fyll holet frå minnet.\n" +
  "  - Oppgi NA-grunnlag-referanse for kvar konstant du brukar.\n";

function fmtEC0(): string {
  return [
    "EC0 — LASTER (NS-EN 1990 + NA)",
    `  gamma_G = ${EC0.gammaG.unfav_610a} (ugunstig, 6.10a) / ` +
      `${EC0.gammaG.unfav_610b} (ugunstig, 6.10b) / ${EC0.gammaG.fav} (gunstig)`,
    `  gamma_Q = ${EC0.gammaQ.unfav} (ugunstig) / ${EC0.gammaQ.fav} (gunstig)`,
    `  psi0: nyttelast A-D = ${EC0.psi0.imposed_A_D} · lager E = ` +
      `${EC0.psi0.imposed_E} · sno = ${EC0.psi0.snow} · vind = ${EC0.psi0.wind}`,
    "  STR-kombinasjon (tabell NA.A1.2(B)) — bruk ugunstigaste av:",
    "    6.10a: 1,35·SG + S(1,5·psi0,i·Q_i)",
    "    6.10b: 1,20·SG + 1,5·Q_1 + S(1,5·psi0,i·Q_i)  for i != 1",
    "    (eq. 6.10 = 1,35·G + 1,5·Q er konservativ forenkling, ikkje NA-kombinasjonen)",
  ].join("\n");
}

function fmtEC3(): string {
  return [
    "EC3 — STAL (NS-EN 1993-1-1 + NA)",
    `  gamma_M0 = ${EC3.gammaM0} (tverrsnitt) · gamma_M1 = ${EC3.gammaM1} ` +
      `(knekking) · gamma_M2 = ${EC3.gammaM2} (strekkbrot/boltar)`,
    `  E = ${EC3.E} N/mm²`,
    "  f_y: EC3 tabell 3.1 — S355 = 355 (t<=40 mm) / 335 (40<t<=80 mm)",
    "  Knekkekurve (valsa I/H, EC3 tabell 6.2), S235-S420:",
    "    h/b > 1,2, t_f <= 40 mm    → y-y: a · z-z: b",
    "    h/b > 1,2, 40<t_f<=100 mm  → y-y: b · z-z: c",
    "    h/b <= 1,2, t_f <= 100 mm  → y-y: b · z-z: c",
    "    h/b <= 1,2, t_f > 100 mm   → y-y: d · z-z: d",
    "    alpha: a0=0,13 · a=0,21 · b=0,34 · c=0,49 · d=0,76",
  ].join("\n");
}

function fmtEC2(): string {
  return [
    "EC2 — BETONG (NS-EN 1992-1-1 + NA)",
    `  gamma_c = ${EC2.gammaC} · gamma_s = ${EC2.gammaS} · ` +
      `alpha_cc = ${EC2.alphaCC}`,
    "  f_cd = alpha_cc·f_ck/gamma_c · f_yd = f_yk/gamma_s",
    `  Spenningsblokk (f_ck <= 50): lambda = ${EC2.stressBlock.lambda} · ` +
      `eta = ${EC2.stressBlock.eta} · eps_cu3 = ${EC2.stressBlock.epsCu3}`,
    `  xi = ${EC2.xiDefinition} (noytralakse-djupne / effektiv hogd, EC2 §3.1.7)`,
    `  Skjaer u/armering (6.2.2): C_Rd,c = ${EC2.shear.cRdcFactor}/gamma_c · ` +
      `v_min = ${EC2.shear.vminFactor}·k^1,5·sqrt(f_ck) · ` +
      `k <= ${EC2.shear.kMax} · rho_l <= ${EC2.shear.rhoLMax}`,
  ].join("\n");
}

/**
 * Bygg NA-grunnlag-blokka for innsprøyting i konstruktør-prompten.
 * Same rolle som buildProfileDataPromptBlock i extract.ts.
 *
 * Gir du `profiles` + `grade`, blir konkret knekkekurve slått opp og lagt
 * ved per profil — den sterkaste bindinga: ingenting att for agenten å
 * "anta".
 */
export function buildNaBasisPromptBlock(opts?: {
  profiles?: SteelProfile[];
  grade?: SteelGrade;
}): string {
  const parts = [NA_BASIS_HEADER, "", fmtEC0(), "", fmtEC3(), "", fmtEC2()];

  if (opts?.profiles?.length && opts.grade) {
    const lines = ["", "KONKRET KNEKKEKURVE (slatt opp for oppgitte profil):"];
    for (const p of opts.profiles) {
      for (const axis of ["y-y", "z-z"] as Axis[]) {
        const { curve, alpha } = selectBucklingCurve(p, opts.grade, axis);
        lines.push(
          `  ${p.name} (${opts.grade}), ${axis}: kurve ${curve}, alpha = ${alpha}`,
        );
      }
    }
    parts.push(lines.join("\n"));
  }

  return parts.join("\n") + "\n\n";
}