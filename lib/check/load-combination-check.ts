/**
 * Deterministisk kombinasjonsstruktur-sjekk for Kontrollør (agent_d).
 *
 * Re-reknar STR-lastkombinasjonen (6.10a/6.10b) frå Tolkar sine strukturerte
 * laster via load-combination.ts, og samanliknar mot den dimensjonerande
 * verdien Ed_dim kvar konstruktør rapporterte. Fangar A2-klassen: ekv. 6.10
 * utkledd som «6.10a» — der partialfaktorane er rette kvar for seg, men
 * formelstrukturen er feil.
 *
 * Degraderer trygt: manglar eller er feilforma input, returnerer funksjonen
 * tom liste og loggar. Han kastar aldri og stoppar aldri pipelinen.
 */

import {
    computeStrCombination,
    type CombinationInput,
    type LoadCategory,
  } from "@/lib/calc/load-combination";
  
  /** Relativ toleranse — rein aritmetikk, same nivå som A0 (±2 %). */
  export const LOAD_COMBO_TOLERANCE = 0.02;
  
  export type LoadComboDeviation = {
    agent: "A" | "B";
    /** Ed_dim konstruktøren rapporterte. */
    reported: number;
    /** Korrekt dimensjonerande verdi, deterministisk rekna. */
    correct: number;
    /** Styrande likning i den korrekte utrekninga. */
    governingEq: "6.10a" | "6.10b";
    /** Leiande variabel-last for 6.10b, elles null. */
    leadingLoad: string | null;
  };
  
  /** Parse tal frå streng med norsk komma ("22,9"), eining-suffiks, eller eit tal. */
  function parseNum(v: unknown): number | null {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v !== "string") return null;
    const m = v.replace(",", ".").match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }
  
  type TolkarLoadInput = {
    permanent?: Array<{ name?: string; value?: unknown }>;
    variable?: Array<{ name?: string; value?: unknown; category?: unknown }>;
  };
  
  /**
   * Sjekkar STR-lastkombinasjonen til begge konstruktørar mot ei deterministisk
   * re-rekning. Returnerer eitt avvik per konstruktør som bommar.
   *
   * Køyrer berre når calculation_type === "lastkombinasjon" og Tolkar leverte
   * lastkombinasjon_input. Elles — eller ved feilforma input — tom liste.
   */
  export function checkLoadCombination(
    input_review: unknown,
    agent_a_output: unknown,
    agent_b_output: unknown,
  ): LoadComboDeviation[] {
    const review = input_review as {
      calculation_type?: unknown;
      lastkombinasjon_input?: unknown;
    } | null;
  
    if (!review || review.calculation_type !== "lastkombinasjon") return [];
  
    const raw = review.lastkombinasjon_input;
    if (!raw || typeof raw !== "object") {
      console.warn(
        "[load-combination-check] calculation_type=lastkombinasjon utan " +
          "lastkombinasjon_input — strukturkontroll hoppa over.",
      );
      return [];
    }
  
    // Map Tolkar sitt format til modulen sitt CombinationInput. parseNum toler
    // norsk komma og eining-suffiks; ugyldige tal blir NaN → computeStrCombination
    // kastar → fanga under (degradering, ikkje krasj).
    let designValue: number;
    let governingEq: "6.10a" | "6.10b";
    let leadingLoad: string | null;
    try {
      const r = raw as TolkarLoadInput;
      const combinationInput: CombinationInput = {
        permanent: (r.permanent ?? []).map((g) => ({
          name: g?.name,
          value: parseNum(g?.value) ?? NaN,
        })),
        variable: (r.variable ?? []).map((q) => ({
          name: q?.name,
          value: parseNum(q?.value) ?? NaN,
          category: q?.category as LoadCategory,
        })),
      };
      const result = computeStrCombination(combinationInput);
      designValue = result.designValue;
      governingEq = result.governing.equation;
      leadingLoad = result.governing.leadingLoad;
    } catch (err) {
      console.warn(
        "[load-combination-check] kunne ikkje re-rekne lastkombinasjon — " +
          "strukturkontroll hoppa over:",
        err,
      );
      return [];
    }
  
    const deviations: LoadComboDeviation[] = [];
    const checkAgent = (output: unknown, agent: "A" | "B") => {
      const results = (output as { results?: Record<string, unknown> })?.results;
      if (!results || typeof results !== "object") return;
      if (!("Ed_dim" in results)) return; // nøkkelen ikkje rapportert
      const reported = parseNum((results as Record<string, unknown>).Ed_dim);
      if (reported === null) return;
      const relDiff = Math.abs(reported - designValue) / designValue;
      if (relDiff > LOAD_COMBO_TOLERANCE) {
        deviations.push({ agent, reported, correct: designValue, governingEq, leadingLoad });
      }
    };
    checkAgent(agent_a_output, "A");
    checkAgent(agent_b_output, "B");
  
    return deviations;
  }
  