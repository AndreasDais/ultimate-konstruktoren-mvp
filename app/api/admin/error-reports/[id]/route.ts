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

// Status-verdiar som utløyser opprettelse av manual_reviews-rad.
// "open" og "under_review" reknast som arbeidsstatusar, ikkje endelege avgjerder.
const SUBSTANTIAL_DECISIONS = ["confirmed", "rejected", "fixed"];

// Mapping frå error_reports.status til manual_reviews.decision
const STATUS_TO_DECISION: Record<string, string> = {
  confirmed: "confirmed",
  rejected: "rejected",
  fixed: "fixed",
};

// Next.js 15+ App Router: params kjem som Promise og må await-as
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, action_taken } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Manglar feilrapport-ID" },
        { status: 400 }
      );
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Ugyldig status" },
        { status: 400 }
      );
    }

    // Steg 1: oppdater error_reports.status
    const { data, error } = await supabase
      .from("error_reports")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[admin/error-reports/PATCH] Update failed:", error);
      return NextResponse.json(
        { error: "Klarte ikkje oppdatere status" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Feilrapport ikkje funnen" },
        { status: 404 }
      );
    }

    // Steg 2: om dette er ei substansiell avgjerd, lagre i manual_reviews.
    // Vi feiler ikkje heile responsen om review-innsending feilar — status er
    // allereie oppdatert. Loggar berre.
    if (SUBSTANTIAL_DECISIONS.includes(status)) {
      const decision = STATUS_TO_DECISION[status];

      const { error: reviewError } = await supabase
        .from("manual_reviews")
        .insert({
          related_type: "error_report",
          related_id: id,
          reviewer_id: "admin", // Hardkoda — vil bli sett frå Supabase Auth seinare
          decision,
          notes: notes ?? null,
          action_taken: action_taken ?? null,
        });

      if (reviewError) {
        console.error(
          "[admin/error-reports/PATCH] Manual review insert failed:",
          reviewError
        );
      } else {
        console.log(
          `[admin/error-reports/PATCH] Manual review logga: ${id} -> ${decision}`
        );
      }
    }

    console.log(
      `[admin/error-reports/PATCH] ${id} -> status="${status}"`
    );

    return NextResponse.json({ success: true, report: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjend feil";
    console.error("[admin/error-reports/PATCH] FAILED:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}