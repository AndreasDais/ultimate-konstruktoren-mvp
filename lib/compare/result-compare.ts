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
 */

/**
 * Normaliser ein result-nøkkel for paring: små bokstavar, og fjern
 * mellomrom, komma, punktum, underscore og bindestrek. Slik blir
 * "F_Ed,6.10a", "F_Ed_6_10a" og "FEd6.10a" same nøkkel.
 *
 * Konservativ med vilje — fjernar only skiljeteikn, ikkje bokstavar/tal —
 * så distinkte nøklar (M_Ed vs M_Rd, gamma_G vs gamma_Q) held seg distinkte.
 */
export function normalizeResultKey(key: string): string {
    return key.toLowerCase().replace(/[\s,._-]/g, "");
  }
  
  /** Parse tal frå streng med norsk komma ("22,9"), eining-suffiks, eller eit tal. */
  export function parseNumeric(v: unknown): number | null {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v !== "string") return null;
    const m = v.replace(",", ".").match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
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
        const denom = Math.max(Math.abs(aNum), Math.abs(bNum));
        percentDiff = denom === 0 ? 0 : (Math.abs(aNum - bNum) / denom) * 100;
      }
      paired.push({ key: aKey, aValue, bValue, aNum, bNum, percentDiff });
    }
  
    const onlyB: string[] = [];
    for (const bKey of Object.keys(b)) {
      if (!seenNorm.has(normalizeResultKey(bKey))) onlyB.push(bKey);
    }
  
    return { paired, onlyA, onlyB };
  }