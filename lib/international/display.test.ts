import { describe, it, expect } from "vitest";
import { inferReportDisplayLanguage } from "./display";

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
