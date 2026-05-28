/**
 * Deterministisk samanlikning av to konstruktør-resultatsett.
 *
 * Same rolle for Comparator (agent_c) som load-combination.ts har for
 * Controller: taljamføringa skal reknast i kode, ikkje av ein språkmodell.
 * Ein LLM som «samanliknar» tal kan finne på semje på ein nøkkel only éin
 * konstruktør rapporterte (F1), eller behandle avrundingsformat ulikt (F9).
 *
 * Funksjonen parar nøklar på tvers av skrivemåte-variantar (F_Ed,6.10a vs
 * F_Ed_6_10a), reknar eit ekte relativt avvik for kvar para nøkkel, og
 * skil ut nøklar only éin side rapporterte. Rein, sideeffektfri.
 *
 * Sprint B (unit-aware): når begge sider oppgjev verdiar med kompatible
 * einingar (cm³ + mm³, MPa + N/mm², kN + N, ...) blir verdiane normalisert
 * til kanonisk eining før avvik blir rekna. Stoppar falske 99,9 %-flagg
 * når Engineer A skriv "623 cm³" og Engineer B skriv "623000 mm³".
 */

/**
 * Greek-symbol → ASCII-namn, så «γ_M0» og «gamma_M0» normaliserer likt.
 * Dekker små greske bokstavar (U+03B1–U+03C9 inkl. final sigma ς),
 * mikroteiknet µ (U+00B5) og phi-symbolet ϕ (U+03D5). Berre SYMBOL → namn
 * (ikkje omvendt), så ASCII-namn som alt finst i nøkkelen står uendra.
 */
const GREEK_TO_ASCII: Record<string, string> = {
  "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "ε": "epsilon",
  "ζ": "zeta", "η": "eta", "θ": "theta", "ι": "iota", "κ": "kappa",
  "λ": "lambda", "μ": "mu", "µ": "mu", "ν": "nu", "ξ": "xi",
  "ο": "omicron", "π": "pi", "ρ": "rho", "ς": "sigma", "σ": "sigma",
  "τ": "tau", "υ": "upsilon", "φ": "phi", "ϕ": "phi", "χ": "chi",
  "ψ": "psi", "ω": "omega",
};

/**
 * Normaliser ein result-nøkkel for paring: små bokstavar, mapp greek-symbol
 * til ASCII-namn (γ → gamma), og fjern skiljeteikn + grupperingsteikn
 * (mellomrom, komma, punktum, understrek, bindestrek, parentesar). Slik blir
 * "F_Ed,6.10a", "F_Ed_6_10a", "M_{Ed}" og "γ_M0"/"gamma_M0" same nøkkel.
 *
 * Konservativ med vilje — fjernar berre skiljeteikn/grupperingsteikn og
 * mappar symbol→namn, ikkje bokstavar/tal — så distinkte nøklar (M_Ed vs
 * M_Rd, gamma_G vs gamma_Q) held seg distinkte.
 */
export function normalizeResultKey(key: string): string {
  return key
    .toLowerCase()
    // Greek-symbol → ASCII-namn (γ → gamma) FØR skiljeteikn blir fjerna,
    // så symbol-form og namn-form kolliderer.
    .replace(/[µα-ωϕ]/g, (ch) => GREEK_TO_ASCII[ch] ?? ch)
    // Fjern skiljeteikn + grupperingsteikn: mellomrom, komma, punktum,
    // understrek, bindestrek, runde/krøll/hakeparentesar.
    .replace(/[\s,._(){}\[\]-]/g, "");
}

  /** Parse tal frå streng med norsk komma ("22,9"), eining-suffiks, eller eit tal. */
  export function parseNumeric(v: unknown): number | null {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v !== "string") return null;
    const m = v.replace(",", ".").match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  // ─────────────────────────────────────────────────────────────
  //  Sprint B — eining-normalisering
  // ─────────────────────────────────────────────────────────────

  /** Tal + (valfri) eining, parsa frå ein verdistreng. */
  export type ValueWithUnit = { value: number; unit: string | null };

  /** Familie-grupperingar — verdiar i same familie kan samanliknast. */
  export type UnitFamily =
    | "length"
    | "area"
    | "volume_or_section_modulus"
    | "second_moment_of_area"
    | "force"
    | "moment"
    | "stress"
    | "load_per_length"
    | "load_per_area";

  type UnitInfo = {
    family: UnitFamily;
    /** Faktor for å konvertere til kanonisk eining for familien. */
    toCanonical: number;
    /** Kanonisk eining-streng (informativ; ikkje rendra her). */
    canonicalUnit: string;
  };

  /**
   * Eining-oppslag. Følgjer engineering-konvensjon: kanonisk eining er
   * minste-grad-i-SI (mm, N, ...). Verdiar henta frå "byggingeniørar reknar
   * vanlegvis i": stål/betong-prosjektering bruker mm/N/MPa, ikkje m/N.
   *
   * Ikkje uttømmande — utvidast etter behov når nye einingar dukkar opp.
   * Ukjende einingar fell trygt tilbake til rå-tal-samanlikning.
   */
  export const UNIT_TABLE: Record<string, UnitInfo> = {
    // Length → mm
    "mm": { family: "length", toCanonical: 1, canonicalUnit: "mm" },
    "cm": { family: "length", toCanonical: 10, canonicalUnit: "mm" },
    "m":  { family: "length", toCanonical: 1000, canonicalUnit: "mm" },

    // Area → mm²
    "mm²": { family: "area", toCanonical: 1, canonicalUnit: "mm²" },
    "mm2": { family: "area", toCanonical: 1, canonicalUnit: "mm²" },
    "cm²": { family: "area", toCanonical: 100, canonicalUnit: "mm²" },
    "cm2": { family: "area", toCanonical: 100, canonicalUnit: "mm²" },
    "m²":  { family: "area", toCanonical: 1e6, canonicalUnit: "mm²" },
    "m2":  { family: "area", toCanonical: 1e6, canonicalUnit: "mm²" },

    // Section modulus / volume → mm³
    "mm³": { family: "volume_or_section_modulus", toCanonical: 1, canonicalUnit: "mm³" },
    "mm3": { family: "volume_or_section_modulus", toCanonical: 1, canonicalUnit: "mm³" },
    "cm³": { family: "volume_or_section_modulus", toCanonical: 1000, canonicalUnit: "mm³" },
    "cm3": { family: "volume_or_section_modulus", toCanonical: 1000, canonicalUnit: "mm³" },
    "m³":  { family: "volume_or_section_modulus", toCanonical: 1e9, canonicalUnit: "mm³" },
    "m3":  { family: "volume_or_section_modulus", toCanonical: 1e9, canonicalUnit: "mm³" },

    // Second moment of area → mm⁴
    "mm⁴": { family: "second_moment_of_area", toCanonical: 1, canonicalUnit: "mm⁴" },
    "mm4": { family: "second_moment_of_area", toCanonical: 1, canonicalUnit: "mm⁴" },
    "cm⁴": { family: "second_moment_of_area", toCanonical: 1e4, canonicalUnit: "mm⁴" },
    "cm4": { family: "second_moment_of_area", toCanonical: 1e4, canonicalUnit: "mm⁴" },
    "m⁴":  { family: "second_moment_of_area", toCanonical: 1e12, canonicalUnit: "mm⁴" },
    "m4":  { family: "second_moment_of_area", toCanonical: 1e12, canonicalUnit: "mm⁴" },

    // Force → N
    "N":   { family: "force", toCanonical: 1, canonicalUnit: "N" },
    "kN":  { family: "force", toCanonical: 1000, canonicalUnit: "N" },
    "MN":  { family: "force", toCanonical: 1e6, canonicalUnit: "N" },

    // Moment → Nm
    "Nm":   { family: "moment", toCanonical: 1, canonicalUnit: "Nm" },
    "Nmm":  { family: "moment", toCanonical: 0.001, canonicalUnit: "Nm" },
    "kNm":  { family: "moment", toCanonical: 1000, canonicalUnit: "Nm" },
    "kNmm": { family: "moment", toCanonical: 1, canonicalUnit: "Nm" }, // 1 kN·mm = 1000 N · 0.001 m = 1 Nm

    // Stress → N/mm² (= MPa, the engineering canonical for steel/concrete)
    "N/mm²": { family: "stress", toCanonical: 1, canonicalUnit: "N/mm²" },
    "N/mm2": { family: "stress", toCanonical: 1, canonicalUnit: "N/mm²" },
    "MPa":   { family: "stress", toCanonical: 1, canonicalUnit: "N/mm²" },
    "GPa":   { family: "stress", toCanonical: 1000, canonicalUnit: "N/mm²" },
    "Pa":    { family: "stress", toCanonical: 1e-6, canonicalUnit: "N/mm²" },
    "kPa":   { family: "stress", toCanonical: 1e-3, canonicalUnit: "N/mm²" },

    // Distributed load on a beam → N/m
    "N/m":   { family: "load_per_length", toCanonical: 1, canonicalUnit: "N/m" },
    "kN/m":  { family: "load_per_length", toCanonical: 1000, canonicalUnit: "N/m" },
    "kN/mm": { family: "load_per_length", toCanonical: 1e6, canonicalUnit: "N/m" },

    // Distributed load on an area → N/m²
    "N/m²":  { family: "load_per_area", toCanonical: 1, canonicalUnit: "N/m²" },
    "N/m2":  { family: "load_per_area", toCanonical: 1, canonicalUnit: "N/m²" },
    "kN/m²": { family: "load_per_area", toCanonical: 1000, canonicalUnit: "N/m²" },
    "kN/m2": { family: "load_per_area", toCanonical: 1000, canonicalUnit: "N/m²" },
  };

  const SUPERSCRIPT_DIGIT: Record<string, string> = {
    "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
    "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
    "⁻": "-",
  };

  function parseSuperscriptInt(s: string): number | null {
    let buf = "";
    for (const ch of s) {
      const d = SUPERSCRIPT_DIGIT[ch];
      if (d === undefined) return null;
      buf += d;
    }
    const n = parseInt(buf, 10);
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Parse tal med valfri eining og valfri vitskapleg notasjon.
   *
   * Toler:
   *  - rein tal:                "623", "1,020", "8.5"
   *  - tal + eining:            "22,88 kN/m", "623 cm³"
   *  - e-notasjon:              "8.5e7 mm⁴", "1.2e-3 m"
   *  - × 10^N (kvadrant-tekst): "85.00 × 10⁶ mm⁴", "85 * 10^6 mm⁴"
   *
   * Returnerer null når strengen ikkje begynner med eit tal.
   * Einings-feltet er rå-trimma — UNIT_TABLE-oppslag handterer kanonisering.
   */
  export function parseNumericWithUnit(v: unknown): ValueWithUnit | null {
    if (typeof v === "number") {
      return Number.isFinite(v) ? { value: v, unit: null } : null;
    }
    if (typeof v !== "string") return null;

    const s = v.replace(",", ".").trim();
    if (!s) return null;

    // Forsøk: superskript-eksponent ("85.00 × 10⁶ mm⁴")
    let m = s.match(/^(-?\d+(?:\.\d+)?)\s*[×x*]\s*10\s*([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*(.*)$/);
    if (m) {
      const exp = parseSuperscriptInt(m[2]);
      if (exp !== null) {
        const value = parseFloat(m[1]) * Math.pow(10, exp);
        if (Number.isFinite(value)) {
          return { value, unit: m[3].trim() || null };
        }
      }
    }

    // Forsøk: caret-eksponent ("85 * 10^6 mm⁴" eller "85 × 10^6 mm⁴")
    m = s.match(/^(-?\d+(?:\.\d+)?)\s*[×x*]\s*10\s*\^?\s*(-?\d+)\s*(.*)$/);
    if (m) {
      const value = parseFloat(m[1]) * Math.pow(10, parseInt(m[2], 10));
      if (Number.isFinite(value)) {
        return { value, unit: m[3].trim() || null };
      }
    }

    // Forsøk: e-notasjon ("8.5e7 mm⁴")
    m = s.match(/^(-?\d+(?:\.\d+)?)[eE]([+-]?\d+)\s*(.*)$/);
    if (m) {
      const value = parseFloat(m[1]) * Math.pow(10, parseInt(m[2], 10));
      if (Number.isFinite(value)) {
        return { value, unit: m[3].trim() || null };
      }
    }

    // Vanleg tal + valfri eining
    m = s.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
    if (m) {
      const value = parseFloat(m[1]);
      if (Number.isFinite(value)) {
        return { value, unit: m[2].trim() || null };
      }
    }

    return null;
  }

  /**
   * Konverter parsa verdi til kanonisk eining for familien.
   * Returnerer null når eininga manglar eller ikkje er i UNIT_TABLE.
   */
  function toCanonical(vu: ValueWithUnit | null):
    | { value: number; family: UnitFamily }
    | null {
    if (!vu || vu.unit === null) return null;
    const info = UNIT_TABLE[vu.unit];
    if (!info) return null;
    return { value: vu.value * info.toCanonical, family: info.family };
  }

  /** Eitt para felt — rapportert av BEGGE engineers. */
  export type PairedDifference = {
    /** Engineer A si skrivemåte av nøkkelen (kanonisk for visning). */
    key: string;
    /** Rå verdi frå Engineer A and Engineer B (slik konstruktøren skreiv dei). */
    aValue: string;
    bValue: string;
    /** Parsa talverdiar, eller null når verdien ikkje er numerisk. */
    aNum: number | null;
    bNum: number | null;
    /**
     * Relativt avvik i prosent: |a-b| / max(|a|,|b|) · 100.
     * null når minst éin verdi ikkje er numerisk. 0 når begge er 0.
     * Sprint B: rekna på kanonisk-konverterte verdiar når begge sider har
     * kompatible einingar (cm³ + mm³ → mm³). Elles på rå-tal.
     */
    percentDiff: number | null;
  };

  export type ResultComparison = {
    /** Nøklar rapportert av begge — med ekte, kode-rekna avvik. */
    paired: PairedDifference[];
    /** Nøklar only Engineer A rapporterte (A si skrivemåte). */
    onlyA: string[];
    /** Nøklar only Engineer B rapporterte (B si skrivemåte). */
    onlyB: string[];
  };

  /**
   * Comparator to results-objekt deterministisk.
   *
   * Para nøklar får eit ekte relativt avvik. Nøklar only éin side rapporterte
   * hamnar i onlyA / onlyB — dei er IKKJE avvik, og skal aldri presenterast som
   * «0,0 % semje». Degraderer trygt på null/udefinert input (tomt resultat).
   */
  export function compareResults(
    aResults: Record<string, string> | null | undefined,
    bResults: Record<string, string> | null | undefined,
  ): ResultComparison {
    const a = aResults && typeof aResults === "object" ? aResults : {};
    const b = bResults && typeof bResults === "object" ? bResults : {};

    // Normalisert oppslag: normKey -> original key. Fyrste førekomst vinn.
    const bByNorm = new Map<string, string>();
    for (const k of Object.keys(b)) {
      const n = normalizeResultKey(k);
      if (!bByNorm.has(n)) bByNorm.set(n, k);
    }

    const paired: PairedDifference[] = [];
    const onlyA: string[] = [];
    const seenNorm = new Set<string>();

    for (const aKey of Object.keys(a)) {
      const n = normalizeResultKey(aKey);
      seenNorm.add(n);
      const bKey = bByNorm.get(n);
      if (bKey === undefined) {
        onlyA.push(aKey);
        continue;
      }
      const aValue = String(a[aKey] ?? "");
      const bValue = String(b[bKey] ?? "");
      const aNum = parseNumeric(aValue);
      const bNum = parseNumeric(bValue);
      let percentDiff: number | null = null;

      if (aNum !== null && bNum !== null) {
        // Sprint B — prøv eining-normalisering først. Same familie og begge
        // einingar i UNIT_TABLE => konverter til kanonisk og rekn der.
        // Elles fall trygt tilbake til rå-tal (eksisterande åtferd).
        const aCanon = toCanonical(parseNumericWithUnit(aValue));
        const bCanon = toCanonical(parseNumericWithUnit(bValue));
        const useCanon =
          aCanon !== null && bCanon !== null && aCanon.family === bCanon.family;

        const aFinal = useCanon ? aCanon.value : aNum;
        const bFinal = useCanon ? bCanon.value : bNum;
        const denom = Math.max(Math.abs(aFinal), Math.abs(bFinal));
        percentDiff = denom === 0 ? 0 : (Math.abs(aFinal - bFinal) / denom) * 100;
      }

      paired.push({ key: aKey, aValue, bValue, aNum, bNum, percentDiff });
    }

    const onlyB: string[] = [];
    for (const bKey of Object.keys(b)) {
      if (!seenNorm.has(normalizeResultKey(bKey))) onlyB.push(bKey);
    }

    return { paired, onlyA, onlyB };
  }
