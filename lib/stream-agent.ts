/**
 * Konsumerer SSE-stream frå agent-routes med typed events.
 * Resolvar når streamen er ferdig (etter complete eller error event).
 * Throwar ikkje på error-events — bruk handlers.onError.
 */

export type StreamHandlers = {
    onThinkingStart?: () => void;
    onTextStart?: () => void;
    onDelta?: (delta: string, accumulated: string) => void;
    onComplete?: (result: Record<string, unknown>) => void;
    onError?: (message: string) => void;
  };
  
  export async function streamAgent(
    endpoint: string,
    body: Record<string, unknown>,
    handlers: StreamHandlers,
    signal?: AbortSignal
  ): Promise<void> {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      handlers.onError?.(
        err instanceof Error ? err.message : "Nettverksfeil under stream-oppstart"
      );
      return;
    }
  
    if (!response.ok) {
      let msg = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        msg = (errJson as { error?: string }).error ?? msg;
      } catch {
        // ignore
      }
      handlers.onError?.(msg);
      return;
    }
  
    if (!response.body) {
      handlers.onError?.("Ingen response body");
      return;
    }
  
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";
  
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
  
        buffer += decoder.decode(value, { stream: true });
  
        // SSE-eventar er separerte av \n\n
        let sepIndex: number;
        while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
          const eventBlock = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + 2);
  
          const lines = eventBlock.split("\n");
          let eventType = "";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event:")) eventType = line.slice(6).trim();
            else if (line.startsWith("data:")) dataStr = line.slice(5).trim();
          }
          if (!eventType) continue;
  
          let data: Record<string, unknown> = {};
          if (dataStr) {
            try {
              data = JSON.parse(dataStr);
            } catch {
              continue;
            }
          }
  
          switch (eventType) {
            case "thinking_start":
              handlers.onThinkingStart?.();
              break;
            case "text_start":
              handlers.onTextStart?.();
              break;
            case "delta":
              if (typeof data.text === "string") {
                accumulated += data.text;
                handlers.onDelta?.(data.text, accumulated);
              }
              break;
            case "complete":
              if (data.result && typeof data.result === "object") {
                handlers.onComplete?.(data.result as Record<string, unknown>);
              }
              break;
            case "error":
              handlers.onError?.(
                typeof data.message === "string"
                  ? data.message
                  : "Ukjent feil frå agent"
              );
              break;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      handlers.onError?.(
        err instanceof Error ? err.message : "Feil under lesing av stream"
      );
    }
  }