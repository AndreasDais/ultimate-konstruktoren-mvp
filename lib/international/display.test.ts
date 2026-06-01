import { describe, it, expect } from "vitest";
import {
  inferReportDisplayLanguage,
  localizeResultLabel,
  sanitizeAiscGuardedOutputText,
} from "./display";

describe("inferReportDisplayLanguage - persistert visningsspraak", () => {
  it("persistert 'en' vinn over alt", () => {
    expect(inferReportDisplayLanguage({ locale: "nn", persisted: "en" })).toBe(
      "en",
    );
  });

  it("persistert 'nn' vinn sjoelv om teksten har AISC-signal", () => {
    expect(
      inferReportDisplayLanguage({
        locale: "nb",
        persisted: "nn",
        text: "AISC W12x40 ksi",
      }),
    ).toBe("nn");
  });

  it("fell tilbake til snifferen naar persistert manglar", () => {
    expect(
      inferReportDisplayLanguage({ locale: "nn", text: "AISC W12x40" }),
    ).toBe("en");
    expect(
      inferReportDisplayLanguage({ locale: "nn", text: "vanleg tekst" }),
    ).toBe("nn");
  });

  it("ignorerer ugyldig persistert verdi", () => {
    expect(inferReportDisplayLanguage({ locale: "nb", persisted: "xx" })).toBe(
      "nb",
    );
    expect(inferReportDisplayLanguage({ locale: "nb", persisted: null })).toBe(
      "nb",
    );
  });
});

describe("English AISC display polish", () => {
  it("removes sanitizer artifacts without weakening the Cb guard", () => {
    const output = sanitizeAiscGuardedOutputText(
      "the No refined Cb value is computed or assumed without verified input. " +
        "The verified input.0 is used. " +
        "verified input.0 does not establish any refined Cb effect without verified input.",
    );

    expect(output).toContain(
      "No refined Cb value is computed or assumed without verified input.",
    );
    expect(output).toContain("verified input is used");
    expect(output).toContain(
      "Any refined Cb effect must be computed from verified input before being used.",
    );
    expect(output).not.toMatch(/the No refined|verified input\.0/i);
  });

  it("labels wD as dead load rather than deflection in English reports", () => {
    expect(localizeResultLabel("wD", "en")).toBe("Dead load, D");
  });
});
