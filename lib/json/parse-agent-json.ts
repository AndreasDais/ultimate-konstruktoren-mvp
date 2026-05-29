/**
 * Robust JSON-parsing for agent-svar (Konstruktør A/B, Samanliknar, ...).
 *
 * Agentane lovar "berre gyldig JSON, ingen tekst før/etter", men i praksis
 * skriv dei iblant synleg prosa FØR objektet — t.d. Konstruktør B sin
 * "**Pre-JSON reasoning (Engineer B — independent approach)** ..." (run
 * 516ebe3e, 2026-05-29). Den gamle naive `responseText.replace(/```json/...)`
 * strippa berre kodefence; JSON.parse feila på prosaen, og jsonrepair laga ein
 * GARBAGE-array (keys [0..20]) som vart lagra som structured_output → heile
 * B-svaret (results + short_conclusion) gjekk tapt i UI + DB.
 *
 * Denne hentar det første balanserte `{...}`-objektet (via extractJsonText,
 * som er string-aware), prøver JSON.parse, så jsonrepair som fallback for
 * LaTeX-backslash-escape. Returnerer eit reint objekt, eller `null` når det
 * IKKJE finst eit gyldig objekt (trunkert svar, rein prosa, eller array) —
 * slik at ruta kan returnere ein ærleg feil i staden for å lagre garbage.
 */
import { jsonrepair } from "jsonrepair";
import { extractJsonText } from "./extract-json";

function asPlainObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseAgentJson(raw: string): Record<string, unknown> | null {
  const extracted = extractJsonText(raw);
  if (!extracted) return null;

  try {
    return asPlainObject(JSON.parse(extracted.json));
  } catch {
    // Vanleg årsak: LaTeX-backslash (\sigma, \cdot) ikkje dobbel-escapa.
    try {
      return asPlainObject(JSON.parse(jsonrepair(extracted.json)));
    } catch {
      return null;
    }
  }
}
