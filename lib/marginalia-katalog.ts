/**
 * Marginalia-katalog — definisjonar for nøkkelvariablar i berekningsrapporten.
 *
 * Brukast i to kontekstar:
 *   1. Marginalia-kolonna (Fase 4) — viser kort forklaring av variabelen
 *      første gong han dukkar opp i berekninga.
 *   2. "Ikkje rekna"-tabellen (Fase 3) — viser kort omtale av kva kvar
 *      ikkje-rekna storleik ER, ved sida av kvifor han ikkje er rekna.
 *
 * Nøklane skal matche keys frå Konstruktør-agentane sine `results` og
 * `assumptions`. Greek-prefix (psi/gamma/etc) blir typeset av `renderMathKey`
 * i lib/result/formula-extract — vi treng berre lagre kjelde-key her.
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
    /** Eining om relevant (kNm, kN, mm, ...). Brukast i tabellar. */
    unit?: string;
    /** Standard-referanse om relevant ("EC1-1-1", "EC2", "EC3"). */
    standard?: string;
  };
  
  export const MARGINALIA_KATALOG: Record<string, MarginaliaEntry> = {
    // === Lastfaktorar og kombinasjonsfaktorar (Eurokode-grunnlag) ===
    gamma_G:           { description: "permanent lastfaktor", standard: "EC0" },
    gamma_Q:           { description: "variabel lastfaktor", standard: "EC0" },
    gamma_M:           { description: "materialfaktor" },
    gamma_M0:          { description: "materialfaktor, tverrsnittskapasitet" },
    gamma_M1:          { description: "materialfaktor, stabilitetskapasitet" },
    gamma_c:           { description: "materialfaktor, betong" },
    gamma_s:           { description: "materialfaktor, armering" },
    psi_0:             { description: "kombinasjonsfaktor, karakteristisk", standard: "EC0" },
    psi_1:             { description: "hyppig-faktor", standard: "EC0" },
    psi_2:             { description: "kvasi-permanent-faktor", standard: "EC0" },
  
    // === Krefter og momenter (dimensjonerande) ===
    M_Ed:              { description: "dimensjonerande bøyemoment", unit: "kNm" },
    V_Ed:              { description: "dimensjonerande skjærkraft", unit: "kN" },
    N_Ed:              { description: "dimensjonerande aksialkraft", unit: "kN" },
    T_Ed:              { description: "dimensjonerande torsjonsmoment", unit: "kNm" },
    E_d:               { description: "dimensjonerande lastvirkning" },
    E_d_ULS:           { description: "dimensjonerande lastvirkning, bruddgrense" },
    E_d_SLS:           { description: "lastvirkning, bruksgrense" },
    E_d_SLS_kar:       { description: "lastvirkning, karakteristisk kombinasjon" },
    E_d_SLS_karakteristisk: { description: "lastvirkning, karakteristisk kombinasjon" },
    E_d_SLS_hyp:       { description: "lastvirkning, hyppig kombinasjon" },
    E_d_SLS_hyppig:    { description: "lastvirkning, hyppig kombinasjon" },
    E_d_SLS_qp:        { description: "lastvirkning, kvasi-permanent kombinasjon" },
    E_d_SLS_kvasi:     { description: "lastvirkning, kvasi-permanent kombinasjon" },
    E_d_SLS_kvasi_permanent: { description: "lastvirkning, kvasi-permanent kombinasjon" },
    // Agent-konstruktørane brukar ofte samanslått "Ed" i staden for "E_d".
    // Vi listar begge variantane så lookup blir robust mot key-format.
    Ed:                { description: "dimensjonerande lastvirkning" },
    Ed_ULS:            { description: "dimensjonerande lastvirkning, bruddgrense" },
    Ed_SLS:            { description: "lastvirkning, bruksgrense" },
    Ed_SLS_kar:        { description: "lastvirkning, karakteristisk kombinasjon" },
    Ed_SLS_karakteristisk: { description: "lastvirkning, karakteristisk kombinasjon" },
    Ed_SLS_hyp:        { description: "lastvirkning, hyppig kombinasjon" },
    Ed_SLS_hyppig:     { description: "lastvirkning, hyppig kombinasjon" },
    Ed_SLS_qp:         { description: "lastvirkning, kvasi-permanent kombinasjon" },
    Ed_SLS_kvasi:      { description: "lastvirkning, kvasi-permanent kombinasjon" },
    Ed_SLS_kvasi_permanent: { description: "lastvirkning, kvasi-permanent kombinasjon" },
  
    // === Acronymer (forkortingar som fungerer som "ord-variablar") ===
    ULS:               { description: "bruddgrensetilstand", standard: "EC0" },
    SLS:               { description: "bruksgrensetilstand", standard: "EC0" },
    STR:               { description: "lasttilstand: konstruksjons-styrke" },
    GEO:               { description: "lasttilstand: grunn" },
    EQU:               { description: "lasttilstand: likevekt" },
    FAT:               { description: "lasttilstand: utmatting" },
    ACC:               { description: "ulykkes-lasttilstand" },
    NA:                { description: "nasjonalt tillegg (Norge)" },
  
    // === Kapasitetar ===
    M_Rd:              { description: "dimensjonerande momentkapasitet", unit: "kNm" },
    V_Rd:              { description: "dimensjonerande skjærkapasitet", unit: "kN" },
    N_Rd:              { description: "dimensjonerande aksialkapasitet", unit: "kN" },
    M_pl_Rd:           { description: "plastisk momentkapasitet", unit: "kNm", standard: "EC3" },
    V_pl_Rd:           { description: "plastisk skjærkapasitet", unit: "kN", standard: "EC3" },
    M_el_Rd:           { description: "elastisk momentkapasitet", unit: "kNm" },
    M_b_Rd:            { description: "vippeknekkings-kapasitet", unit: "kNm", standard: "EC3" },
    N_b_Rd:            { description: "knekkings-kapasitet, aksial", unit: "kN", standard: "EC3" },
  
    // === Laster ===
    q:                 { description: "fordelt last", unit: "kN/m" },
    q_Ed:              { description: "dimensjonerande fordelt last", unit: "kN/m" },
    q_k:               { description: "karakteristisk fordelt last", unit: "kN/m" },
    G_k:               { description: "karakteristisk permanent last" },
    Q_k:               { description: "karakteristisk variabel last" },
    g:                 { description: "eigenvekt", unit: "kN/m²" },
    P:                 { description: "punktlast", unit: "kN" },
  
    // === Geometri ===
    L:                 { description: "spennvidde", unit: "m" },
    L_eff:             { description: "effektiv spennvidde", unit: "m" },
    h:                 { description: "tverrsnittshøgd", unit: "mm" },
    b:                 { description: "tverrsnittsbreidd", unit: "mm" },
    d:                 { description: "effektiv høgd", unit: "mm" },
    A:                 { description: "tverrsnittsareal", unit: "mm²" },
    A_s:               { description: "armeringsareal", unit: "mm²" },
    A_s_req:           { description: "nødvendig armeringsareal", unit: "mm²" },
    A_s_min:           { description: "minimumsarmering", unit: "mm²" },
    I:                 { description: "andre arealmoment", unit: "mm⁴" },
    W:                 { description: "motstandsmoment", unit: "mm³" },
    W_pl:              { description: "plastisk motstandsmoment", unit: "mm³" },
    W_el:              { description: "elastisk motstandsmoment", unit: "mm³" },
    i:                 { description: "treghetsradius", unit: "mm" },
    x_M_max:           { description: "stad for maks moment", unit: "m" },
  
    // === Material — stål ===
    f_y:               { description: "flytespenning, stål", unit: "N/mm²" },
    f_yk:              { description: "karakteristisk flytespenning", unit: "N/mm²" },
    f_yd:              { description: "dimensjonerande flytespenning", unit: "N/mm²" },
    f_u:               { description: "strekkfastheit, stål", unit: "N/mm²" },
    E:                 { description: "elastisitetsmodul", unit: "N/mm²" },
    E_s:               { description: "elastisitetsmodul, armering", unit: "N/mm²" },
    EI:                { description: "bøyestivnad", unit: "Nmm²" },
  
    // === Material — betong ===
    f_ck:              { description: "karakteristisk trykkfastheit, betong", unit: "N/mm²" },
    f_cd:              { description: "dimensjonerande trykkfastheit, betong", unit: "N/mm²" },
    f_ctm:             { description: "middels strekkfastheit, betong", unit: "N/mm²" },
    f_ctk:             { description: "karakteristisk strekkfastheit, betong", unit: "N/mm²" },
    E_cm:              { description: "elastisitetsmodul, betong", unit: "N/mm²" },
    epsilon_cu3:       { description: "tøyningsgrense, betong i trykk" },
    alpha_cc:          { description: "langtidsfaktor, betong" },
  
    // === Utnyttings- og dimensjoneringsforhold ===
    eta:               { description: "utnyttingsgrad" },
    mu:                { description: "relativ momentkapasitet" },
    mu_Ed:             { description: "relativ momentpåkjenning" },
    mu_lim:            { description: "grense for enkeltarmering" },
    lambda:            { description: "knekklengdeforhold" },
    lambda_LT:         { description: "vippeknekkings-slankheit" },
    chi:               { description: "reduksjonsfaktor, knekking" },
    chi_LT:            { description: "reduksjonsfaktor, vippeknekking" },
  
    // === Spenningar og tøyningar ===
    sigma:             { description: "normalspenning", unit: "N/mm²" },
    sigma_s:           { description: "spenning, armering", unit: "N/mm²" },
    sigma_c:           { description: "spenning, betong", unit: "N/mm²" },
    tau:               { description: "skjærspenning", unit: "N/mm²" },
    epsilon:           { description: "tøyning" },
    epsilon_s:         { description: "tøyning, armering" },
    epsilon_c:         { description: "tøyning, betong" },
  
    // === Nedbøying ===
    w:                 { description: "nedbøying", unit: "mm" },
    w_max:             { description: "maksimal nedbøying", unit: "mm" },
    w_lim:             { description: "tillaten nedbøying", unit: "mm" },
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
   * Returnerer berre keys som finst i MARGINALIA_KATALOG — pattern-match aleine
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
    //    Forsvar mot false-positive: berre dei bokstavane som er typiske
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
  
    // Filtrer berre dei kandidatane som faktisk finst i katalogen (eller har
    // ein fallback-match via lookupMarginalia).
    return Array.from(candidates).filter((k) => lookupMarginalia(k) !== null);
  }