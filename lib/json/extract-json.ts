export type JsonParseSource = "direct" | "fenced" | "balanced_object" | "balanced_array";

export type JsonParseResult =
  | { ok: true; value: unknown; json: string; source: JsonParseSource }
  | { ok: false; error: string; preview: string };

function stripBom(value: string): string {
  return value.replace(/^\uFEFF/, "");
}

function stripCodeFence(value: string): string | null {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/);
  if (fenced?.[1]) return fenced[1].trim();

  const looseFence = trimmed.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
  if (looseFence?.[1]) return looseFence[1].trim();

  return null;
}

function findBalancedJsonCandidate(value: string, open: "{" | "[", close: "}" | "]"): string | null {
  const start = value.indexOf(open);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === open) depth += 1;
    if (char === close) depth -= 1;

    if (depth === 0) {
      return value.slice(start, index + 1).trim();
    }
  }

  return null;
}

function removeTrailingCommas(value: string): string {
  return value.replace(/,\s*([}\]])/g, "$1");
}

function tryParse(json: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(json) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function extractJsonText(raw: string): { json: string; source: JsonParseSource } | null {
  const trimmed = stripBom(raw).trim();
  if (!trimmed) return null;

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return { json: trimmed, source: trimmed.startsWith("[") ? "balanced_array" : "direct" };
  }

  const fenced = stripCodeFence(trimmed);
  if (fenced) return { json: fenced, source: "fenced" };

  const objectCandidate = findBalancedJsonCandidate(trimmed, "{", "}");
  if (objectCandidate) return { json: objectCandidate, source: "balanced_object" };

  const arrayCandidate = findBalancedJsonCandidate(trimmed, "[", "]");
  if (arrayCandidate) return { json: arrayCandidate, source: "balanced_array" };

  return null;
}

export function parseJsonWithFallback(raw: string): JsonParseResult {
  const preview = raw.slice(0, 1600);
  const extracted = extractJsonText(raw);

  if (!extracted) {
    return { ok: false, error: "No JSON object or array found in response", preview };
  }

  const direct = tryParse(extracted.json);
  if (direct.ok) {
    return { ok: true, value: direct.value, json: extracted.json, source: extracted.source };
  }

  const withoutTrailingCommas = removeTrailingCommas(extracted.json);
  if (withoutTrailingCommas !== extracted.json) {
    const repaired = tryParse(withoutTrailingCommas);
    if (repaired.ok) {
      return {
        ok: true,
        value: repaired.value,
        json: withoutTrailingCommas,
        source: extracted.source,
      };
    }
  }

  return { ok: false, error: direct.error, preview };
}
