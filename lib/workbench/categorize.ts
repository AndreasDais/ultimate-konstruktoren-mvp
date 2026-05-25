/**
 * Kategorisering av tolkte_verdiar for visuell gruppering i Tolkar-output.
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 5.
 */

import type { Locale } from "@/lib/locale";
import type { ValueCategory } from "./types";

export const CATEGORY_ORDER: ValueCategory[] = [
  "profile_material",
  "geometry",
  "loads",
  "load_combinations",
  "material_props",
  "section_props",
  "stability",
  "serviceability",
  "other",
];

export const CATEGORY_LABELS: Record<ValueCategory, Record<Locale, string>> = {
  profile_material: { nb: "Profil & material", nn: "Profil & material" },
  geometry: { nb: "Geometri & opplegg", nn: "Geometri & opplegg" },
  loads: { nb: "Laster", nn: "Laster" },
  load_combinations: { nb: "Lastkombinasjoner", nn: "Lastkombinasjonar" },
  material_props: { nb: "Materialkonstanter", nn: "Materialkonstantar" },
  section_props: { nb: "Tverrsnittsdata", nn: "Tverrsnittsdata" },
  stability: { nb: "Knekk-parametre", nn: "Knekk-parametrar" },
  serviceability: { nb: "Bruksgrense (SLS)", nn: "Bruksgrense (SLS)" },
  other: { nb: "Andre", nn: "Andre" },
};

// Plasserer ein tolka verdi i ein kategori basert på nøkkel-mønster.
// Rekkjefølga matterar: meir spesifikke mønster må kome før breiare.
// Robust mot både norsk/engelsk variantar og symbol-baserte nøklar.
export function categorizeKey(key: string): ValueCategory {
  const k = key.toLowerCase().trim();

  // 1. Profil & material — eksplisitte ordmønster
  if (/^(profil|stålkvalitet|stalkvalitet|betongkvalitet|treklasse|tverrsnittklasse|materiale?|armering|fagomr[aå]de)/.test(k)) {
    return "profile_material";
  }

  // 2. Stabilitet / knekking — spesifikke LTB-symbol (må komme før geometri pga L_LT)
  if (/^(alpha_lt|α_lt|chi_lt|χ_lt|lambda_lt|λ_lt|phi_lt|φ_lt|vippekurve|k_lt|k_w|knekkurve|eulerlast|imperfeksjon)/.test(k)) {
    return "stability";
  }

  // 3. Tverrsnittsdata — treghetsmoment, motstandsmoment, areal
  if (/^(w_pl|w_el|i_y|i_z|i_t|i_w|a_v|a_s|i_min|i_max|s_pl|t_w|t_f|h_w|b_f)/.test(k) || k === "a") {
    return "section_props";
  }

  // 4. Materialkonstantar — fastleik, stivleik, partial-faktorar
  if (/^(f_y|f_c|f_ct|gamma_m|gamma_c|gamma_s|alpha_cc|alpha_e|epsilon)/.test(k) || k === "e" || k === "g") {
    return "material_props";
  }

  // 5. Lastkombinasjonar
  if (/kombinasjon|kombo|psi_|ψ_|gamma_g|gamma_q|γ_g|γ_q/.test(k)) {
    return "load_combinations";
  }

  // 6. Laster
  if (/^(g_|q_|p_|w_k)/.test(k) || /^(last|sn[øo]last|vindlast|nyttelast|egenlast)/.test(k) || /^[gqp]$/.test(k)) {
    return "loads";
  }

  // 7. Bruksgrense
  if (/nedb[oø]ying|w_max|w_lim|w_kar|w_hyppig|w_perm|tillatt_nedb/.test(k)) {
    return "serviceability";
  }

  // 8. Geometri — lengder, diwhilejonar, opplegg
  if (/^(l$|l_|h$|b$|d$|h_|b_|d_|span|spennvidde|knekklengde|oppleggs|sideavstiving|geometri|skive)/.test(k)) {
    return "geometry";
  }

  return "other";
}

// Tekniske symbol-namn (med underscore) skal behaldast som-er — det er
// fagleg konvensjon at f_y, g_k, alpha_LT, ULS_kombinasjon skrivast med
// liten første-bokstav. Reint deskriptive ord (bygningstype, oppleggstilhøve)
// får stor første-bokstav for lesbarheit.
export function formatKey(key: string): string {
  if (key.includes("_")) return key;
  return key.charAt(0).toUpperCase() + key.slice(1);
}