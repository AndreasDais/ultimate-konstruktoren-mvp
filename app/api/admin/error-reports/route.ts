import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

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
  reviewer_id: string;
  decision: string;
  created_at: string;
};

type AdminRow = {
  user_id: string;
  email: string;
};

type ReviewSummary = {
  email: string;
  decision: string;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const typeFilter = searchParams.get("error_type");

    // Steg 1: hent error_reports
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

    // Steg 2: manuell JOIN for run_id (frå reports-tabellen)
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

    // Steg 3: hent reviews for desse error_reports + email-mapping for reviewers
    const errorReportIds = rows.map((r) => r.id);
    const reviewsByReportId = new Map<string, ReviewSummary[]>();

    if (errorReportIds.length > 0) {
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("manual_reviews")
        .select("related_id, reviewer_id, decision, created_at")
        .eq("related_type", "error_report")
        .in("related_id", errorReportIds)
        .order("created_at", { ascending: false });

      if (reviewsError) {
        console.error(
          "[admin/error-reports/GET] Fetch manual_reviews failed:",
          reviewsError
        );
      } else {
        const reviews = (reviewsData ?? []) as ManualReviewRow[];

        // Hent email for kvar unik reviewer_id frå admins-tabellen
        const uniqueReviewerIds = Array.from(
          new Set(reviews.map((r) => r.reviewer_id))
        );
        const reviewerEmailMap = new Map<string, string>();

        if (uniqueReviewerIds.length > 0) {
          const { data: adminsData, error: adminsError } = await supabase
            .from("admins")
            .select("user_id, email")
            .in("user_id", uniqueReviewerIds);

          if (adminsError) {
            console.error(
              "[admin/error-reports/GET] Fetch admins failed:",
              adminsError
            );
          } else {
            for (const a of (adminsData ?? []) as AdminRow[]) {
              reviewerEmailMap.set(a.user_id, a.email);
            }
          }
        }

        // Bygg map: errorReportId -> array av reviews (sortert nyaste først)
        for (const review of reviews) {
          const arr = reviewsByReportId.get(review.related_id) ?? [];
          arr.push({
            email: reviewerEmailMap.get(review.reviewer_id) ?? "ukjent",
            decision: review.decision,
            created_at: review.created_at,
          });
          reviewsByReportId.set(review.related_id, arr);
        }
      }
    }

    // Steg 4: bygg endeleg respons
    const enriched = rows.map((r) => {
      const reviews = reviewsByReportId.get(r.id) ?? [];
      return {
        ...r,
        reports: r.report_id
          ? { run_id: reportsMap.get(r.report_id) ?? null }
          : null,
        review_count: reviews.length,
        last_review: reviews[0] ?? null, // nyaste review (eller null)
      };
    });

    return NextResponse.json({ reports: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjend feil";
    console.error("[admin/error-reports/GET] FAILED:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}