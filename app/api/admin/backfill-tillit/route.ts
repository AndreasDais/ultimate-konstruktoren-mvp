/**
 * Backfill-endepunkt for tillit-score-rekalkulering (dag 16).
 *
 * Køyrer ved bytte av formel-versjon. Les rådata frå
 * reports.tillit_breakdown.components, kjører calculateTillitScore()
 * med gjeldande formel og UPDATE-ar tillit_score + tillit_breakdown.
 *
 * BRUK:
 *   1. Set ADMIN_PASSWORD i .env.local
 *   2. POST localhost:3000/api/admin/backfill-tillit
 *      med header: Authorization: Bearer <ADMIN_PASSWORD>
 *   3. Svar inneheld kvar rapport sin gamle og nye skår
 *
 * Idempotent — trygt å køyre fleire gonger. Hopper over rapportar
 * utan komponent-data (svært gamle eller mislukka pipeline-køyringar).
 */

import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import {
  calculateTillitScore,
  FORMULA_VERSION,
  type ComparisonStatus,
  type ControllerStatus,
} from "@/lib/tillit-score";

type BackfillResult = {
  id: string;
  document_id: string | null;
  old_score: number | null;
  new_score: number | null;
  old_version: string | null;
  new_version: string;
  status: "updated" | "skipped" | "error";
  reason?: string;
};

const VALID_COMPARISON: ComparisonStatus[] = [
  "match",
  "minor_differences",
  "significant_differences",
  "critical_disagreement",
];

const VALID_CONTROLLER: ControllerStatus[] = [
  "approved",
  "approved_with_warnings",
  "uncertain",
  "rejected",
];

export async function POST(req: Request) {
  // Auth-sjekk via Bearer-token mot ADMIN_PASSWORD
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.ADMIN_PASSWORD}`;
  if (!process.env.ADMIN_PASSWORD || auth !== expected) {
    return NextResponse.json(
      { error: "unauthorized — set ADMIN_PASSWORD og send Bearer-token" },
      { status: 401 }
    );
  }

  const supabase = getSupabase();

  const { data: reports, error } = await supabase
    .from("reports")
    .select("id, document_id, tillit_score, tillit_breakdown")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "kunne ikkje hente rapportar", detail: error.message },
      { status: 500 }
    );
  }

  const results: BackfillResult[] = [];

  for (const report of reports || []) {
    const breakdown = report.tillit_breakdown as
      | { components?: Record<string, unknown>; formula_version?: string }
      | null;
    const components = breakdown?.components;

    if (!components) {
      results.push({
        id: report.id,
        document_id: report.document_id,
        old_score: report.tillit_score,
        new_score: null,
        old_version: breakdown?.formula_version ?? null,
        new_version: FORMULA_VERSION,
        status: "skipped",
        reason: "manglar components-rådata",
      });
      continue;
    }

    const comparison_status = components.comparison_status as string;
    const controller_verdict_raw = components.controller_verdict_raw as string;
    const rekna_storleikar = Number(components.rekna_storleikar ?? 0);
    const spurde_storleikar = Number(components.spurde_storleikar ?? 0);

    if (
      !VALID_COMPARISON.includes(comparison_status as ComparisonStatus) ||
      !VALID_CONTROLLER.includes(controller_verdict_raw as ControllerStatus)
    ) {
      results.push({
        id: report.id,
        document_id: report.document_id,
        old_score: report.tillit_score,
        new_score: null,
        old_version: breakdown?.formula_version ?? null,
        new_version: FORMULA_VERSION,
        status: "skipped",
        reason: `ugyldig status: comp=${comparison_status}, ctrl=${controller_verdict_raw}`,
      });
      continue;
    }

    const newBreakdown = calculateTillitScore({
      comparison_status: comparison_status as ComparisonStatus,
      controller_verdict: controller_verdict_raw as ControllerStatus,
      rekna_storleikar,
      spurde_storleikar,
    });

    const { error: updateError } = await supabase
      .from("reports")
      .update({
        tillit_score: newBreakdown.total,
        tillit_breakdown: newBreakdown,
      })
      .eq("id", report.id);

    if (updateError) {
      results.push({
        id: report.id,
        document_id: report.document_id,
        old_score: report.tillit_score,
        new_score: newBreakdown.total,
        old_version: breakdown?.formula_version ?? null,
        new_version: FORMULA_VERSION,
        status: "error",
        reason: updateError.message,
      });
    } else {
      results.push({
        id: report.id,
        document_id: report.document_id,
        old_score: report.tillit_score,
        new_score: newBreakdown.total,
        old_version: breakdown?.formula_version ?? null,
        new_version: FORMULA_VERSION,
        status: "updated",
      });
    }
  }

  const summary = {
    total: results.length,
    updated: results.filter((r) => r.status === "updated").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    formula_version: FORMULA_VERSION,
  };

  return NextResponse.json({ summary, results });
}