import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildEngineeringContext } from "@/lib/engineering-context";
import type { EngineeringContext } from "@/lib/engineering-context";

export const runtime = "nodejs";

type RequestPayload = {
  context?: Partial<EngineeringContext>;
  source?: string;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RequestPayload;
    const context = buildEngineeringContext(payload.context);
    const source = payload.source ?? "unknown";

    const supabase = getServiceClient();

    if (supabase) {
      const { error } = await supabase.from("engineering_context_events").insert({
        language: context.language,
        output_mode: context.languagePolicy.outputMode,
        fallback_language: context.languagePolicy.fallbackLanguage,
        detected_prompt_language: context.languagePolicy.detectedPromptLanguage ?? null,
        country_code: context.region.countryCode,
        country_name: context.region.countryName,
        standard_family: context.standards.family,
        standard_label: context.standards.label,
        standard_support_level: context.standards.supportLevel,
        units: context.outputPreferences.units,
        notation_style: context.outputPreferences.notationStyle,
        source,
        context,
      });

      if (error) {
        return NextResponse.json({ ok: true, stored: false, context, warning: error.message });
      }
    }

    return NextResponse.json({ ok: true, stored: Boolean(supabase), context });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
