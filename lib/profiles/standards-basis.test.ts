import { describe, it, expect } from "vitest";
import { buildStandardsBasisPromptBlock } from "./standards-basis";
import type {
  EngineeringContext,
  EngineeringStandardFamily,
} from "@/lib/engineering-context/types";

function ctx(family: EngineeringStandardFamily): EngineeringContext {
  return {
    language: "en",
    languagePolicy: {
      uiLocale: "en",
      outputMode: "same_as_prompt",
      fallbackLanguage: "en",
    },
    region: { countryCode: "EU", countryName: "Test" },
    standards: {
      family,
      label: family,
      supportLevel: "experimental",
      confidence: "user_selected",
    },
    outputPreferences: { units: "metric", notationStyle: "eurocode" },
    safety: {
      professionalVerificationRequired: true,
      allowUnsupportedStandardClaims: false,
    },
  };
}

describe("buildStandardsBasisPromptBlock", () => {
  it("rutar norsk NA-blokk for eurocode_norway", () => {
    expect(buildStandardsBasisPromptBlock(ctx("eurocode_norway"))).toContain(
      "NA-GRUNNLAG",
    );
  });

  it("rutar norsk NA-blokk når konteksten manglar (domestic-flyt)", () => {
    // Regresjonsvern: norske køyringar sender aldri engineering-context.
    expect(buildStandardsBasisPromptBlock(undefined)).toContain("NA-GRUNNLAG");
    expect(buildStandardsBasisPromptBlock(null)).toContain("NA-GRUNNLAG");
  });

  it("rutar generell EN-blokk for eurocode_general", () => {
    const block = buildStandardsBasisPromptBlock(ctx("eurocode_general"));
    expect(block).toContain("STANDARDS BASIS");
    expect(block).toContain("recommended values");
    expect(block).not.toContain("NA-GRUNNLAG");
  });

  it("gjev inga blokk for eurocode_uk_na (uverifisert UK NA)", () => {
    expect(buildStandardsBasisPromptBlock(ctx("eurocode_uk_na"))).toBe("");
  });

  it("gjev inga blokk for ikkje-Eurocode-familiar", () => {
    expect(buildStandardsBasisPromptBlock(ctx("aisc_asce_aci"))).toBe("");
    expect(buildStandardsBasisPromptBlock(ctx("canada"))).toBe("");
    expect(buildStandardsBasisPromptBlock(ctx("australia"))).toBe("");
    expect(buildStandardsBasisPromptBlock(ctx("unknown"))).toBe("");
  });
});
