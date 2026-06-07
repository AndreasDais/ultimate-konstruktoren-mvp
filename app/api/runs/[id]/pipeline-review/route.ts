import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import {
  buildReportModel,
  type UpstreamAgentOutput,
  type UpstreamReportData,
} from "@/lib/report/build-report-model";
import {
  buildPublicPipelineReview,
  PIPELINE_REVIEW_SAFE_SELECTS,
  type PipelineReviewAgentSource,
} from "@/lib/report/pipeline-review";
import type { EngineeringContext } from "@/lib/engineering-context/types";
import type { Locale } from "@/lib/locale";
import type { TillitBreakdown } from "@/lib/tillit-score";
import { verifyPipelineShareToken } from "@/lib/pipeline-share-token";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RunRow = {
  id: string;
  request_id?: string | null;
  run_status?: string | null;
  calculation_type?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  display_language?: string | null;
  engineering_context?: unknown;
};

type ReportRow = {
  id: string;
  run_id: string;
  document_id: string;
  executive_summary: string;
  technical_assessment: string;
  conclusion: string;
  prompt_version: string;
  created_at: string;
  tillit_score: number | null;
  tillit_breakdown: TillitBreakdown | null;
};

type InputReviewRow = {
  input_status?: string | null;
  parsed_data?: unknown;
  calculation_type?: string | null;
  extracted_inputs?: unknown;
  can_calculate?: unknown;
  cannot_calculate?: unknown;
  assumptions?: unknown;
  prompt_version?: string | null;
};

type AgentOutputRow = {
  agent_name?: string | null;
  structured_output?: UpstreamAgentOutput["structured_output"] | null;
  prompt_version?: string | null;
};

type ComparisonRow = {
  match_status?: string | null;
};

type ControllerDecisionRow = {
  decision_status?: string | null;
  risk_level?: string | null;
  reason?: string | null;
  user_message?: string | null;
  blocked_outputs?: string[] | null;
  manual_review_required?: boolean | null;
  prompt_version?: string | null;
};

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function safeError(status: number, error: string) {
  return jsonNoStore({ error }, status);
}

async function currentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Read-only auth check for this route.
          },
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function verifyPipelineReviewAccess(request: NextRequest, runId: string) {
  const shareToken = request.nextUrl.searchParams.get("share");
  if (shareToken) {
    const verified = verifyPipelineShareToken({ token: shareToken });
    if (!verified.ok) {
      return {
        ok: false as const,
        status: verified.error === "share_secret_missing" ? 503 : 403,
        error: verified.error,
      };
    }
    if (verified.payload.run_id !== runId) {
      return { ok: false as const, status: 403, error: "share_run_mismatch" };
    }
    return { ok: true as const };
  }

  const userId = await currentUserId();
  if (!userId) return { ok: false as const, status: 403, error: "share_token_required" };

  const { data: ownerRun, error } = await getSupabase()
    .from("calculation_runs")
    .select("id, user_id")
    .eq("id", runId)
    .maybeSingle();

  if (error) {
    console.error("[api/runs/pipeline-review] owner check failed");
    return { ok: false as const, status: 500, error: "pipeline_review_unavailable" };
  }

  return ownerRun?.user_id === userId
    ? { ok: true as const }
    : { ok: false as const, status: 403, error: "share_token_required" };
}

function localeFromDisplayLanguage(value: string | null | undefined): Locale {
  return value === "nn" ? "nn" : "nb";
}

function displayLanguage(value: string | null | undefined): "nb" | "nn" | "en" {
  return value === "nn" || value === "en" ? value : "nb";
}

function firstAgent(rows: AgentOutputRow[] | null | undefined, agentName: "agent_a" | "agent_b"): AgentOutputRow | null {
  return (rows ?? []).find((row) => row.agent_name === agentName) ?? null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function agentSource(
  row: AgentOutputRow | null,
  role: "engineer_a" | "engineer_b",
  blockedFields: Set<string>,
): PipelineReviewAgentSource {
  const output =
    row?.structured_output && typeof row.structured_output === "object"
      ? row.structured_output
      : null;
  const suffix = role === "engineer_a" ? "a" : "b";
  const withheld =
    blockedFields.has(`results_${suffix}`) ||
    blockedFields.has(`calculation_steps_${suffix}`);

  return {
    role,
    label: role === "engineer_a" ? "Engineer A" : "Engineer B",
    confidence:
      typeof output?.confidence === "string" ? output.confidence : null,
    summary:
      typeof output?.short_conclusion === "string"
        ? output.short_conclusion
        : null,
    warnings: asStringArray(output?.warnings),
    limitations: asStringArray(output?.limitations),
    withheld,
    present: Boolean(output),
  };
}

function upstreamAgent(row: AgentOutputRow | null, agentName: "agent_a" | "agent_b"): UpstreamAgentOutput | null {
  if (!row) return null;
  return {
    agent_name: agentName,
    prompt_version: row.prompt_version ?? null,
    structured_output:
      row.structured_output && typeof row.structured_output === "object"
        ? row.structured_output
        : {},
  };
}

function inputReviewForReport(row: InputReviewRow | null): UpstreamReportData["inputReview"] {
  if (!row) return null;
  return {
    input_status: row.input_status ?? "unknown",
    parsed_data: row.parsed_data,
    calculation_type: row.calculation_type ?? null,
    extracted_inputs: row.extracted_inputs,
    can_calculate: row.can_calculate,
    cannot_calculate: row.cannot_calculate,
    assumptions: row.assumptions,
    prompt_version: row.prompt_version ?? "unknown",
  };
}

function controllerForReport(row: ControllerDecisionRow | null): UpstreamReportData["controllerDecision"] {
  if (!row) return null;
  return {
    decision_status: row.decision_status ?? "unknown",
    risk_level: row.risk_level ?? undefined,
    reason: row.reason ?? undefined,
    user_message: row.user_message ?? "",
    blocked_outputs: row.blocked_outputs ?? [],
  };
}

function comparisonForReport(row: ComparisonRow | null): UpstreamReportData["comparison"] {
  if (!row) return null;
  return {
    match_status: row.match_status ?? "unknown",
    comparison_data: {},
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) return safeError(400, "missing_run_id");

    const access = await verifyPipelineReviewAccess(request, id);
    if (!access.ok) return safeError(access.status, access.error);

    const supabase = getSupabase();
    const { data: run, error: runError } = await supabase
      .from("calculation_runs")
      .select(PIPELINE_REVIEW_SAFE_SELECTS.run)
      .eq("id", id)
      .maybeSingle<RunRow>();

    if (runError) {
      console.error("[api/runs/pipeline-review] run query failed");
      return safeError(500, "pipeline_review_unavailable");
    }
    if (!run) return safeError(404, "run_not_found");

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select(PIPELINE_REVIEW_SAFE_SELECTS.report)
      .eq("run_id", id)
      .maybeSingle<ReportRow>();

    if (reportError) {
      console.error("[api/runs/pipeline-review] report query failed");
      return safeError(500, "pipeline_review_unavailable");
    }
    if (!report) return safeError(404, "pipeline_review_not_available");

    const [{ data: inputReview }, { data: agentOutputs }, { data: comparison }, { data: controllerDecision }] =
      await Promise.all([
        run.request_id
          ? supabase
              .from("input_reviews")
              .select(PIPELINE_REVIEW_SAFE_SELECTS.inputReview)
              .eq("request_id", run.request_id)
              .maybeSingle<InputReviewRow>()
          : Promise.resolve({ data: null }),
        supabase
          .from("agent_outputs")
          .select(PIPELINE_REVIEW_SAFE_SELECTS.agentOutputs)
          .eq("run_id", id),
        supabase
          .from("comparisons")
          .select(PIPELINE_REVIEW_SAFE_SELECTS.comparison)
          .eq("run_id", id)
          .maybeSingle<ComparisonRow>(),
        supabase
          .from("controller_decisions")
          .select(PIPELINE_REVIEW_SAFE_SELECTS.controllerDecision)
          .eq("run_id", id)
          .maybeSingle<ControllerDecisionRow>(),
      ]);

    const agentRows = (agentOutputs ?? []) as AgentOutputRow[];
    const agentA = firstAgent(agentRows, "agent_a");
    const agentB = firstAgent(agentRows, "agent_b");
    const blockedFields = new Set(controllerDecision?.blocked_outputs ?? []);
    const origin = request.nextUrl.origin;
    const locale = localeFromDisplayLanguage(run.display_language);
    const runDisplayLanguage = displayLanguage(run.display_language);
    const reportUrl = `${origin}/rapport/${id}`;

    const upstream: UpstreamReportData = {
      report,
      cached: true,
      run: {
        request: { raw_text: "" },
        display_language: runDisplayLanguage,
      },
      inputReview: inputReviewForReport(inputReview),
      agentA: upstreamAgent(agentA, "agent_a"),
      agentB: upstreamAgent(agentB, "agent_b"),
      comparison: comparisonForReport(comparison),
      controllerDecision: controllerForReport(controllerDecision),
    };

    const reportModel = buildReportModel(upstream, {
      locale,
      reportUrl,
      engineeringContext: run.engineering_context as EngineeringContext | null,
      audience: "engineer",
    });

    return jsonNoStore(
      buildPublicPipelineReview({
        run: {
          id: run.id,
          status: run.run_status ?? null,
          calculationType: run.calculation_type ?? null,
          startedAt: run.started_at ?? null,
          completedAt: run.completed_at ?? null,
          displayLanguage: runDisplayLanguage,
        },
        reportModel,
        engineeringContext: run.engineering_context,
        links: {
          report: reportUrl,
          pdf: `${origin}/api/rapport/${id}/pdf`,
          word: `${origin}/api/rapport/${id}/word`,
          calculationSheet: `${origin}/rapport/${id}/beregning?locale=${locale}`,
        },
        agents: [
          agentSource(agentA, "engineer_a", blockedFields),
          agentSource(agentB, "engineer_b", blockedFields),
        ],
        controller: {
          riskLevel: controllerDecision?.risk_level ?? null,
          manualReviewRequired: controllerDecision?.manual_review_required ?? true,
          blockedFields: controllerDecision?.blocked_outputs ?? [],
        },
      }),
    );
  } catch {
    console.error("[api/runs/pipeline-review] read failed");
    return safeError(500, "pipeline_review_unavailable");
  }
}
