/**
 * Marginalia-katalog — definisjonar for nøkkelvariablar i berekningsrapporten.
 *
 * Brukast i to kontekstar:
 *   1. Marginalia-kolonna (Fase 4) — viser kort forklaring av variabelen
 *      første gong han dukkar opp i berekninga.
 *   2. "Ikkje rekna"-tabellen (Fase 3) — viser kort omtale av kva kvar
 *      ikkje-rekna storleik ER, ved sida av kvifor han ikkje er rekna.
 *
 * Nøklane skal matche keys frå Engineer-agentane sine `results` og
 * `assumptions`. Greek-prefix (psi/gamma/etc) blir typeset av `renderMathKey`
 * i lib/result/formula-extract — vi treng only lagre kjelde-key her.
 *
 * Lookup-strategi: eksakt match først, så fallback til "head"-key
 * (alt før første underscore + første subscript-segment). T.d. vil
 * "psi_0_kategori_B" først prøve eksakt, så "psi_0", så "psi".
 *
 * Pilot-strategi: hardkoda i frontend. Frå v0.2 kan vi flytte til Agent E.
 */

export type MarginaliaEntry = {
    /** Kort beskrivande tekst (nynorsk). 3-8 ord typisk. */
    description: string;
    /** Engelsk variant. Brukt i intl-modus (eurocode_general, eurocode_uk_na, aisc_asce_aci, ...). */
    descriptionEn?: string;
    /** Eining om relevant (kNm, kN, mm, ...). Brukast i tabellar. */
    unit?: string;
    /** Standard-referanse om relevant ("EC1-1-1", "EC2", "EC3", "AISC360"). */
    standard?: string;
    /** Jurisdiksjons-scope. "norway" = berre relevant for norske koyringar. */
    scope?: "norway";
  };
  
  export const MARGINALIA_KATALOG: Record<string, MarginaliaEntry> = {
    // === Lastfaktorar og kombinasjonsfaktorar (Eurokode-grunnlag) ===
    gamma_G:           { description: "permanent lastfaktor", descriptionEn: "permanent action partial factor", standard: "EC0" },
    gamma_Q:           { description: "variabel lastfaktor", descriptionEn: "variable action partial factor", standard: "EC0" },
    gamma_M:           { description: "materialfaktor", descriptionEn: "material partial factor" },
    gamma_M0:          { description: "materialfaktor, tverrsnittskapasitet", descriptionEn: "material factor, cross-section resistance" },
    gamma_M1:          { description: "materialfaktor, stabilitetskapasitet", descriptionEn: "material factor, stability resistance" },
    gamma_c:           { description: "materialfaktor, betong", descriptionEn: "material factor, concrete" },
    gamma_s:           { description: "materialfaktor, armering", descriptionEn: "material factor, reinforcement" },
    psi_0:             { description: "kombinasjonsfaktor, karakteristisk", descriptionEn: "combination factor, characteristic", standard: "EC0" },
    psi_1:             { description: "hyppig-faktor", descriptionEn: "frequent combination factor", standard: "EC0" },
    psi_2:             { description: "kvasi-permanent-faktor", descriptionEn: "quasi-permanent combination factor", standard: "EC0" },

    // === Krefter og momenter (dimensjonerande) ===
    M_Ed:              { description: "dimensjonerande bøyemoment", descriptionEn: "design bending moment", unit: "kNm" },
    V_Ed:              { description: "dimensjonerande skjærkraft", descriptionEn: "design shear force", unit: "kN" },
    N_Ed:              { description: "dimensjonerande aksialkraft", descriptionEn: "design axial force", unit: "kN" },
    T_Ed:              { description: "dimensjonerande torsjonsmoment", descriptionEn: "design torsional moment", unit: "kNm" },
    E_d:               { description: "dimensjonerande lastvirkning", descriptionEn: "design action effect" },
    E_d_ULS:           { description: "dimensjonerande lastvirkning, bruddgrense", descriptionEn: "design action effect, ULS" },
    E_d_SLS:           { description: "lastvirkning, bruksgrense", descriptionEn: "action effect, SLS" },
    E_d_SLS_kar:       { description: "lastvirkning, karakteristisk kombinasjon", descriptionEn: "action effect, characteristic combination" },
    E_d_SLS_karakteristisk: { description: "lastvirkning, karakteristisk kombinasjon", descriptionEn: "action effect, characteristic combination" },
    E_d_SLS_hyp:       { description: "lastvirkning, hyppig kombinasjon", descriptionEn: "action effect, frequent combination" },
    E_d_SLS_hyppig:    { description: "lastvirkning, hyppig kombinasjon", descriptionEn: "action effect, frequent combination" },
    E_d_SLS_qp:        { description: "lastvirkning, kvasi-permanent kombinasjon", descriptionEn: "action effect, quasi-permanent combination" },
    E_d_SLS_kvasi:     { description: "lastvirkning, kvasi-permanent kombinasjon", descriptionEn: "action effect, quasi-permanent combination" },
    E_d_SLS_kvasi_permanent: { description: "lastvirkning, kvasi-permanent kombinasjon", descriptionEn: "action effect, quasi-permanent combination" },
    Ed:                { description: "dimensjonerande lastvirkning", descriptionEn: "design action effect" },
    Ed_ULS:            { description: "dimensjonerande lastvirkning, bruddgrense", descriptionEn: "design action effect, ULS" },
    Ed_SLS:            { description: "lastvirkning, bruksgrense", descriptionEn: "action effect, SLS" },
    Ed_SLS_kar:        { description: "lastvirkning, karakteristisk kombinasjon", descriptionEn: "action effect, characteristic combination" },
    Ed_SLS_karakteristisk: { description: "lastvirkning, karakteristisk kombinasjon", descriptionEn: "action effect, characteristic combination" },
    Ed_SLS_hyp:        { description: "lastvirkning, hyppig kombinasjon", descriptionEn: "action effect, frequent combination" },
    Ed_SLS_hyppig:     { description: "lastvirkning, hyppig kombinasjon", descriptionEn: "action effect, frequent combination" },
    Ed_SLS_qp:         { description: "lastvirkning, kvasi-permanent kombinasjon", descriptionEn: "action effect, quasi-permanent combination" },
    Ed_SLS_kvasi:      { description: "lastvirkning, kvasi-permanent kombinasjon", descriptionEn: "action effect, quasi-permanent combination" },
    Ed_SLS_kvasi_permanent: { description: "lastvirkning, kvasi-permanent kombinasjon", descriptionEn: "action effect, quasi-permanent combination" },

    // === Acronymer (forkortingar som fungerer som "ord-variablar") ===
    ULS:               { description: "bruddgrensetilstand", descriptionEn: "ultimate limit state", standard: "EC0" },
    SLS:               { description: "bruksgrensetilstand", descriptionEn: "serviceability limit state", standard: "EC0" },
    STR:               { description: "lasttilstand: konstruksjons-styrke", descriptionEn: "design situation: structural resistance" },
    GEO:               { description: "lasttilstand: grunn", descriptionEn: "design situation: geotechnical" },
    EQU:               { description: "lasttilstand: likevekt", descriptionEn: "design situation: equilibrium" },
    FAT:               { description: "lasttilstand: utmatting", descriptionEn: "design situation: fatigue" },
    ACC:               { description: "ulykkes-lasttilstand", descriptionEn: "accidental design situation" },
    NA:                { description: "nasjonalt tillegg (Norge)", descriptionEn: "national annex (Norway)", scope: "norway" },

    // === Kapasitetar ===
    M_Rd:              { description: "dimensjonerande momentkapasitet", descriptionEn: "design moment resistance", unit: "kNm" },
    V_Rd:              { description: "dimensjonerande skjærkapasitet", descriptionEn: "design shear resistance", unit: "kN" },
    N_Rd:              { description: "dimensjonerande aksialkapasitet", descriptionEn: "design axial resistance", unit: "kN" },
    M_pl_Rd:           { description: "plastisk momentkapasitet", descriptionEn: "plastic moment resistance", unit: "kNm", standard: "EC3" },
    V_pl_Rd:           { description: "plastisk skjærkapasitet", descriptionEn: "plastic shear resistance", unit: "kN", standard: "EC3" },
    M_el_Rd:           { description: "elastisk momentkapasitet", descriptionEn: "elastic moment resistance", unit: "kNm" },
    M_b_Rd:            { description: "vippeknekkings-kapasitet", descriptionEn: "lateral-torsional buckling resistance", unit: "kNm", standard: "EC3" },
    N_b_Rd:            { description: "knekkings-kapasitet, aksial", descriptionEn: "flexural buckling resistance, axial", unit: "kN", standard: "EC3" },

    // === Laster ===
    q:                 { description: "fordelt last", descriptionEn: "distributed load", unit: "kN/m" },
    q_Ed:              { description: "dimensjonerande fordelt last", descriptionEn: "design distributed load", unit: "kN/m" },
    q_k:               { description: "karakteristisk fordelt last", descriptionEn: "characteristic distributed load", unit: "kN/m" },
    G_k:               { description: "karakteristisk permanent last", descriptionEn: "characteristic permanent load" },
    Q_k:               { description: "karakteristisk variabel last", descriptionEn: "characteristic variable load" },
    g:                 { description: "eigenvekt", descriptionEn: "self-weight", unit: "kN/m²" },
    P:                 { description: "punktlast", descriptionEn: "point load", unit: "kN" },

    // === Geometri ===
    L:                 { description: "spennvidde", descriptionEn: "span length", unit: "m" },
    L_eff:             { description: "effektiv spennvidde", descriptionEn: "effective span length", unit: "m" },
    h:                 { description: "tverrsnittshøgd", descriptionEn: "section depth", unit: "mm" },
    b:                 { description: "tverrsnittsbreidd", descriptionEn: "section width", unit: "mm" },
    d:                 { description: "effektiv høgd", descriptionEn: "effective depth", unit: "mm" },
    A:                 { description: "tverrsnittsareal", descriptionEn: "cross-sectional area", unit: "mm²" },
    A_s:               { description: "armeringsareal", descriptionEn: "area of reinforcement", unit: "mm²" },
    A_s_req:           { description: "nødvendig armeringsareal", descriptionEn: "required area of reinforcement", unit: "mm²" },
    A_s_min:           { description: "minimumsarmering", descriptionEn: "minimum reinforcement area", unit: "mm²" },
    I:                 { description: "andre arealmoment", descriptionEn: "second moment of area", unit: "mm⁴" },
    W:                 { description: "motstandsmoment", descriptionEn: "section modulus", unit: "mm³" },
    W_pl:              { description: "plastisk motstandsmoment", descriptionEn: "plastic section modulus", unit: "mm³" },
    W_el:              { description: "elastisk motstandsmoment", descriptionEn: "elastic section modulus", unit: "mm³" },
    i:                 { description: "treghetsradius", descriptionEn: "radius of gyration", unit: "mm" },
    x_M_max:           { description: "stad for maks moment", descriptionEn: "location of maximum moment", unit: "m" },

    // === Material — stål ===
    f_y:               { description: "flytespenning, stål", descriptionEn: "yield strength, steel", unit: "N/mm²" },
    f_yk:              { description: "karakteristisk flytespenning", descriptionEn: "characteristic yield strength", unit: "N/mm²" },
    f_yd:              { description: "dimensjonerande flytespenning", descriptionEn: "design yield strength", unit: "N/mm²" },
    f_u:               { description: "strekkfastheit, stål", descriptionEn: "tensile strength, steel", unit: "N/mm²" },
    E:                 { description: "elastisitetsmodul", descriptionEn: "modulus of elasticity", unit: "N/mm²" },
    E_s:               { description: "elastisitetsmodul, armering", descriptionEn: "modulus of elasticity, reinforcement", unit: "N/mm²" },
    EI:                { description: "bøyestivnad", descriptionEn: "flexural rigidity", unit: "Nmm²" },

    // === Material — betong ===
    f_ck:              { description: "karakteristisk trykkfastheit, betong", descriptionEn: "characteristic compressive strength, concrete", unit: "N/mm²" },
    f_cd:              { description: "dimensjonerande trykkfastheit, betong", descriptionEn: "design compressive strength, concrete", unit: "N/mm²" },
    f_ctm:             { description: "middels strekkfastheit, betong", descriptionEn: "mean tensile strength, concrete", unit: "N/mm²" },
    f_ctk:             { description: "karakteristisk strekkfastheit, betong", descriptionEn: "characteristic tensile strength, concrete", unit: "N/mm²" },
    E_cm:              { description: "elastisitetsmodul, betong", descriptionEn: "modulus of elasticity, concrete", unit: "N/mm²" },
    epsilon_cu3:       { description: "tøyningsgrense, betong i trykk", descriptionEn: "ultimate compressive strain, concrete" },
    alpha_cc:          { description: "langtidsfaktor, betong", descriptionEn: "long-term coefficient, concrete" },

    // === Utnyttings- og dimensjoneringsforhold ===
    eta:               { description: "utnyttingsgrad", descriptionEn: "utilisation ratio" },
    mu:                { description: "relativ momentkapasitet", descriptionEn: "relative moment capacity" },
    mu_Ed:             { description: "relativ momentpåkjenning", descriptionEn: "relative moment demand" },
    mu_lim:            { description: "grense for enkeltarmering", descriptionEn: "limit for singly reinforced section" },
    lambda:            { description: "knekklengdeforhold", descriptionEn: "slenderness ratio" },
    lambda_LT:         { description: "vippeknekkings-slankheit", descriptionEn: "lateral-torsional buckling slenderness" },
    chi:               { description: "reduksjonsfaktor, knekking", descriptionEn: "reduction factor, buckling" },
    chi_LT:            { description: "reduksjonsfaktor, vippeknekking", descriptionEn: "reduction factor, lateral-torsional buckling" },

    // === Spenningar og tøyningar ===
    sigma:             { description: "normalspenning", descriptionEn: "normal stress", unit: "N/mm²" },
    sigma_s:           { description: "spenning, armering", descriptionEn: "stress, reinforcement", unit: "N/mm²" },
    sigma_c:           { description: "spenning, betong", descriptionEn: "stress, concrete", unit: "N/mm²" },
    tau:               { description: "skjærspenning", descriptionEn: "shear stress", unit: "N/mm²" },
    epsilon:           { description: "tøyning", descriptionEn: "strain" },
    epsilon_s:         { description: "tøyning, armering", descriptionEn: "strain, reinforcement" },
    epsilon_c:         { description: "tøyning, betong", descriptionEn: "strain, concrete" },

    // === Nedbøying ===
    w:                 { description: "nedbøying", descriptionEn: "deflection", unit: "mm" },
    w_max:             { description: "maksimal nedbøying", descriptionEn: "maximum deflection", unit: "mm" },
    w_lim:             { description: "tillaten nedbøying", descriptionEn: "allowable deflection", unit: "mm" },

    // ============================================================
    // AISC / ASCE / ACI (US) — first draft, treng SME-review
    // ============================================================
    // Keys her produserast av AISC-engineers (LRFD) og kolliderer
    // IKKJE med EC-keys over (M_Ed vs Mu, f_y vs Fy, ...).
    // ============================================================

    // --- Krefter og momenter (factored / required) ---
    Mu:                { description: "påkjent moment (LRFD)", descriptionEn: "required flexural strength (LRFD)", unit: "kip-ft", standard: "AISC360" },
    Vu:                { description: "påkjent skjær (LRFD)", descriptionEn: "required shear strength (LRFD)", unit: "kip", standard: "AISC360" },
    Pu:                { description: "påkjent aksial (LRFD)", descriptionEn: "required axial strength (LRFD)", unit: "kip", standard: "AISC360" },
    Tu:                { description: "påkjent torsjon (LRFD)", descriptionEn: "required torsional strength (LRFD)", unit: "kip-ft", standard: "AISC360" },

    // --- Nominelle kapasitetar ---
    Mn:                { description: "nominell momentkapasitet", descriptionEn: "nominal flexural strength", unit: "kip-ft", standard: "AISC360" },
    Vn:                { description: "nominell skjærkapasitet", descriptionEn: "nominal shear strength", unit: "kip", standard: "AISC360" },
    Pn:                { description: "nominell aksial trykk-kapasitet", descriptionEn: "nominal compressive strength", unit: "kip", standard: "AISC360" },
    Mp:                { description: "plastisk moment (Fy × Zx)", descriptionEn: "plastic moment (Fy × Zx)", unit: "kip-ft", standard: "AISC360" },
    Mr:                { description: "grense for uelastisk vippeknekking", descriptionEn: "limit for inelastic LTB", unit: "kip-ft", standard: "AISC360" },

    // --- Resistansfaktorar (LRFD φ) ---
    phi_b:             { description: "resistansfaktor, bøying", descriptionEn: "resistance factor, flexure (typ. 0.90)", standard: "AISC360" },
    phi_v:             { description: "resistansfaktor, skjær", descriptionEn: "resistance factor, shear (typ. 0.90 or 1.00)", standard: "AISC360" },
    phi_c:             { description: "resistansfaktor, trykk", descriptionEn: "resistance factor, compression (typ. 0.90)", standard: "AISC360" },
    phi_t:             { description: "resistansfaktor, strekk", descriptionEn: "resistance factor, tension (typ. 0.90)", standard: "AISC360" },

    // --- Material (US-konvensjon) ---
    Fy:                { description: "spesifisert flytespenning", descriptionEn: "specified yield stress", unit: "ksi", standard: "AISC360" },
    Fu:                { description: "spesifisert strekkfastheit", descriptionEn: "specified tensile strength", unit: "ksi", standard: "AISC360" },
    Fcr:                { description: "kritisk knekkingsspenning", descriptionEn: "critical buckling stress", unit: "ksi", standard: "AISC360" },
    Fe:                { description: "elastisk knekkingsspenning", descriptionEn: "elastic buckling stress", unit: "ksi", standard: "AISC360" },

    // --- LTB-parametrar (AISC Chapter F) ---
    Lb:                { description: "ustaga lengd", descriptionEn: "unbraced length", unit: "ft", standard: "AISC360" },
    Lp:                { description: "grense, full plastisk kapasitet", descriptionEn: "limit for full plastic capacity (LTB)", unit: "ft", standard: "AISC360" },
    Lr:                { description: "grense, uelastisk LTB", descriptionEn: "limit for inelastic LTB", unit: "ft", standard: "AISC360" },
    Cb:                { description: "vippeknekkings-modifikator", descriptionEn: "LTB modification factor (Cb)", standard: "AISC360" },

    // --- Tverrsnitt (US-konvensjon: Z, S, I, r om x og y) ---
    Zx:                { description: "plastisk motstandsmoment om x", descriptionEn: "plastic section modulus about x-axis", unit: "in³", standard: "AISC360" },
    Zy:                { description: "plastisk motstandsmoment om y", descriptionEn: "plastic section modulus about y-axis", unit: "in³", standard: "AISC360" },
    Sx:                { description: "elastisk motstandsmoment om x", descriptionEn: "elastic section modulus about x-axis", unit: "in³", standard: "AISC360" },
    Sy:                { description: "elastisk motstandsmoment om y", descriptionEn: "elastic section modulus about y-axis", unit: "in³", standard: "AISC360" },
    Ix:                { description: "andre arealmoment om x", descriptionEn: "second moment of area about x-axis", unit: "in⁴", standard: "AISC360" },
    Iy:                { description: "andre arealmoment om y", descriptionEn: "second moment of area about y-axis", unit: "in⁴", standard: "AISC360" },
    rx:                { description: "treghetsradius om x", descriptionEn: "radius of gyration about x-axis", unit: "in", standard: "AISC360" },
    ry:                { description: "treghetsradius om y", descriptionEn: "radius of gyration about y-axis", unit: "in", standard: "AISC360" },
    Ag:                { description: "brutto tverrsnittsareal", descriptionEn: "gross cross-sectional area", unit: "in²", standard: "AISC360" },
    Aw:                { description: "stegareal", descriptionEn: "web area", unit: "in²", standard: "AISC360" },

    // --- Last (ASCE 7) ---
    wu:                { description: "påkjent fordelt last (LRFD)", descriptionEn: "required uniform load (LRFD)", unit: "kip/ft", standard: "ASCE7" },
    D:                 { description: "permanent (dødvekt) last", descriptionEn: "dead load", unit: "kip/ft", standard: "ASCE7" },
    Lload:             { description: "nyttelast", descriptionEn: "live load", unit: "kip/ft", standard: "ASCE7" },
    S:                 { description: "snølast", descriptionEn: "snow load", unit: "kip/ft", standard: "ASCE7" },
    W_wind:            { description: "vindlast", descriptionEn: "wind load", unit: "kip/ft", standard: "ASCE7" },

    // --- Acronymer (US) ---
    LRFD:              { description: "Load and Resistance Factor Design", descriptionEn: "Load and Resistance Factor Design" },
    ASD:               { description: "Allowable Strength Design", descriptionEn: "Allowable Strength Design" },
  };
  
  /**
   * Slå opp eit oppslag for ein key. Returnerer null om ingen match.
   *
   * Strategi:
   *  1. Eksakt match (psi_0_kategori_B → eksakt).
   *  2. Trunkér siste underscore-segment og prøv igjen
   *     (psi_0_kategori_B → psi_0_kategori → psi_0 → psi).
   *  3. Returner null om ingenting matchar.
   */
  export function lookupMarginalia(key: string): MarginaliaEntry | null {
    if (!key) return null;
    if (MARGINALIA_KATALOG[key]) return MARGINALIA_KATALOG[key];
  
    const parts = key.split("_");
    for (let len = parts.length - 1; len >= 1; len--) {
      const candidate = parts.slice(0, len).join("_");
      if (MARGINALIA_KATALOG[candidate]) return MARGINALIA_KATALOG[candidate];
    }
    return null;
  }
  
  /**
   * Skanner ein tekststreng (typisk samanslåtte assumption-strenger) for
   * variabel-referansar og returnerer normaliserte katalog-keys for dei.
   *
   * Pattern som vert oppdaga:
   *   - Unicode greske bokstavar med subscript: γG, γ_G, ψ_0, ψ1, γ_M, σ_c
   *   - Latin lastfaktor-namn med subscript: gamma_G, psi_1
   *   - Karakteristiske last-keys: Gk, G_k, Qk, Q_k (capital + lowercase k/subscript)
   *   - Acronymer i ord-grenser: ULS, SLS, STR, GEO, EQU, FAT, ACC, NA
   *
   * Returnerer only keys som finst i MARGINALIA_KATALOG — pattern-match aleine
   * gir for mange false-positives.
   *
   * Brukast på rapport-sida til å utvide marginalia-coverage frå results-keys
   * åleine til alt som er nemnt i assumption-tekst.
   */
  export function scanTextForCatalogKeys(text: string): string[] {
    if (!text) return [];
  
    // Mapping unicode greske → ASCII katalog-prefiks
    const GREEK_UNICODE_TO_ASCII: Record<string, string> = {
      γ: "gamma",
      ψ: "psi",
      σ: "sigma",
      τ: "tau",
      ε: "epsilon",
      η: "eta",
      λ: "lambda",
      μ: "mu",
      α: "alpha",
      β: "beta",
      θ: "theta",
      ρ: "rho",
      ω: "omega",
      δ: "delta",
      χ: "chi",
      ξ: "xi",
      ν: "nu",
      φ: "phi",
    };
  
    const candidates = new Set<string>();
  
    // 1. Unicode-greek + subscript: γG, γ_G, ψ_0, ψ1, γ_M0
    //    Tillet både underscore-form (γ_G) og samanslått form (γG, ψ1).
    const greekChars = Object.keys(GREEK_UNICODE_TO_ASCII).join("");
    const greekPattern = new RegExp(
      `([${greekChars}])_?([A-Za-z0-9]+)`,
      "g",
    );
    let m: RegExpExecArray | null;
    while ((m = greekPattern.exec(text)) !== null) {
      const asciiPrefix = GREEK_UNICODE_TO_ASCII[m[1]];
      if (asciiPrefix) {
        candidates.add(`${asciiPrefix}_${m[2]}`);
      }
    }
  
    // 2. Latin lastfaktor-namn med subscript: gamma_G, psi_1
    //    Berre ord-prefiks som finst i greek-mapping (forsvar mot tilfeldige matches).
    const latinGreekNames = Object.values(GREEK_UNICODE_TO_ASCII).join("|");
    const latinPattern = new RegExp(
      `\\b(${latinGreekNames})_([A-Za-z0-9]+)`,
      "gi",
    );
    while ((m = latinPattern.exec(text)) !== null) {
      candidates.add(`${m[1].toLowerCase()}_${m[2]}`);
    }
  
    // 3. Karakteristiske last-keys: Gk, Qk, Mk, Vk, Nk, Pk
    //    Match isolerte to-bokstav-keys (kapital + lowercase) i ord-grenser.
    //    Forsvar mot false-positive: only dei bokstavane som er typiske
    //    last-symbol (G, Q, M, V, N, P).
    const cclPattern = /\b([GQMVNP])([kdE][a-z]*)\b/g;
    while ((m = cclPattern.exec(text)) !== null) {
      candidates.add(`${m[1]}_${m[2]}`);
    }
  
    // 4. Acronymer i ord-grenser: ULS, SLS, STR, GEO, EQU, FAT, ACC, NA
    //    Match som standalone-ord (case-insensitive på alfabetiske grenser).
    const acronymPattern = /\b(ULS|SLS|STR|GEO|EQU|FAT|ACC|NA)\b/g;
    while ((m = acronymPattern.exec(text)) !== null) {
      candidates.add(m[1]);
    }
  
    // Filtrer only dei kandidatane som faktisk finst i katalogen (eller har
    // ein fallback-match via lookupMarginalia).
    return Array.from(candidates).filter((k) => lookupMarginalia(k) !== null);
  }

/**
 * Kontekst-filter for ordliste-oppslag. Oppslag merkte `scope: "norway"`
 * (t.d. NA - nasjonalt tillegg) er Norge-spesifikke og skal IKKJE visast i
 * rapportar med engelsk visningsspraak. Andre oppslag er jurisdiksjons-
 * noytrale og blir alltid viste.
 */
export function isMarginaliaRelevantForLanguage(
  entry: MarginaliaEntry,
  displayLanguage: "nb" | "nn" | "en",
): boolean {
  if (entry.scope === "norway" && displayLanguage === "en") return false;
  return true;
}

/**
 * Hent description i riktig språk. Fallback til norsk når descriptionEn
 * manglar. Brukast av ordlista i rapport-sida og marginalia-fragment.
 */
export function pickMarginaliaDescription(
  entry: MarginaliaEntry,
  displayLanguage: "nb" | "nn" | "en",
): string {
  if (displayLanguage === "en" && entry.descriptionEn) return entry.descriptionEn;
  return entry.description;
}
