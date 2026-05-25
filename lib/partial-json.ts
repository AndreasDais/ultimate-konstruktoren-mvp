/**
 * Trekk ut delvis JSON-struktur frå akkumulerte tekst-deltaer under streaming.
 * 
 * Regex-basert i staden for full JSON-parsing — vi treng only å vite kva
 * felt som har FERDIG-skrivne verdiar. Inkomplette strenger blir ikkje matcha
 * fordi closing-quote manglar, så vi får "alt-eller-ingenting" per felt
 * utan flashing av halvferdige tekstar.
 * 
 * Eksporterer både Mission Control-extractor (calculation_steps + results)
 * og Tolkar-extractor (alle top-level felt).
 */

// === Felles helpers ===

function unescapeJsonString(s: string): string {
    return s
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  
  function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  
  // === Generiske felt-extractorar ===
  
  function extractStringOrNullField(text: string, fieldName: string): string | null {
    const strRegex = new RegExp(
      `"${escapeRegex(fieldName)}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`
    );
    const strMatch = strRegex.exec(text);
    if (strMatch) return unescapeJsonString(strMatch[1]);
  
    const nullRegex = new RegExp(`"${escapeRegex(fieldName)}"\\s*:\\s*null\\b`);
    if (nullRegex.test(text)) return null;
  
    return null;
  }
  
  function extractNumberField(text: string, fieldName: string): number | null {
    const regex = new RegExp(
      `"${escapeRegex(fieldName)}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`
    );
    const m = regex.exec(text);
    return m ? parseFloat(m[1]) : null;
  }
  
  function extractStringArray(text: string, fieldName: string): string[] {
    const fieldRegex = new RegExp(`"${escapeRegex(fieldName)}"\\s*:`);
    const fieldMatch = fieldRegex.exec(text);
    if (!fieldMatch) return [];
  
    const afterField = text.slice(fieldMatch.index + fieldMatch[0].length);
    const arrStart = afterField.indexOf("[");
    if (arrStart < 0) return [];
  
    const arrContent = afterField.slice(arrStart);
    const arrEnd = findClosingBracket(arrContent, "[", "]");
    const inside = arrEnd > 0 ? arrContent.slice(0, arrEnd) : arrContent;
  
    const items: string[] = [];
    const itemRegex = /"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = itemRegex.exec(inside)) !== null) {
      items.push(unescapeJsonString(m[1]));
    }
    return items;
  }
  
  function extractStringObject(text: string, fieldName: string): Record<string, string> {
    const fieldRegex = new RegExp(`"${escapeRegex(fieldName)}"\\s*:`);
    const fieldMatch = fieldRegex.exec(text);
    if (!fieldMatch) return {};
  
    const afterField = text.slice(fieldMatch.index + fieldMatch[0].length);
    const objStart = afterField.indexOf("{");
    if (objStart < 0) return {};
  
    const objContent = afterField.slice(objStart);
    const objEnd = findClosingBracket(objContent, "{", "}");
    const inside = objEnd > 0 ? objContent.slice(0, objEnd) : objContent;
  
    const result: Record<string, string> = {};
    const keyValRegex = /"([^"\\]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = keyValRegex.exec(inside)) !== null) {
      result[m[1]] = unescapeJsonString(m[2]);
    }
    return result;
  }
  
  // === MISSION CONTROL: calculation_steps + results ===
  
  export type StreamingExtraction = {
    stepTitles: string[];
    results: Record<string, string>;
  };
  
  const TITLE_REGEX = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  
  export function extractStreamingState(text: string): StreamingExtraction {
    const stepTitles: string[] = [];
  
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
  
    const results = extractStringObject(text, "results");
  
    return { stepTitles, results };
  }
  
  // === TOLKAR (input-agent): alle top-level felt ===
  
  export type PartialTolkarState = {
    berekningstype: string | null;
    fagomraade: string | null;
    tolkte_verdiar: Record<string, string>;
    antakingar: string[];
    manglande_verdiar: string[];
    kan_reknast_no: string[];
    kan_ikkje_reknast: string[];
    tolkings_oppsummering: string | null;
    konfidens: number | null;
    status: string | null;
  };
  
  export function extractTolkarState(text: string): PartialTolkarState {
    return {
      berekningstype: extractStringOrNullField(text, "berekningstype"),
      fagomraade: extractStringOrNullField(text, "fagomraade"),
      tolkte_verdiar: extractStringObject(text, "tolkte_verdiar"),
      antakingar: extractStringArray(text, "antakingar"),
      manglande_verdiar: extractStringArray(text, "manglande_verdiar"),
      kan_reknast_no: extractStringArray(text, "kan_reknast_no"),
      kan_ikkje_reknast: extractStringArray(text, "kan_ikkje_reknast"),
      tolkings_oppsummering: extractStringOrNullField(text, "tolkings_oppsummering"),
      konfidens: extractNumberField(text, "konfidens"),
      status: extractStringOrNullField(text, "status"),
    };
  }