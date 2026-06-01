import type { EngineeringContext } from "./types";

const SUPPORT_TEXT: Record<EngineeringContext["standards"]["supportLevel"], string> = {
  supported: "supported",
  partial: "partially supported for selected pilot cases",
  experimental: "experimental / not fully validated",
  not_supported: "not supported; ask clarifying questions and avoid code-specific claims",
};

const LANGUAGE_TEXT: Record<EngineeringContext["languagePolicy"]["fallbackLanguage"], string> = {
  nb: "Norwegian Bokmål",
  nn: "Norwegian Nynorsk",
  en: "English",
};

export function buildEngineeringContextPromptBlock(context: EngineeringContext): string {
  const englishReportMode =
    context.languagePolicy.uiLocale === "en" ||
    (context.region.countryCode && context.region.countryCode !== "NO") ||
    (context.standards.family && context.standards.family !== "eurocode_norway");
  const languageRules = englishReportMode
    ? [
        "LANGUAGE RULES",
        "1. This is an English/international PILAR run. Generated report/runtime prose fields MUST be written in English.",
        "2. This applies to assumptions, calculation_steps[].title, calculation_steps[].text, limitations, warnings, verification_notes, short_conclusion, executive_summary, technical_assessment, conclusion, and controller/user-facing prose.",
        "3. Do not copy Norwegian or Nynorsk free-form wording into those generated fields. Preserve the user's original text only when explicitly quoting raw input.",
        "4. Do not let the language decide the engineering standard. Standard choice is controlled only by the selected standard profile and user-provided project context.",
        "5. Keep engineering symbols and notation appropriate to the selected standard/profile.",
      ]
    : [
        "LANGUAGE RULES",
        "1. Detect the language of the user's input and reply in the same language.",
        "2. If the user's language is unclear or heavily mixed, reply in English.",
        "3. Do not let the language decide the engineering standard. Standard choice is controlled only by the selected standard profile and user-provided project context.",
        "4. Keep engineering symbols and notation appropriate to the selected standard/profile.",
      ];

  return [
    "PROJECT ENGINEERING CONTEXT",
    `- UI/default language: ${LANGUAGE_TEXT[context.languagePolicy.uiLocale]}`,
    englishReportMode
      ? "- Agent output language: English for generated report/runtime prose"
      : "- Agent output language: same as the user's prompt",
    `- Fallback language if the prompt is unclear or mixed: ${LANGUAGE_TEXT[context.languagePolicy.fallbackLanguage]}`,
    `- User region: ${context.region.countryName} (${context.region.countryCode})`,
    `- Selected standard profile: ${context.standards.label}`,
    `- Standard support level: ${SUPPORT_TEXT[context.standards.supportLevel]}`,
    `- Unit preference: ${context.outputPreferences.units}`,
    `- Notation style: ${context.outputPreferences.notationStyle}`,
    "",
    ...languageRules,
    "",
    "STANDARD AND SAFETY RULES",
    "1. Do not claim full code compliance unless the selected standard profile is explicitly supported for the requested calculation type.",
    "2. If the standard profile is experimental or not supported, state that clearly and limit the answer to general mechanics / workflow support unless the user supplies verified rules.",
    "3. Do not silently use Eurocode if the user selected a non-Eurocode standard.",
    "4. Do not silently use US standards if the user selected Eurocode.",
    "5. Always mark generated engineering output as preliminary and requiring professional verification.",
  ].join("\n");
}

export function standardSupportNotice(context: EngineeringContext): string {
  if (context.standards.supportLevel === "supported") {
    return "The selected standard profile is supported for the relevant pilot workflow. Results still require professional verification.";
  }

  if (context.standards.supportLevel === "partial") {
    return "The selected standard profile is partially supported. National annex and project-specific requirements must be checked manually.";
  }

  if (context.standards.supportLevel === "experimental") {
    return "The selected standard profile is experimental in PILAR. Use this primarily for workflow feedback and learning support, not for verified design.";
  }

  return "The selected standard profile is not supported yet. PILAR should ask clarifying questions and avoid code-specific design claims.";
}
