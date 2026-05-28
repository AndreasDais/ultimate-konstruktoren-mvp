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

/**
 * Sprint 65.9 — international-mode preamble per AGENT_PROMPT_LOCALE_PLAN.md.
 *
 * Fires only when isInternationalEnglishContext(context) is true. The shell
 * is English, but the agent must mirror whatever language the user wrote in.
 * The preamble overrides the Norwegian role identity carried in basePrompt
 * (which still opens with "Du er Konstruktør A...") and pins the language
 * policy explicitly.
 *
 * Two blocks:
 *  1. ROLE IDENTITY — translate Norwegian role labels to English
 *     equivalents in all output. Section headers/role labels mirror the
 *     app shell, which is English in intl mode.
 *  2. OUTPUT LANGUAGE — detect the user's request language; respond in it;
 *     default to English when unclear. Engineering prose mirrors the user;
 *     role labels stay English.
 *
 * Norwegian mode (nb/nn) does NOT receive this preamble — wrapPromptWithLocale
 * already injects the SVARSPRÅK directive there.
 */
export const INTERNATIONAL_MODE_ROLE_PREAMBLE = `ROLE IDENTITY (INTERNATIONAL MODE)
You are an English-shell PILAR agent. The instructions further down are
written in Norwegian and refer to you with a Norwegian role label. Follow
those instructions precisely as engineering guidance, but never copy a
Norwegian role label into your output. Always use the English equivalent:
  Tolkar        -> Input Agent
  Konstruktør A -> Engineer A
  Konstruktør B -> Engineer B
  Samanliknar   -> Comparator
  Kontrollør    -> Controller
  Rapportør     -> Reporter

OUTPUT LANGUAGE
Detect the language the user wrote their request in. Respond in THAT
language. Default to English when the user's language is unclear. Section
headers and role labels stay in English (they mirror the app shell).
Engineering prose mirrors the user's language. Do not switch language
mid-response.
`;

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

  const rolePreamble = isEnglishContext ? INTERNATIONAL_MODE_ROLE_PREAMBLE : "";

  return [
    rolePreamble,
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
