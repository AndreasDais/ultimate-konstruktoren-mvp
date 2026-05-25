import { coerceLocale, wrapPromptWithLocale, type Locale } from "@/lib/locale";
import { buildEngineeringContext, buildEngineeringContextPromptBlock } from "@/lib/engineering-context";
import {
  isInternationalEnglishContext,
  SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT,
} from "@/lib/international/display";
import type { EngineeringContext } from "@/lib/engineering-context";

export type EngineeringContextPayload = EngineeringContext | null | undefined;

const SPRINT338_INTERNATIONAL_LANGUAGE_HARD_STOP = [
  "SPRINT 33.8 INTERNATIONAL LANGUAGE HARD STOP:",
  "When engineering context is international, US, AISC, ASCE, ACI, imperial, or the requested language is English, all generated prose must be English.",
  "Use Engineer A, Engineer B, Comparator and Controller.",
  "Do not use Engineer, Comparator, Comparator, Controller, assumption, assumption, antaking, antakelse, utrekning, beregning, forskjell, while, only, or Norwegian/Nynorsk explanatory prose.",
  "Translate any upstream Norwegian/Nynorsk comparator/controller prose to English before emitting user-facing JSON fields.",
  "For AISC/ASCE support, do not provide numerical typical ranges, approximate thresholds, or Manual-derived values such as Lp, Lr, Cb, Zx, Sx, J, Cw, rts, ho, phi_b*Mn, or phi_v*Vn unless verified by an approved application data source or explicitly supplied by the user.",
].join("\n");

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

  const roleLanguageBlock = isEnglishContext
    ? [
        "INTERNATIONAL UI / ROLE NAMING",
        "- Use English role names in prose when referring to the pipeline: Interpreter, Engineer A, Engineer B, Comparator, Controller, professional reviewer.",
        "- Do not use Norwegian labels such as Engineer, Comparator/Comparator, Controller, beregningsnotat, fagperson in English output.",
        "- This instruction overrides any Norwegian role-name wording in the base prompt or upstream agent output.",
        "- If upstream text contains Norwegian/Nynorsk comparator prose, translate it to English before emitting user-facing JSON fields.",
        "- For US customary / AISC-ASCE contexts, use load factor terminology such as 1.2D and 1.6L. Avoid gamma_D/gamma_L labels unless the user explicitly asks for symbolic comparison.",
        "",
      ].join("\n")
    : "";

  return [
    buildEngineeringContextPromptBlock(context),
    SPRINT335_NO_UNVERIFIED_AISC_VALUES_PROMPT,
    isEnglishContext ? SPRINT338_INTERNATIONAL_LANGUAGE_HARD_STOP : "",
    roleLanguageBlock,
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
