import type {
  EngineeringContext,
  EngineeringContextOption,
  EngineeringLanguage,
  EngineeringRegionCode,
  EngineeringStandardFamily,
} from "./types";

export const ENGINEERING_CONTEXT_STORAGE_KEY = "pilar-engineering-context-v2";

export const REGION_LABELS: Record<EngineeringRegionCode, string> = {
  NO: "Norway",
  SE: "Sweden",
  DK: "Denmark",
  EU: "EU / Eurocode general",
  GB: "United Kingdom",
  US: "United States",
  CA: "Canada",
  AU: "Australia",
  OTHER: "Other / not sure",
};

export const STANDARD_OPTIONS: EngineeringContextOption[] = [
  {
    value: "unknown",
    label: "Not sure / learning mode",
    shortLabel: "Not sure",
    regionHint: ["OTHER"],
    supportLevel: "not_supported",
    recommendedUnits: "metric",
    notationStyle: "metric_general",
    description:
      "Use this when the user is learning or does not know the applicable standard. PILAR must ask clarifying questions before code-specific claims.",
  },
  {
    value: "eurocode_norway",
    label: "Eurocode + Norwegian National Annex",
    shortLabel: "Eurocode Norway",
    regionHint: ["NO"],
    supportLevel: "partial",
    recommendedUnits: "metric",
    notationStyle: "eurocode",
    description:
      "Best supported pilot profile. Suitable for the existing Norwegian/Eurocode-style workflow.",
  },
  {
    value: "eurocode_general",
    label: "Eurocode general",
    shortLabel: "Eurocode general",
    regionHint: ["EU", "SE", "DK", "OTHER"],
    supportLevel: "partial",
    recommendedUnits: "metric",
    notationStyle: "eurocode",
    description:
      "General Eurocode-style workflow. National annex details must be verified manually.",
  },
  {
    value: "eurocode_uk_na",
    label: "Eurocode + UK National Annex",
    shortLabel: "UK NA",
    regionHint: ["GB"],
    supportLevel: "experimental",
    recommendedUnits: "metric",
    notationStyle: "eurocode",
    description:
      "Experimental. Useful for workflow feedback, not validated for full UK code compliance.",
  },
  {
    value: "aisc_asce_aci",
    label: "AISC / ASCE / ACI",
    shortLabel: "US standards",
    regionHint: ["US"],
    supportLevel: "experimental",
    recommendedUnits: "imperial",
    notationStyle: "us_customary",
    description:
      "Experimental. Do not claim US code compliance. Use mainly for mechanics/report workflow feedback.",
  },
  {
    value: "canada",
    label: "Canadian standards",
    shortLabel: "Canada",
    regionHint: ["CA"],
    supportLevel: "experimental",
    recommendedUnits: "metric",
    notationStyle: "metric_general",
    description:
      "Experimental. Regional code support is not validated yet.",
  },
  {
    value: "australia",
    label: "Australian standards",
    shortLabel: "Australia",
    regionHint: ["AU"],
    supportLevel: "experimental",
    recommendedUnits: "metric",
    notationStyle: "metric_general",
    description:
      "Experimental. Regional code support is not validated yet.",
  },
];

export function getStandardOption(family: EngineeringStandardFamily) {
  return STANDARD_OPTIONS.find((option) => option.value === family) ?? STANDARD_OPTIONS[0];
}

export function getRecommendedStandardForRegion(region: EngineeringRegionCode): EngineeringStandardFamily {
  if (region === "NO") return "eurocode_norway";
  if (region === "GB") return "eurocode_uk_na";
  if (region === "US") return "aisc_asce_aci";
  if (region === "CA") return "canada";
  if (region === "AU") return "australia";
  if (region === "EU" || region === "SE" || region === "DK") return "eurocode_general";
  return "unknown";
}

export function buildEngineeringContext(input?: Partial<EngineeringContext>): EngineeringContext {
  const language: EngineeringLanguage = input?.language ?? input?.languagePolicy?.uiLocale ?? "en";
  const countryCode: EngineeringRegionCode = input?.region?.countryCode ?? "OTHER";
  const family = input?.standards?.family ?? getRecommendedStandardForRegion(countryCode);
  const option = getStandardOption(family);

  return {
    language,
    languagePolicy: {
      uiLocale: input?.languagePolicy?.uiLocale ?? language,
      outputMode: "same_as_prompt",
      fallbackLanguage: input?.languagePolicy?.fallbackLanguage ?? "en",
      detectedPromptLanguage: input?.languagePolicy?.detectedPromptLanguage,
    },
    region: {
      countryCode,
      countryName: input?.region?.countryName ?? REGION_LABELS[countryCode],
    },
    standards: {
      family,
      label: input?.standards?.label ?? option.label,
      supportLevel: input?.standards?.supportLevel ?? option.supportLevel,
      confidence: input?.standards?.confidence ?? "user_selected",
    },
    outputPreferences: {
      units: input?.outputPreferences?.units ?? option.recommendedUnits,
      notationStyle: input?.outputPreferences?.notationStyle ?? option.notationStyle,
    },
    safety: {
      professionalVerificationRequired: true,
      allowUnsupportedStandardClaims: false,
    },
  };
}
