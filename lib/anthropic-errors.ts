// lib/anthropic-errors.ts
//
// Oversetter Anthropic API-feil til usevennlege norske meldingar.
//
// Bruk i agent-route catch-blokker:
//   } catch (err) {
//     console.error("[agent-X] error:", err);
//     const { message, status } = formatAnthropicError(err, "Engineer A", locale);
//     return Response.json({ error: message }, { status });
//   }
//
// Helperen handterer:
// - 529 Overloaded — Anthropic-side metning (Anthropic er ute, ikkje vår feil)
// - 429 Rate limit — vårt tier-tak nådd
// - 5xx Server-feil — Anthropic API har teknisk problem
// - 401/403 Auth-feil — API-key-problem
// - 400 Bad request — ugyldig input til Anthropic
// - Timeout / nettverk — frakoplings-problem
// - Generisk fallback — alt anna

import Anthropic from "@anthropic-ai/sdk";

type Locale = "nb" | "nn";

const ERROR_MESSAGES = {
  overloaded: {
    nb: "Anthropic-tjenesten er midlertidig overbelastet. Vent 1-2 minutter og prøv igjen.",
    nn: "Anthropic-tenesta er mellombels overbelasta. Vent 1-2 minutt og prøv igjen.",
  },
  rateLimit: {
    nb: "For mange forespørsler på kort tid. Vent ett minutt og prøv igjen.",
    nn: "For mange førespurnader på kort tid. Vent eit minutt og prøv igjen.",
  },
  serverError: {
    nb: "Anthropic API har et teknisk problem akkurat nå. Prøv igjen om noen minutter.",
    nn: "Anthropic API har eit teknisk problem akkurat no. Prøv igjen om nokre minutt.",
  },
  authError: {
    nb: "Autentiseringsfeil mot Anthropic API. Send tilbakemelding så vi kan undersøke.",
    nn: "Autentiseringsfeil mot Anthropic API. Send tilbakemelding så vi kan undersøkje.",
  },
  badRequest: {
    nb: "Ugyldig forespørsel til Anthropic API. Prøv å forenkle oppgaven og send tilbakemelding om feilen vedvarer.",
    nn: "Ugyldig førespurnad til Anthropic API. Prøv å forenkle oppgåva og send tilbakemelding om feilen vedvarer.",
  },
  timeout: {
    nb: "Anthropic svarte ikke i tide. Oppgaven kan være for stor — prøv å forenkle.",
    nn: "Anthropic svara ikkje i tide. Oppgåva kan vere for stor — prøv å forenkle.",
  },
  network: {
    nb: "Nettverksfeil mot Anthropic API. Sjekk internett-tilkoblingen og prøv igjen.",
    nn: "Nettverksfeil mot Anthropic API. Sjekk internett-tilkoplinga og prøv igjen.",
  },
  generic: {
    nb: "møtte en uventet feil. Prøv igjen — om problemet vedvarer, send tilbakemelding.",
    nn: "møtte ein uventa feil. Prøv igjen — om problemet vedvarer, send tilbakemelding.",
  },
};

/**
 * Oversetter ein vilkårleg feil frå Anthropic SDK (eller andre) til ei
 * usevennleg norsk melding + passande HTTP-status for å returnere.
 *
 * @param err   Feilen fanga i ein catch-blokk
 * @param agentName Norsk namn på agenten ("Engineer A", "Tolkar", ...)
 *                  brukt i generisk fallback-melding
 * @param locale Språk for meldinga (default "nb")
 *
 * @returns { message, status } — message til UI, status til Response
 */
export function formatAnthropicError(
  err: unknown,
  agentName: string,
  locale?: Locale
): { message: string; status: number } {
  const lang: Locale = locale ?? "nb";

  // === 0. Tilkoplings-feil. SDK kastar APIConnectionError når connect/nett
  // feilar (t.d. api.anthropic.com via Cloudflare nede). Dei arvar APIError
  // men har status=undefined, så alle status-sjekkane under bommar og dei
  // ville falle til generisk 500. Sjekk dei eksplisitt FØRST. Timeout er ein
  // subklasse av connection, så han må testast før den meir generelle. ===
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return { message: ERROR_MESSAGES.timeout[lang], status: 504 };
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return { message: ERROR_MESSAGES.network[lang], status: 503 };
  }

  // === 1. Anthropic SDK APIError-instansar (vanlegaste tilfelle) ===
  if (err instanceof Anthropic.APIError) {
    // 529 Overloaded — Anthropic-side metning, transient
    if (err.status === 529) {
      return { message: ERROR_MESSAGES.overloaded[lang], status: 503 };
    }
    // 429 Rate limit — vårt tier-tak nådd
    if (err.status === 429) {
      return { message: ERROR_MESSAGES.rateLimit[lang], status: 429 };
    }
    // 401 / 403 Auth-problem
    if (err.status === 401 || err.status === 403) {
      return { message: ERROR_MESSAGES.authError[lang], status: 500 };
    }
    // 400 Bad request
    if (err.status === 400) {
      return { message: ERROR_MESSAGES.badRequest[lang], status: 400 };
    }
    // 5xx Server-feil frå Anthropic
    if (err.status >= 500) {
      return { message: ERROR_MESSAGES.serverError[lang], status: 503 };
    }
  }

  // === 2. String-baserte sjekker for feil som ikkje er APIError-instansar ===
  // (kan skje når SDK kastar wrappa eller errors via fetch/timeout)
  const errMsg = err instanceof Error ? err.message : String(err);

  if (/overloaded/i.test(errMsg)) {
    return { message: ERROR_MESSAGES.overloaded[lang], status: 503 };
  }
  if (/rate.?limit/i.test(errMsg)) {
    return { message: ERROR_MESSAGES.rateLimit[lang], status: 429 };
  }
  if (/timeout|timed out|ETIMEDOUT/i.test(errMsg)) {
    return { message: ERROR_MESSAGES.timeout[lang], status: 504 };
  }
  if (/ECONNREFUSED|ENOTFOUND|ECONNRESET|fetch failed/i.test(errMsg)) {
    return { message: ERROR_MESSAGES.network[lang], status: 503 };
  }

  // === 3. Generisk fallback med agent-namn for kontekst ===
  return {
    message: `${agentName} ${ERROR_MESSAGES.generic[lang]}`,
    status: 500,
  };
}