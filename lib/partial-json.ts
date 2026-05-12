/**
 * Trekk ut delvis JSON-struktur frå akkumulerte tekst-deltaer.
 * 
 * Brukar regex-matching i staden for full JSON-parsing — vi treng berre
 * å vite KVA STEG som har ferdig-skrivne "title"-felt, og KVA RESULTS som
 * er ferdig sett. Inkomplette strenger blir ikkje matcha fordi closing-
 * quote manglar — det gir oss "alt-eller-ingenting" per felt utan flashing.
 */

export type StreamingExtraction = {
    /** Titlar på calculation_steps som har fullført "title"-feltet. */
    stepTitles: string[];
    /** Results-objekt der nøkkel/verdi-par er fullt skrivne. */
    results: Record<string, string>;
  };
  
  function unescapeJsonString(s: string): string {
    return s
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  
  const TITLE_REGEX = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  const KEYVAL_REGEX = /"([^"\\]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  
  export function extractStreamingState(text: string): StreamingExtraction {
    const stepTitles: string[] = [];
    const results: Record<string, string> = {};
  
    // calculation_steps-arrayen
    const stepsStart = text.indexOf('"calculation_steps"');
    if (stepsStart >= 0) {
      const stepsText = text.slice(stepsStart);
      const arrayEnd = findClosingBracket(stepsText, "[", "]");
      const inside = arrayEnd > 0 ? stepsText.slice(0, arrayEnd) : stepsText;
  
      TITLE_REGEX.lastIndex = 0;
      let m;
      while ((m = TITLE_REGEX.exec(inside)) !== null) {
        stepTitles.push(unescapeJsonString(m[1]));
      }
    }
  
    // results-objektet
    const resultsStart = text.indexOf('"results"');
    if (resultsStart >= 0) {
      const resultsText = text.slice(resultsStart);
      const objEnd = findClosingBracket(resultsText, "{", "}");
      const inside = objEnd > 0 ? resultsText.slice(0, objEnd) : resultsText;
  
      KEYVAL_REGEX.lastIndex = 0;
      let m;
      // Hopp over første treff — det er "results" sjølv
      let isFirst = true;
      while ((m = KEYVAL_REGEX.exec(inside)) !== null) {
        if (isFirst && m[1] === "results") {
          isFirst = false;
          continue;
        }
        isFirst = false;
        results[m[1]] = unescapeJsonString(m[2]);
      }
    }
  
    return { stepTitles, results };
  }
  
  /**
   * Finn index for closing-bracket som balanserer første opning.
   * Returnerer -1 viss closing ikkje finst enno (mid-stream).
   * Tek omsyn til strenger — innhold mellom "..." blir ignorert.
   */
  function findClosingBracket(text: string, open: string, close: string): number {
    let depth = 0;
    let inString = false;
    let escape = false;
    let started = false;
  
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\" && inString) {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
  
      if (c === open) {
        depth++;
        started = true;
      } else if (c === close) {
        depth--;
        if (started && depth === 0) return i + 1;
      }
    }
    return -1;
  }