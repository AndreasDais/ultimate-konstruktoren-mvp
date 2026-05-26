import { coerceLocale, wrapPromptWithLocale, type Locale } from "@/lib/locale";
import { buildEngineeringContext, buildEngineeringContextPromptBlock } from "@/lib/engineering-context";
import {
  isInternationalEnglishContext,
  SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT,
} from "@/lib/international/display";
import type { EngineeringContext } from "@/lib/engineering-context";

export type EngineeringContextPayload = EngineeringContext | null | undefined;

export function parseEngineeringContextPayload(value: unknown): EngineeringContext | undefined {
  if (!value) return undefined;

  try {
    if (typeof value === "string") {
      if (!value.trim()) return undefined;
      return buildEngineeringContext(JSON.parse(value) as Partial<EngineeringContext>);
    }

    if (typeof value === "object") {
      return buildEngineeringContext(value as Partial<EngineeringContext>);
    }
  } catch (error) {
    console.warn("[engineering-context] Could not parse engineering context:", error);
  }

  return undefined;
}

export function buildAgentSystemPrompt(
  basePrompt: string,
  locale: Locale,
  context?: EngineeringContextPayload,
): string {
  if (!context) return wrapPromptWithLocale(basePrompt, coerceLocale(locale));

  const isEnglishContext = isInternationalEnglishContext(context);

  const notationHintBlock = isEnglishContext
    ? [
        "INTERNATIONAL NOTATION",
        "- For US customary / AISC-ASCE contexts, use load factor terminology such as 1.2D and 1.6L. Avoid gamma_D/gamma_L labels unless the user explicitly asks for symbolic comparison.",
        "",
      ].join("\n")
    : "";

  return [
    buildEngineeringContextPromptBlock(context),
    SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT,
    notationHintBlock,
    "PILAR AGENT INSTRUCTIONS",
    basePrompt,
  ].filter(Boolean).join("\n");
}

export function engineeringContextUserMessageBlock(context?: EngineeringContextPayload): string {
  if (!context) return "";

  return [
    "ENGINEERING CONTEXT SELECTED BY USER:",
    `- Region: ${context.region.countryName} (${context.region.countryCode})`,
    `- Standard profile: ${context.standards.label}`,
    `- Support level: ${context.standards.supportLevel}`,
    `- Units: ${context.outputPreferences.units}`,
    `- Notation: ${context.outputPreferences.notationStyle}`,
    `- Agent language policy: answer in the same language as the user's prompt; fallback to ${context.languagePolicy.fallbackLanguage} if unclear.`,
    "",
  ].join("\n");
}
