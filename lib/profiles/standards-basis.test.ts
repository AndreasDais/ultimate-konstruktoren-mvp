import { describe, it, expect } from "vitest";
import {
  buildStandardsBasisPromptBlock,
  resolveFactorSet,
} from "./standards-basis";
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


describe("resolveFactorSet", () => {
  it("gjev norsk faktorsett for eurocode_norway", () => {
    const fs = resolveFactorSet("eurocode_norway");
    expect(fs?.family).toBe("eurocode_norway");
    expect(fs?.gammaG_610b).toBeCloseTo(1.2, 5);
    expect(fs?.gammaM0).toBeCloseTo(1.05, 5);
    expect(fs?.alphaCC).toBeCloseTo(0.85, 5);
  });

  it("gjev norsk faktorsett naar familien manglar (domestic-flyt)", () => {
    expect(resolveFactorSet(undefined)?.family).toBe("eurocode_norway");
  });

  it("gjev generelt EN-faktorsett for eurocode_general", () => {
    const fs = resolveFactorSet("eurocode_general");
    expect(fs?.family).toBe("eurocode_general");
    expect(fs?.gammaG_610b).toBeCloseTo(1.1475, 5); // xi 0.85 * gamma_G 1.35
    expect(fs?.gammaM0).toBeCloseTo(1.0, 5);
    expect(fs?.alphaCC).toBeCloseTo(1.0, 5);
  });

  it("gjev null for familiar utan verifisert faktorsett", () => {
    expect(resolveFactorSet("eurocode_uk_na")).toBeNull();
    expect(resolveFactorSet("aisc_asce_aci")).toBeNull();
    expect(resolveFactorSet("canada")).toBeNull();
    expect(resolveFactorSet("australia")).toBeNull();
    expect(resolveFactorSet("unknown")).toBeNull();
  });
});
