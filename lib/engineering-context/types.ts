export type EngineeringLanguage = "nb" | "nn" | "en";

export type EngineeringDetectedPromptLanguage =
  | "en"
  | "nb"
  | "nn"
  | "sv"
  | "da"
  | "de"
  | "fr"
  | "es"
  | "unknown";

export type EngineeringOutputMode = "same_as_prompt";

export type EngineeringRegionCode =
  | "NO"
  | "SE"
  | "DK"
  | "EU"
  | "GB"
  | "US"
  | "CA"
  | "AU"
  | "OTHER";

export type EngineeringStandardFamily =
  | "eurocode_norway"
  | "eurocode_general"
  | "eurocode_uk_na"
  | "aisc_asce_aci"
  | "canada"
  | "australia"
  | "unknown";

export type StandardSupportLevel =
  | "supported"
  | "partial"
  | "experimental"
  | "not_supported";

export type EngineeringUnitSystem = "metric" | "imperial" | "mixed";

export type EngineeringNotationStyle =
  | "eurocode"
  | "us_customary"
  | "metric_general";

export type EngineeringContext = {
  /** UI/default locale for the international entry point. Agent output is controlled by languagePolicy. */
  language: EngineeringLanguage;
  languagePolicy: {
    uiLocale: EngineeringLanguage;
    outputMode: EngineeringOutputMode;
    fallbackLanguage: EngineeringLanguage;
    detectedPromptLanguage?: EngineeringDetectedPromptLanguage;
  };
  region: {
    countryCode: EngineeringRegionCode;
    countryName: string;
  };
  standards: {
    family: EngineeringStandardFamily;
    label: string;
    supportLevel: StandardSupportLevel;
    confidence: "user_selected" | "inferred" | "unknown";
  };
  outputPreferences: {
    units: EngineeringUnitSystem;
    notationStyle: EngineeringNotationStyle;
  };
  safety: {
    professionalVerificationRequired: true;
    allowUnsupportedStandardClaims: false;
  };
};

export type EngineeringContextOption = {
  value: EngineeringStandardFamily;
  label: string;
  shortLabel: string;
  regionHint: EngineeringRegionCode[];
  supportLevel: StandardSupportLevel;
  recommendedUnits: EngineeringUnitSystem;
  notationStyle: EngineeringNotationStyle;
  description: string;
};
