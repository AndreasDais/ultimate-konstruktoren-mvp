import { describe, it, expect } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { formatAnthropicError } from "@/lib/anthropic-errors";

describe("formatAnthropicError", () => {
  it("mappar APIConnectionError til 503 + nettverksmelding (ikkje generisk 500)", () => {
    // SDK kastar denne når connect feilar (nett til Cloudflare-fronta
    // api.anthropic.com nede). Den arvar APIError men har status=undefined,
    // så alle status-sjekkane bommar — utan eksplisitt handtering fell han
    // til generisk 500 "møtte ein uventa feil", som feilrapporterer eit
    // nettutfall som ein intern bug.
    const err = new Anthropic.APIConnectionError({ message: "Connection error." });
    const { message, status } = formatAnthropicError(err, "Tolkar", "nn");
    expect(status).toBe(503);
    expect(message).toMatch(/[Nn]ettverksfeil/);
    expect(message).not.toMatch(/uventa feil/);
  });

  it("mappar APIConnectionTimeoutError til 504 (subklasse — må sjekkast før connection)", () => {
    // Guard: APIConnectionTimeoutError arvar APIConnectionError. Vert dei to
    // sjekkane reordra, ville ein timeout matche connection-greina (503) og
    // denne testen bryte.
    const err = new Anthropic.APIConnectionTimeoutError({ message: "Request timed out." });
    const { status, message } = formatAnthropicError(err, "Tolkar", "nn");
    expect(status).toBe(504);
    expect(message).toMatch(/ikkje i tide/i);
  });

  it("held generisk 500-fallback for feil som ikkje er tilkoplings-relaterte", () => {
    const { status, message } = formatAnthropicError(new Error("noko heilt anna"), "Tolkar", "nn");
    expect(status).toBe(500);
    expect(message).toMatch(/uventa feil/);
  });
});
