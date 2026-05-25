/**
 * Heuristikkar for dimensjonerande tiles (#01) på Resultat-sida.
 *
 * Backend (Engineer A/B) har IKKJE primary-flagg per result-key i
 * pilot-skjema. Vi avgjer klient-side kva som er "dimensjonerande" (det
 * studenten skal verifisere før rapport) vs "intermediate value" (input + delsteg).
 *
 * Tre-stegs heuristikk:
 *   (1) per-oppgåvetype regex-allowlist (DIMENSJONERANDE_PATTERNS)
 *   (2) universell output-pattern (prefiks/suffiks-konvensjon)
 *   (3) input-filter på dei første N keys
 *   (4) fallback til dei første 3
 *
 * Post-pilot bør structured_output utvidast med primary_keys i konstruktør-
 * promptane så avgjerda flyttast til backend.
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 2.
 */

import type { Locale } from "@/lib/locale";

// Per-oppgåvetype regex-patterns. Fleire pattern matchar fleire keys, og
// resultatet returnerast i den rekkjefølga keys finst i results-objektet
// (slik at agenten styrer rekkefølga, men patterna styrer kva som passerar).
// MERK: Agentane use As_* (ikkje A_s_*) for armering-keys.
export const DIMENSJONERANDE_PATTERNS: Record<string, RegExp[]> = {
  // Lastkombinasjonar (EC0) — alle Ed_ULS_* og Ed_SLS_* (kombo, psi0, hyppig, kvasi…)
  lastkombinasjon: [/^Ed_ULS/i, /^Ed_SLS/i, /^ULS_/i, /^SLS_/i],
  // Bjelke-lastverknad — moment og skjær (+ q_Ed som design-last)
  bjelke_lastverknad: [/^M_Ed$/, /^V_Ed$/, /^N_Ed$/, /^q_Ed$/],
  bjelke_moment_skjar: [/^M_Ed$/, /^V_Ed$/, /^N_Ed$/, /^q_Ed$/],
  bjelke: [/^M_Ed$/, /^V_Ed$/, /^N_Ed$/, /^q_Ed$/],
  lastverknad: [/^M_Ed$/, /^V_Ed$/, /^N_Ed$/, /^q_Ed$/],
  // Armering betongbjelke (EC2) — As_req er ferdig-svar, mu_Ed er utility-ratio
  armering_betongbjelke: [
    /^[Aa]_?s_(req|valgt|valt)$/,
    /^[Aa]_?s_(min|max)$/,
    /^mu_Ed$/,
    /^(mu|xi)_lim$/,
    /^M_Rd$/,
  ],
  armering_betong: [
    /^[Aa]_?s_(req|valgt|valt)$/,
    /^[Aa]_?s_(min|max)$/,
    /^mu_Ed$/,
    /^(mu|xi)_lim$/,
    /^M_Rd$/,
  ],
  armering: [
    /^[Aa]_?s_(req|valgt|valt)$/,
    /^[Aa]_?s_(min|max)$/,
    /^mu_Ed$/,
    /^(mu|xi)_lim$/,
    /^M_Rd$/,
  ],
  // Stålkapasitet (EC3)
  stalkapasitet: [/^N_Rd$/, /^M_Rd$/, /^V_Rd$/, /^.+_Rd$/],
  stal_kapasitet: [/^N_Rd$/, /^M_Rd$/, /^V_Rd$/, /^.+_Rd$/],
  kapasitet: [/^N_Rd$/, /^M_Rd$/, /^V_Rd$/, /^.+_Rd$/],
};

// STYRANDE_PATTERNS: keys som matchar desse skal hoistast til posisjon 0
// (= dark/store tile) etter at tile-keys er valde. Rekkefølga her er
// global prioritet på tvers av berekningstypar. Dette løyser problemet at
// agentane ikkje alltid legg det fagleg viktigaste først i results-objektet.
export const STYRANDE_PATTERNS: RegExp[] = [
  // Lastkombinasjonar — ULS-styrende/dominerende
  /^Ed_ULS_(styrende|styrande|dominerende|dominerande|kombo)$/i,
  /^ULS_(styrende|styrande|dominerende|dominerande|kombo)$/i,
  // Bjelke — moment er styrande
  /^M_Ed$/,
  /^M_Rd$/,
  // Armering — kravd armering er svaret
  /^[Aa]_?s_req$/,
  /^[Aa]_?s_(valgt|valt)$/,
  // Stålkapasitet — utnyttingsgrad eller motstand
  /^utnytting/i,
  /^N_Rd$/,
  // Generelt: ein Ed_-prefiks kombinasjon (siste utveg)
  /^Ed_ULS/i,
];

// Universell output-pattern: keys som anten startar med output-prefiks
// (Ed_, Rd_, As_, A_s_) eller endar på output-suffiks (_Ed, _Rd, _req, _min …).
// Steg 2 i heuristikken — fangar ny berekningstype som ikkje er i allowlist.
const OUTPUT_PATTERN =
  /^(Ed_|Rd_|[Aa]_?s_|mu_Ed)|_(Ed|Rd|req|min|max|lim|valgt|valt|net|eff|kombo|tot|brukt|krit)$/i;

// Patterns for keys som er åpenonly input/intermediære: einskilde
// geometri-bokstavar (L, b, d, h), karakteristiske laster (G_k, Q_k, q_k),
// partial-faktorar (gamma_*, psi_*), greske faktorar (alpha, beta, xi, eta …),
// materialkonstantar (f_y, f_c, E). Brukast som siste utveg-filter.
const INPUT_PATTERNS: RegExp[] = [
  /^(L|b|d|h|t|s|a|z)([_$]|$)/, // geometri og lever-arm
  /^(G_k|Q_k|q_k|q_d|w_k|p_k|p_d)$/, // karakteristiske/design-laster
  /^(gamma|psi|chi|xi|eta|lambda|alpha|beta|epsilon|nu|mu|zeta|phi|rho|kappa)([_$]|$)/i, // greske faktorar (mu unntak: mu_Ed = output)
  /^(f_y|f_c|f_ct|E_|G_modulus)/, // materialkonstantar
  /^(profil|stalkvalitet|betongkvalitet|treklasse|tverrsnittklasse)/, // profil/material
];

export function isInputKey(k: string): boolean {
  // Spesialhandsaming: mu_Ed er output sjølv om mu-prefiks ser ut som input
  if (/^mu_Ed$/i.test(k)) return false;
  return INPUT_PATTERNS.some((p) => p.test(k));
}

// Patterns for keys som høyrer heime i BRUKSGRENSETILSTAND (SLS), ikkje
// dimensjonerande (ULS). Trengs fordi DIMENSJONERANDE_PATTERNS si
// "lastkombinasjon"-allowlist matchar BÅDE /^Ed_ULS/ OG /^Ed_SLS/ — som er
// rett for å plukke dei som tiles, men feil for klassifisering i rapport-
// tabellen der ULS og SLS skal stå i separate band.
//
// Norsk konvensjon: bruksgrensetilstand (SLS) er karakteristisk-, hyppig-
// og kvasi-permanent-kombinasjon. Vi matchar:
//   - "SLS" som tydeleg markør (Ed_SLS_*, _SLS_*)
//   - karakteristisk/hyppig/kvasi-permanent som suffiks når dei ikkje
//     allereie er fanga av SLS-substring (defensiv mot agent-variantar)
const BRUKSGRENSE_PATTERNS: RegExp[] = [
  /\bSLS\b/i, // "Ed_SLS_*", "SLS_kombo", "_SLS_"
  /_kar(akteristisk)?(_|$)/i, // _kar, _karakteristisk
  /_hyp(pig)?(_|$)/i, // _hyp, _hyppig
  /_kvasi/i, // _kvasi, _kvasi_permanent
  /_qp(_|$)/i, // _qp (quasi-permanent abbreviation)
];

/**
 * Returnerer true om ein key høyrer i BRUKSGRENSE-band (SLS) heller enn
 * dimensjonerande (ULS).
 *
 * Brukast på rapport-sida til å splitte `dimKeys` frå `getDimensjonerandeKeys`
 * inn i ekte-ULS-band og SLS-band. Resultat-sida sin tile-logikk er uendra
 * — der vil SLS framleis vere tilles saman med ULS i "dimensjonerande"-tiles
 * (det er meininga: studenten skal sjå alle relevante kombinasjonsverdiar).
 */
export function isBruksgrenseKey(k: string): boolean {
  return BRUKSGRENSE_PATTERNS.some((p) => p.test(k));
}

// Tile-label-mapping for dei vanlegaste keys — gir kortform-eyebrow
// (UPPERCASE, prikkdelt). Fallback: key.toUpperCase().replace("_", " · ").
// Inkluderer både kortform- (Ed_SLS_kvasi) og langform- (Ed_SLS_kvasi_permanent)
// agent-variantar fordi konstruktørane use begge.
const KEY_TILE_LABELS: Record<string, Record<Locale, string>> = {
  // AISC / US customary demand keys
  M_u: { nb: "Mu", nn: "Mu" },
  V_u: { nb: "Vu", nn: "Vu" },
  w_u: { nb: "wu", nn: "wu" },
  D: { nb: "D", nn: "D" },
  L_load: { nb: "L", nn: "L" },
  Lb: { nb: "Lb", nn: "Lb" },
  LTBrisk: { nb: "LTB · RISK", nn: "LTB · RISK" },
  LTB_risk: { nb: "LTB · RISK", nn: "LTB · RISK" },
  phi_b_Mn: { nb: "φbMn", nn: "φbMn" },
  phi_v_Vn: { nb: "φvVn", nn: "φvVn" },
  // Lastkombinasjonar — ULS (mest styrande)
  Ed_ULS_styrende: { nb: "ULS · STYRENDE", nn: "ULS · STYRANDE" },
  Ed_ULS_styrande: { nb: "ULS · STYRENDE", nn: "ULS · STYRANDE" },
  Ed_ULS_dominerende: { nb: "ULS · DOMINERENDE", nn: "ULS · DOMINERANDE" },
  Ed_ULS_dominerande: { nb: "ULS · DOMINERENDE", nn: "ULS · DOMINERANDE" },
  Ed_ULS_kombo: { nb: "ULS · KOMBINASJON", nn: "ULS · KOMBINASJON" },
  Ed_ULS_psi0: { nb: "ULS · ψ₀-KOMBINASJON", nn: "ULS · ψ₀-KOMBINASJON" },
  ULS_styrende: { nb: "ULS · STYRENDE", nn: "ULS · STYRANDE" },
  ULS_dominerende: { nb: "ULS · DOMINERENDE", nn: "ULS · DOMINERANDE" },
  // Lastkombinasjonar — SLS
  Ed_SLS_karakt: { nb: "SLS · KARAKT.", nn: "SLS · KARAKT." },
  Ed_SLS_karakteristisk: { nb: "SLS · KARAKT.", nn: "SLS · KARAKT." },
  Ed_SLS_hyppig: { nb: "SLS · HYPPIG", nn: "SLS · HYPPIG" },
  Ed_SLS_kvasi: { nb: "SLS · KVASI-PERM.", nn: "SLS · KVASI-PERM." },
  Ed_SLS_kvasi_permanent: { nb: "SLS · KVASI-PERM.", nn: "SLS · KVASI-PERM." },
  // Bjelke-lastverknad
  M_Ed: { nb: "MOMENT · M_Ed", nn: "MOMENT · M_Ed" },
  V_Ed: { nb: "SKJÆR · V_Ed", nn: "SKJÆR · V_Ed" },
  N_Ed: { nb: "AKSIAL · N_Ed", nn: "AKSIAL · N_Ed" },
  q_Ed: { nb: "DESIGN-LAST · q_Ed", nn: "DESIGN-LAST · q_Ed" },
  // Kapasitet
  N_Rd: { nb: "AKSIAL · N_Rd", nn: "AKSIAL · N_Rd" },
  M_Rd: { nb: "MOMENT · M_Rd", nn: "MOMENT · M_Rd" },
  V_Rd: { nb: "SKJÆR · V_Rd", nn: "SKJÆR · V_Rd" },
  // Armering — agentane use As_* (ikkje A_s_*)
  As_req: { nb: "ARMERING · KRAV", nn: "ARMERING · KRAV" },
  As_min: { nb: "ARMERING · MIN", nn: "ARMERING · MIN" },
  As_max: { nb: "ARMERING · MAX", nn: "ARMERING · MAX" },
  As_valgt: { nb: "ARMERING · VALGT", nn: "ARMERING · VALD" },
  As_valt: { nb: "ARMERING · VALT", nn: "ARMERING · VALT" },
  // Alternative skrivemåtar (legacy)
  A_s_req: { nb: "ARMERING · KRAV", nn: "ARMERING · KRAV" },
  A_s_min: { nb: "ARMERING · MIN", nn: "ARMERING · MIN" },
  A_s_valgt: { nb: "ARMERING · VALGT", nn: "ARMERING · VALD" },
  // Utnyttingsgrad og grenseverdiar
  mu_Ed: { nb: "μ · UTNYTTING", nn: "μ · UTNYTTING" },
  mu_lim: { nb: "μ · GRENSE", nn: "μ · GRENSE" },
  xi_lim: { nb: "ξ · GRENSE", nn: "ξ · GRENSE" },
  zeta_Ed: { nb: "ζ · UTNYTTING", nn: "ζ · UTNYTTING" },
};

// Per-key fagleg forklaring som vert vist når studenten klikkar på ein tile.
// Skreve som korte 2-3 setnings-forklaringar pedagogisk tilpassa NTNU-studentar
// (byggfag-bachelor/master nivå). Når key ikkje finst i mappinga, vert tile-en
// ikkje klikkbar (cursor default, ingen onClick-handler).
export const KEY_TILE_DESCRIPTIONS: Record<string, Record<Locale, string>> = {
  // === Lastkombinasjonar (EC0, NS-EN 1990) ===
  Ed_ULS_styrende: {
    nb: "Dimensjonerende ULS-last i styrende kombinasjon. ULS (Ultimate Limit State) er bruddgrensetilstand — den lastkombinasjonen som gir størst påkjenning og som bæresystemet må motstå med tilstrekkelig sikkerhet. Beregnet etter EC0 ekv. 6.10 eller 6.10a/b.",
    nn: "Dimensjonerande ULS-last i styrande kombinasjon. ULS (Ultimate Limit State) er bruddgrensetilstand — den lastkombinasjonen som gir størst påkjenning og som bæresystemet må motstå med tilstrekkeleg tryggleik. Berekna etter EC0 ekv. 6.10 eller 6.10a/b.",
  },
  Ed_ULS_styrande: {
    nb: "Dimensjonerende ULS-last i styrende kombinasjon. ULS (Ultimate Limit State) er bruddgrensetilstand — den lastkombinasjonen som gir størst påkjenning og som bæresystemet må motstå med tilstrekkelig sikkerhet. Beregnet etter EC0 ekv. 6.10 eller 6.10a/b.",
    nn: "Dimensjonerande ULS-last i styrande kombinasjon. ULS (Ultimate Limit State) er bruddgrensetilstand — den lastkombinasjonen som gir størst påkjenning og som bæresystemet må motstå med tilstrekkeleg tryggleik. Berekna etter EC0 ekv. 6.10 eller 6.10a/b.",
  },
  Ed_ULS_dominerende: {
    nb: "Dimensjonerende ULS-last med dominerende variabel last (kategori-Q med faktor 1,5). Andre variable laster reduseres med ψ₀-faktor. Sammenligning mellom ulike Ed_ULS-kombinasjoner viser hvilken som er styrende.",
    nn: "Dimensjonerande ULS-last med dominerande variabel last (kategori-Q med faktor 1,5). Andre variable laster vert reduserte med ψ₀-faktor. Samanlikning mellom ulike Ed_ULS-kombinasjonar viser kva som er styrande.",
  },
  Ed_ULS_dominerande: {
    nb: "Dimensjonerende ULS-last med dominerende variabel last (kategori-Q med faktor 1,5). Andre variable laster reduseres med ψ₀-faktor. Sammenligning mellom ulike Ed_ULS-kombinasjoner viser hvilken som er styrende.",
    nn: "Dimensjonerande ULS-last med dominerande variabel last (kategori-Q med faktor 1,5). Andre variable laster vert reduserte med ψ₀-faktor. Samanlikning mellom ulike Ed_ULS-kombinasjonar viser kva som er styrande.",
  },
  Ed_ULS_kombo: {
    nb: "Dimensjonerende ULS-kombinasjon etter EC0. Brukes som referanse for sammenligning med alternative kombinasjoner (6.10a/b).",
    nn: "Dimensjonerande ULS-kombinasjon etter EC0. Brukast som referanse for samanlikning med alternative kombinasjonar (6.10a/b).",
  },
  Ed_ULS_psi0: {
    nb: "ULS-kombinasjon der den variable lasten reduseres med ψ₀-faktor (kombinasjonsverdi for samtidighet). Brukes når flere uavhengige variable laster opptrer samtidig, men ikke alle på samme tid.",
    nn: "ULS-kombinasjon der den variable lasten vert redusert med ψ₀-faktor (kombinasjonsverdi for samtidigheit). Brukast når fleire uavhengige variable laster opptrer samtidig, men ikkje alle på same tid.",
  },
  Ed_SLS_karakt: {
    nb: "SLS-karakteristisk kombinasjon (sjeldne, irreversible effekter). Brukes for nedbøyings-grenseverdier som ikke må overskrides — typisk L/250 for total nedbøyning, L/300 for langtid.",
    nn: "SLS-karakteristisk kombinasjon (sjeldne, irreversible effektar). Brukast for nedbøyings-grenseverdiar som ikkje må overskridast — typisk L/250 for total nedbøying, L/300 for langtid.",
  },
  Ed_SLS_karakteristisk: {
    nb: "SLS-karakteristisk kombinasjon (sjeldne, irreversible effekter). Brukes for nedbøyings-grenseverdier som ikke må overskrides — typisk L/250 for total nedbøyning, L/300 for langtid.",
    nn: "SLS-karakteristisk kombinasjon (sjeldne, irreversible effektar). Brukast for nedbøyings-grenseverdiar som ikkje må overskridast — typisk L/250 for total nedbøying, L/300 for langtid.",
  },
  Ed_SLS_hyppig: {
    nb: "SLS-hyppig kombinasjon (reversible effekter som opptrer ofte). Brukes for nedbøyings-vurderinger i daglig drift — komfort og brukbarhet under typiske bruksforhold.",
    nn: "SLS-hyppig kombinasjon (reversible effektar som opptrer ofte). Brukast for nedbøyings-vurderingar i dagleg drift — komfort og brukbarheit under typiske bruksforhold.",
  },
  Ed_SLS_kvasi: {
    nb: "SLS-kvasipermanent kombinasjon (langtids-effekter). Brukes for kryp og langtids-nedbøyning i betong — den lasten konstruksjonen bærer lengst tid. Typisk ψ₂ = 0,3 for kontorbygg.",
    nn: "SLS-kvasipermanent kombinasjon (langtids-effektar). Brukast for kryp og langtids-nedbøying i betong — den lasten konstruksjonen ber lengst tid. Typisk ψ₂ = 0,3 for kontorbygg.",
  },
  Ed_SLS_kvasi_permanent: {
    nb: "SLS-kvasipermanent kombinasjon (langtids-effekter). Brukes for kryp og langtids-nedbøyning i betong — den lasten konstruksjonen bærer lengst tid. Typisk ψ₂ = 0,3 for kontorbygg.",
    nn: "SLS-kvasipermanent kombinasjon (langtids-effektar). Brukast for kryp og langtids-nedbøying i betong — den lasten konstruksjonen ber lengst tid. Typisk ψ₂ = 0,3 for kontorbygg.",
  },
  // === Bjelke-lastverknad ===
  M_Ed: {
    nb: "Dimensjonerende moment i kritisk snitt etter ULS. Skal sammenlignes med kapasiteten M_Rd. For fritt opplagt bjelke med jevnt fordelt last: M_Ed = q_Ed · L²/8.",
    nn: "Dimensjonerande moment i kritisk snitt etter ULS. Skal samanliknast med kapasiteten M_Rd. For fritt opplagd bjelke med jamt fordelt last: M_Ed = q_Ed · L²/8.",
  },
  V_Ed: {
    nb: "Dimensjonerende skjær, typisk ved opplegg. Skal sammenlignes med skjærkapasitet V_Rd. For fritt opplagt bjelke: V_Ed = q_Ed · L/2.",
    nn: "Dimensjonerande skjær, typisk ved opplegg. Skal samanliknast med skjærkapasitet V_Rd. For fritt opplagd bjelke: V_Ed = q_Ed · L/2.",
  },
  N_Ed: {
    nb: "Dimensjonerende aksialkraft (trykk eller strekk). For søyler og strekkstaver. Skal sammenlignes med N_Rd. For trykkstaver inkluderer dette knekkpåvirkning via χ-faktor.",
    nn: "Dimensjonerande aksialkraft (trykk eller strekk). For søyler og strekkstaver. Skal samanliknast med N_Rd. For trykkstaver inkluderer dette knekkpåverknad via χ-faktor.",
  },
  q_Ed: {
    nb: "Dimensjonerende designlast per meter etter at karakteristiske laster er multiplisert med partialfaktorer. Forenklet: q_Ed = γ_G · g_k + γ_Q · q_k (1,35·G + 1,5·Q i ULS).",
    nn: "Dimensjonerande designlast per meter etter at karakteristiske laster er multiplisert med partialfaktorar. Forenkla: q_Ed = γ_G · g_k + γ_Q · q_k (1,35·G + 1,5·Q i ULS).",
  },
  // === Kapasitet ===
  M_Rd: {
    nb: "Momentkapasitet i tverrsnittet. For stål: M_Rd = W_pl · f_y / γ_M0 (plastisk). For betong: avhenger av tverrsnitt, materialkvalitet og armeringsmengde. Krav: M_Rd ≥ M_Ed.",
    nn: "Momentkapasitet i tverrsnittet. For stål: M_Rd = W_pl · f_y / γ_M0 (plastisk). For betong: avhenger av tverrsnitt, materialkvalitet og armeringsmengd. Krav: M_Rd ≥ M_Ed.",
  },
  V_Rd: {
    nb: "Skjærkapasitet i tverrsnittet. For stål: V_Rd = A_v · f_y / (γ_M0 · √3). For betong uten skjærarmering: V_Rd,c etter EC2 §6.2.2. Krav: V_Rd ≥ V_Ed.",
    nn: "Skjærkapasitet i tverrsnittet. For stål: V_Rd = A_v · f_y / (γ_M0 · √3). For betong utan skjærarmering: V_Rd,c etter EC2 §6.2.2. Krav: V_Rd ≥ V_Ed.",
  },
  N_Rd: {
    nb: "Aksialkapasitet i tverrsnittet. For sentrisk trykk: N_Rd = χ · A · f_y / γ_M1 (med knekk-reduksjon χ). For strekk: N_Rd = A · f_y / γ_M0. Krav: N_Rd ≥ N_Ed.",
    nn: "Aksialkapasitet i tverrsnittet. For sentrisk trykk: N_Rd = χ · A · f_y / γ_M1 (med knekk-reduksjon χ). For strekk: N_Rd = A · f_y / γ_M0. Krav: N_Rd ≥ N_Ed.",
  },
  // === Armering (EC2) ===
  As_req: {
    nb: "Nødvendig strekkarmering for å motstå dimensjonerende moment. Beregnet fra momentlikevekt med dimensjonerende materialdata. Skal være ≥ A_s,min og ≤ A_s,max. Velg standardprogram (t.d. 4ø16 = 804 mm²) som dekker dette.",
    nn: "Naudsynt strekkarmering for å motstå dimensjonerande moment. Berekna frå momentlikevekt med dimensjonerande materialdata. Skal vere ≥ A_s,min og ≤ A_s,max. Vel standardprogram (t.d. 4ø16 = 804 mm²) som dekker dette.",
  },
  A_s_req: {
    nb: "Nødvendig strekkarmering for å motstå dimensjonerende moment. Beregnet fra momentlikevekt med dimensjonerende materialdata. Skal være ≥ A_s,min og ≤ A_s,max. Velg standardprogram (t.d. 4ø16 = 804 mm²) som dekker dette.",
    nn: "Naudsynt strekkarmering for å motstå dimensjonerande moment. Berekna frå momentlikevekt med dimensjonerande materialdata. Skal vere ≥ A_s,min og ≤ A_s,max. Vel standardprogram (t.d. 4ø16 = 804 mm²) som dekker dette.",
  },
  As_min: {
    nb: "Minimumsarmering etter EC2 §9.2.1.1: A_s,min = max(0,26 · f_ctm/f_yk · b_t · d, 0,0013 · b_t · d). Sikrer duktil oppførsel ved rissdanning og hindrer sprø brudd.",
    nn: "Minimumsarmering etter EC2 §9.2.1.1: A_s,min = max(0,26 · f_ctm/f_yk · b_t · d, 0,0013 · b_t · d). Sikrar duktil oppførsel ved rissdanning og hindrar sprøtt brudd.",
  },
  A_s_min: {
    nb: "Minimumsarmering etter EC2 §9.2.1.1: A_s,min = max(0,26 · f_ctm/f_yk · b_t · d, 0,0013 · b_t · d). Sikrer duktil oppførsel ved rissdanning og hindrer sprø brudd.",
    nn: "Minimumsarmering etter EC2 §9.2.1.1: A_s,min = max(0,26 · f_ctm/f_yk · b_t · d, 0,0013 · b_t · d). Sikrar duktil oppførsel ved rissdanning og hindrar sprøtt brudd.",
  },
  As_max: {
    nb: "Maksimumsarmering etter EC2 §9.2.1.1: A_s,max = 0,04 · A_c. Hindrer at tverrsnittet blir over-armert — over denne grensen er det fare for sprø trykkbrudd i betongen før stålet flytter seg plastisk.",
    nn: "Maksimumsarmering etter EC2 §9.2.1.1: A_s,max = 0,04 · A_c. Hindrar at tverrsnittet blir over-armert — over denne grensa er det fare for sprøtt trykkbrudd i betongen før stålet flyttar seg plastisk.",
  },
  As_valgt: {
    nb: "Faktisk valgt armeringsmengde basert på standardprogram. Skal være ≥ A_s,req og innenfor [A_s,min, A_s,max]. Velg et helt antall stenger med kjente diametre (ø10, ø12, ø16, ø20, ø25, ø32).",
    nn: "Faktisk vald armeringsmengd basert på standardprogram. Skal vere ≥ A_s,req og innanfor [A_s,min, A_s,max]. Vel eit heilt tal stenger med kjende diametrar (ø10, ø12, ø16, ø20, ø25, ø32).",
  },
  As_valt: {
    nb: "Faktisk valgt armeringsmengde basert på standardprogram. Skal være ≥ A_s,req og innenfor [A_s,min, A_s,max]. Velg et helt antall stenger med kjente diametre (ø10, ø12, ø16, ø20, ø25, ø32).",
    nn: "Faktisk vald armeringsmengd basert på standardprogram. Skal vere ≥ A_s,req og innanfor [A_s,min, A_s,max]. Vel eit heilt tal stenger med kjende diametrar (ø10, ø12, ø16, ø20, ø25, ø32).",
  },
  A_s_valgt: {
    nb: "Faktisk valgt armeringsmengde basert på standardprogram. Skal være ≥ A_s,req og innenfor [A_s,min, A_s,max]. Velg et helt antall stenger med kjente diametre (ø10, ø12, ø16, ø20, ø25, ø32).",
    nn: "Faktisk vald armeringsmengd basert på standardprogram. Skal vere ≥ A_s,req og innanfor [A_s,min, A_s,max]. Vel eit heilt tal stenger med kjende diametrar (ø10, ø12, ø16, ø20, ø25, ø32).",
  },
  // === Utnytting og grenseverdiar ===
  mu_Ed: {
    nb: "Relativt moment μ_Ed = M_Ed / (b · d² · f_cd). Dimensjonsløs parameter brukt i armeringsdesign — bestemmer om bjelken er underarmert (μ_Ed < μ_lim) eller om du trenger trykkarmering. Lavere er bedre fra utnyttings-perspektiv.",
    nn: "Relativt moment μ_Ed = M_Ed / (b · d² · f_cd). Dimensjonslaus parameter brukt i armeringsdesign — avgjer om bjelken er underarmert (μ_Ed < μ_lim) eller om du treng trykkarmering. Lågare er betre frå utnyttings-perspektiv.",
  },
  mu_lim: {
    nb: "Grensen for μ_Ed der enkel-armert tverrsnitt (kun strekkarmering) er tilstrekkelig. Avhenger av betong- og stålkvalitet. Over μ_lim må du legge til trykkarmering eller øke tverrsnittsdimensjoner.",
    nn: "Grensa for μ_Ed der enkelt-armert tverrsnitt (only strekkarmering) er tilstrekkeleg. Avhenger av betong- og stålkvalitet. Over μ_lim må du legge til trykkarmering eller auke tverrsnittsdimensjonar.",
  },
  xi_lim: {
    nb: "Grensen for relativ trykksone-høyde ξ = x/d, der x er nøytralaksens dybde. Sikrer duktilitetskrav etter EC2 §5.6.3 (vanligvis ξ_lim ≈ 0,45–0,5). Lavere ξ gir mer duktil oppførsel og varsel før brudd.",
    nn: "Grensa for relativ trykksone-høgd ξ = x/d, der x er nøytralaksens djupne. Sikrar duktilitetskrav etter EC2 §5.6.3 (vanlegvis ξ_lim ≈ 0,45–0,5). Lågare ξ gir meir duktil oppførsel og varsel før brudd.",
  },
  zeta_Ed: {
    nb: "Dimensjonerende utnyttingsgrad — forholdet mellom dimensjonerende påkjenning og kapasitet. Verdier < 1,0 indikerer at tverrsnittet har tilstrekkelig kapasitet. Lavere er bedre, men for lav verdi (< 0,5) kan indikere overdesign.",
    nn: "Dimensjonerande utnyttingsgrad — forholdet mellom dimensjonerande påkjenning og kapasitet. Verdiar < 1,0 indikerer at tverrsnittet har tilstrekkeleg kapasitet. Lågare er betre, men for låg verdi (< 0,5) kan indikere overdesign.",
  },
};

// Hoistar key som matchar STYRANDE_PATTERNS til posisjon 0. Brukast etter
// at tile-keys er valde for å sikre at det fagleg viktigaste (= det
// studenten skal stole på) er den mørke styrande tilen. Stoppar ved
// første match (i agentens rekkefølge) for å vere deterministisk.
export function hoistStyrande(keys: string[]): string[] {
  const styrandeIdx = keys.findIndex((k) =>
    STYRANDE_PATTERNS.some((p) => p.test(k)),
  );
  if (styrandeIdx <= 0) return keys; // allereie først, eller ingen match
  return [keys[styrandeIdx], ...keys.slice(0, styrandeIdx), ...keys.slice(styrandeIdx + 1)];
}

// Fjerner keys som har same verdi som ein tidlegare key. Sikkerheits-net
// mot agent-redundans (t.d. Ed_ULS_styrende og Ed_ULS_dominerende med
// identisk tal). Behaldar første førekomst i rekkjefølga.
export function dedupeByValue(keys: string[], results: Record<string, string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of keys) {
    const v = (results[k] ?? "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(k);
  }
  return out;
}

// === Controller-kort helpers (#02) ===

// Eitt-linjers verdikt frå comparison.match_status. Når comparison manglar
// (Comparator feila), fallbackar kallaren til getFirstSentence på
export function getDimensjonerandeKeys(
  results: Record<string, string> | null | undefined,
  calculationType: string | null,
  resultRoles?: Record<string, string> | null,
): string[] {
  const allKeys = Object.keys(results || {});
  if (allKeys.length === 0) return [];
  const resultsObj = results || {};

  // Steg 0 (FIKS 4): eksplisitt rolle frå konstruktøren. Har konstruktøren
  // tagga minst éin nøkkel som "dimensjonerande", er det fasit — vi gjettar
  // ikkje. Manglar feltet (eldre køyringar) eller er det feilforma, fell vi
  // gjennom til den regelbaserte heuristikken under.
  if (resultRoles && typeof resultRoles === "object") {
    const tagged = allKeys.filter(
      (k) => resultRoles[k] === "dimensjonerande",
    );
    if (tagged.length > 0) {
      return dedupeByValue(hoistStyrande(tagged), resultsObj).slice(0, 5);
    }
  }

  let candidates: string[] = [];

  // Steg 1: Per-oppgåvetype patterns (mest spesifikk)
  if (calculationType && DIMENSJONERANDE_PATTERNS[calculationType]) {
    const patterns = DIMENSJONERANDE_PATTERNS[calculationType];
    candidates = allKeys.filter((k) => patterns.some((p) => p.test(k)));
  }

  // Steg 2: Universell output-pattern — fangar Ed_*/Rd_*/As_* og *_Ed/*_Rd/*_req
  if (candidates.length === 0) {
    candidates = allKeys.filter((k) => OUTPUT_PATTERN.test(k));
  }

  // Steg 3: Filter ut åpenonly inputs frå dei første N keys
  if (candidates.length === 0) {
    candidates = allKeys.filter((k) => !isInputKey(k)).slice(0, 4);
  }

  // Steg 4: Last resort — første 3 keys (ingen heuristikk traff)
  if (candidates.length === 0) {
    candidates = allKeys.slice(0, 3);
  }

  // Etterhandsaming: hoist styrande + dedupe verdi-duplikatar + cap på 5
  return dedupeByValue(hoistStyrande(candidates), resultsObj).slice(0, 5);
}

// Hentar tile-label for ein key. Bruker KEY_TILE_LABELS-mapping om mogleg,
// elles UPPERCASE-konvertering med "_" → " · ".
export function tileLabel(key: string, locale: Locale): string {
  const mapped = KEY_TILE_LABELS[key]?.[locale];
  if (mapped) return mapped;
  return key.toUpperCase().replace(/_/g, " · ");
}

// Splittar verdistreng i tal og eining for tile-typografi. Robust mot
// "10,58 kN/m²", "25,0 kNm", "0,8", "1,5 × 10^-3", "≈ 4,5 kN".
// Når regex ikkje matchar (uvanleg format), returnerer heile strengen som tal
// utan eining — fungerer framleis, only utan visuell hierarki.
export function splitNumberUnit(value: string): { number: string; unit: string } {
  const trimmed = (value ?? "").toString().trim();
  // Forventa form: leiande tal (med komma/punktum/x10^n) + valfri eining
  const match = trimmed.match(
    /^([≈~<>≥≤]?\s*-?[\d.,]+(?:\s*[×x·]\s*10\^?-?\d+)?)\s*(.*)$/,
  );
  if (match) {
    return { number: match[1].trim(), unit: match[2].trim() };
  }
  return { number: trimmed, unit: "" };
}

// === R2 — kontroll-/setning-keys ============================================
// Engineer-agentane legg av og til verdikt-/sjekk-setningar inn i
// `results`-objektet — t.d. key "kapasitetskontroll_y" med verdi
// "OK — 27,3 %", eller "LT_knekking_relevant" med verdi
// "Nei — sentrisk belastet søyle uten bøyemoment".
//
// Slike par høyrer ikkje heime i resultat-tabellen eller verifikasjons-
// tabellen: dei sprenger tal-kolonne-layouten, og den faktiske måleverdien
// finst som regel allereie under ein eigen numerisk key (t.d. `eta_y` for
// utnyttingsgrad). `isSetningResult` detekterer dei so dei kan filtrerast
// vekk før band-bygging.

// Kontroll-aktige key-namn: keyen sjølv røper at det er ei sjekk-rad.
const CONTROL_KEY_PATTERN = /kontroll|relevant|sjekk|verifikasjon/i;

/**
 * Returnerer true om eit (key, value)-par er ei KONTROLL-/SETNING-rad heller
 * enn ein reell måleverdi. Brukast til å filtrere `results` før resultat-
 * og verifikasjonstabellen byggjast.
 *
 * Kriterium — eitt er nok:
 *   - keyen er kontroll-aktig: inneheld "kontroll", "relevant", "sjekk"
 *     eller "verifikasjon"
 *   - verdien inneheld ein ulikskaps-/verdikt-markor: ≥, ≤, ✓, ✗
 *   - verdien har "OK" som eige ord
 *   - verdien er ei lang ordsekvens (≥ 4 alfabetiske ord) — ei setning,
 *     ikkje "tal + eining"
 *
 * Konservativ med vilje: korte tekst-verdiar som "z-z (svak akse)" (2 ord,
 * ingen verdikt-markor) reknast som gyldige resultat og blir verande.
 */
export function isSetningResult(key: string, value: string): boolean {
  if (CONTROL_KEY_PATTERN.test(key)) return true;

  const v = (value ?? "").trim();
  if (!v) return false;

  // Ulikskap eller hake/kryss — ei sjekk-setning, ikkje ein måleverdi.
  if (/[≥≤✓✗]/.test(v)) return true;

  // "OK" som eige ord (verdikt).
  if (/(^|[\s—(-])OK([\s.,)]|$)/i.test(v)) return true;

  // Lang ordsekvens: ≥ 4 alfabetiske ord (≥ 2 bokstavar). Ein måleverdi
  // som "355 N/mm²" eller "z-z (svak akse)" har 0-2 slike ord; ei setning
  // som "Nei — sentrisk belastet søyle uten bøyemoment" har mange.
  const words = v.match(/[A-Za-zÆØÅæøåÄÖäö]{2,}/g) ?? [];
  if (words.length >= 4) return true;

  return false;
}