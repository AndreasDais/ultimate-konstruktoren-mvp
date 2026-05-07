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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");
    const typeFilter = searchParams.get("error_type");

    // JOIN mot reports for å hente run_id (calculation_runs.id) som
    // /rapport/[id]-sida treng. Utan denne får admin-en "Calculation run
    // not found" når dei trykker på "Sjå rapport".
    let query = supabase
      .from("error_reports")
      .select(`
        *,
        reports (
          run_id
        )
      `)
      .order("created_at", { ascending: false });

    if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
      query = query.eq("status", statusFilter);
    }
    if (typeFilter && VALID_ERROR_TYPES.includes(typeFilter)) {
      query = query.eq("error_type", typeFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[admin/error-reports/GET] Fetch failed:", error);
      return NextResponse.json(
        { error: "Klarte ikkje hente feilrapportar" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reports: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjend feil";
    console.error("[admin/error-reports/GET] FAILED:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}