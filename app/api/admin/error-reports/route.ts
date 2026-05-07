import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VALID_STATUSES = [
  "open",
  "under_review",
  "confirmed",
  "rejected",
  "fixed",
];

const VALID_ERROR_TYPES = [
  "feil_talverdi",
  "feil_formel",
  "feil_standardreferanse",
  "feil_eining",
  "feil_foresetnad",
  "uklart_sprak",
  "manglande_kontroll",
  "anna",
];

type ErrorReportRow = {
  id: string;
  report_id: string | null;
  user_id: string | null;
  error_type: string;
  selected_section: string;
  severity_user: string;
  user_comment: string;
  status: string;
  created_at: string;
};

type ReportRow = {
  id: string;
  run_id: string | null;
};

type ManualReviewRow = {
  related_id: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const typeFilter = searchParams.get("error_type");

    // Steg 1: hent error_reports.
    // Vi gjer manuell JOIN i staden for nested select fordi Supabase nested
    // select krev deklarert FK mellom error_reports.report_id og reports.id.
    // Den kan mangle, så vi unngår det heile.
    let query = supabase
      .from("error_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
      query = query.eq("status", statusFilter);
    }
    if (typeFilter && VALID_ERROR_TYPES.includes(typeFilter)) {
      query = query.eq("error_type", typeFilter);
    }

    const { data: errorReports, error: errorReportsError } = await query;

    if (errorReportsError) {
      console.error(
        "[admin/error-reports/GET] Fetch error_reports failed:",
        errorReportsError
      );
      return NextResponse.json(
        { error: "Klarte ikkje hente feilrapportar" },
        { status: 500 }
      );
    }

    const rows = (errorReports ?? []) as ErrorReportRow[];

    // Steg 2: samle unike report_id-ar og hent run_id for kvar
    const uniqueReportIds = Array.from(
      new Set(rows.map((r) => r.report_id).filter((id): id is string => !!id))
    );

    const reportsMap = new Map<string, string | null>();

    if (uniqueReportIds.length > 0) {
      const { data: reportsData, error: reportsError } = await supabase
        .from("reports")
        .select("id, run_id")
        .in("id", uniqueReportIds);

      if (reportsError) {
        console.error(
          "[admin/error-reports/GET] Fetch reports failed:",
          reportsError
        );
      } else {
        for (const r of (reportsData ?? []) as ReportRow[]) {
          reportsMap.set(r.id, r.run_id);
        }
      }
    }

    // Steg 3: hent review-count for kvar error_report
    const errorReportIds = rows.map((r) => r.id);
    const reviewCountMap = new Map<string, number>();

    if (errorReportIds.length > 0) {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("manual_reviews")
        .select("related_id")
        .eq("related_type", "error_report")
        .in("related_id", errorReportIds);

      if (reviewsError) {
        console.error(
          "[admin/error-reports/GET] Fetch manual_reviews failed:",
          reviewsError
        );
      } else {
        for (const review of (reviewsData ?? []) as ManualReviewRow[]) {
          reviewCountMap.set(
            review.related_id,
            (reviewCountMap.get(review.related_id) ?? 0) + 1
          );
        }
      }
    }

    // Steg 4: bygg respons der kvar error_report har eit `reports`-objekt
    // med run_id (eller null om ikkje funne) og `review_count`
    const enriched = rows.map((r) => ({
      ...r,
      reports: r.report_id
        ? { run_id: reportsMap.get(r.report_id) ?? null }
        : null,
      review_count: reviewCountMap.get(r.id) ?? 0,
    }));

    return NextResponse.json({ reports: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjend feil";
    console.error("[admin/error-reports/GET] FAILED:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}