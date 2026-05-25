/**
 * Generisk SSE-konsument for streaming agent-routes (Tolkar, Engineer A/B,
 * Rapportør).
 *
 * Støttar både JSON-payload (Record) og FormData (for fil-opplasting).
 * Når payload er FormData, lat nettlesaren setje Content-Type sjølv (han
 * legg på `multipart/form-data; boundary=...` automatisk).
 *
 * Støtta event-typar:
 * - `cached`        — for Rapportør: rapporten var i cache, complete kjem
 *                     umiddelbart utan thinking/text
 * - `thinking_start`— Claude byrjar "extended thinking" (kjem only når
 *                     thinking: enabled — Rapportør sin Agent E)
 * - `text_start`    — første text-token er klar (eller første agent-text
 *                     etter thinking-fasen)
 * - `delta`         — text-tokens streamast inn
 * - `complete`      — heile responsen er klar, payload har final-data
 * - `error`         — noko gjekk gale, payload har `message`
 */

export type StreamHandlers = {
  onCached?: () => void;
  onThinkingStart?: () => void;
  onTextStart?: () => void;
  onDelta?: (delta: string, accumulated: string) => void;
  onComplete?: (data: Record<string, unknown>) => void;
  onError?: (message: string) => void;
};

export async function streamAgent(
  url: string,
  payload: Record<string, unknown> | FormData,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let accumulated = "";

  try {
    const isFormData = payload instanceof FormData;
    const headers: Record<string, string> = {
      Accept: "text/event-stream",
    };
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: isFormData ? payload : JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      handlers.onError?.(errorData.error || `HTTP ${response.status}`);
      return;
    }

    if (!response.body) {
      handlers.onError?.("Tom response body");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          try {
            const parsed = JSON.parse(data);

            if (currentEvent === "cached") {
              handlers.onCached?.();
            } else if (currentEvent === "thinking_start") {
              handlers.onThinkingStart?.();
            } else if (currentEvent === "text_start") {
              handlers.onTextStart?.();
            } else if (currentEvent === "delta") {
              accumulated += parsed.text || "";
              handlers.onDelta?.(parsed.text || "", accumulated);
            } else if (currentEvent === "complete") {
              // For Rapportør: heile full-respons-objektet (report, run,
              // agentA, agentB, ...) er i parsed. For Engineer A/B
              // (eldre): { result: {...} } var standard. Pass på begge:
              if (parsed.result !== undefined) {
                handlers.onComplete?.(parsed.result || {});
              } else {
                handlers.onComplete?.(parsed);
              }
            } else if (currentEvent === "error") {
              handlers.onError?.(parsed.message || "Ukjent feil");
            }
          } catch {
            // Ignorer parse-feil på enkelt-eventer
          }
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return; // forventa ved Avbryt
    }
    handlers.onError?.(err instanceof Error ? err.message : "Ukjent feil");
  }
}