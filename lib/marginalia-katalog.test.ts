import { describe, it, expect } from "vitest";
import {
  MARGINALIA_KATALOG,
  isMarginaliaRelevantForLanguage,
  type MarginaliaEntry,
} from "./marginalia-katalog";

const norway: MarginaliaEntry = { description: "x", scope: "norway" };
const neutral: MarginaliaEntry = { description: "y" };

describe("isMarginaliaRelevantForLanguage", () => {
  it("droppar Norge-spesifikt oppslag for engelsk visning", () => {
    expect(isMarginaliaRelevantForLanguage(norway, "en")).toBe(false);
  });

  it("viser Norge-spesifikt oppslag for norsk visning", () => {
    expect(isMarginaliaRelevantForLanguage(norway, "nn")).toBe(true);
    expect(isMarginaliaRelevantForLanguage(norway, "nb")).toBe(true);
  });

  it("viser jurisdiksjons-noytralt oppslag for alle spraak", () => {
    expect(isMarginaliaRelevantForLanguage(neutral, "en")).toBe(true);
    expect(isMarginaliaRelevantForLanguage(neutral, "nn")).toBe(true);
  });

  it("NA-oppslaget i katalogen er merkt scope: norway og blir filtrert", () => {
    expect(MARGINALIA_KATALOG.NA.scope).toBe("norway");
    expect(
      isMarginaliaRelevantForLanguage(MARGINALIA_KATALOG.NA, "en"),
    ).toBe(false);
  });
});
