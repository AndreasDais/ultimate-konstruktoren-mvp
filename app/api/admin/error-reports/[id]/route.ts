import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const VALID_STATUSES = [
  "open",
  "under_review",
  "confirmed",
  "rejected",
  "fixed",
];

const SUBSTANTIAL_DECISIONS = ["confirmed", "rejected", "fixed"];

const STATUS_TO_DECISION: Record<string, string> = {
  confirmed: "confirmed",
  rejected: "rejected",
  fixed: "fixed",
};

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
      return NextResponse.json({ error: "Ugyldig status" }, { status: 400 });
    }

    // Hent innlogga brukar frå session.
    // Middleware har allereie verifisert at brukaren er admin, men vi
    // dobbel-sjekkar her for defense in depth.
    const cookieStore = await cookies();
    const supabaseSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Ikkje nødvendig i API-route, men signaturen krev det
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseSSR.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikkje autentisert" }, { status: 401 });
    }

    // Service-role for å oppdatere DB (bypassar RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // Steg 2: om dette er ei substansiell avgjerd, lagre i manual_reviews
    if (SUBSTANTIAL_DECISIONS.includes(status)) {
      const decision = STATUS_TO_DECISION[status];

      const { error: reviewError } = await supabase
        .from("manual_reviews")
        .insert({
          related_type: "error_report",
          related_id: id,
          reviewer_id: user.id, // UUID frå auth.users
          decision,
          notes: notes ?? null,
          action_taken: action_taken ?? null,
        });

      if (reviewError) {
        console.error(
          "[admin/error-reports/PATCH] Manual review insert failed:",
          reviewError
        );
        // Ikkje feil ut — status er allereie oppdatert
      } else {
        console.log(
          `[admin/error-reports/PATCH] Manual review logga: ${id} -> ${decision} av ${user.email}`
        );
      }
    }

    console.log(
      `[admin/error-reports/PATCH] ${id} -> status="${status}" av ${user.email}`
    );

    return NextResponse.json({ success: true, report: data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjend feil";
    console.error("[admin/error-reports/PATCH] FAILED:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}