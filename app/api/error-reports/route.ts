import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Aksepterte feiltyper. Modal viser eit subset (5 spec'a chips), men backend
// godtek alle for bakoverkompatibilitet — admin kan også lagre andre typer.
const VALID_ERROR_TYPES = [
  "feil_talverdi",
  "feil_formel",
  "feil_standardreferanse",
  "feil_eining",
  "feil_foresetnad",
  "uklart_sprak",
  "manglande_kontroll",
  "feil_tolking", // NYTT for dag 5 (modal-chip)
  "anna",
];

const VALID_SEVERITIES = ["low", "medium", "high"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      report_id,
      error_type,       // legacy single-value (gammal inline-form)
      error_types,      // ny array (dag 5 modal)
      selected_section,
      severity_user,
      user_comment,
    } = body;

    // === Validering ===
    if (!report_id || typeof report_id !== "string") {
      return NextResponse.json(
        { error: "report_id er påkravd" },
        { status: 400 }
      );
    }

    // Aksepter enten error_types (array, ny modal) eller error_type (string, legacy form).
    // Multi-select frå modal sender alltid array.
    let typesArray: string[];
    if (Array.isArray(error_types) && error_types.length > 0) {
      typesArray = error_types;
    } else if (typeof error_type === "string" && error_type) {
      typesArray = [error_type];
    } else {
      return NextResponse.json(
        { error: "Vel minst éin feiltype" },
        { status: 400 }
      );
    }

    // Validér at alle verdiar er kjende
    for (const t of typesArray) {
      if (typeof t !== "string" || !VALID_ERROR_TYPES.includes(t)) {
        return NextResponse.json(
          { error: `Ugyldig feiltype: ${t}` },
          { status: 400 }
        );
      }
    }

    if (!selected_section || typeof selected_section !== "string") {
      return NextResponse.json(
        { error: "Vel kva seksjon feilen gjeld" },
        { status: 400 }
      );
    }
    if (severity_user && !VALID_SEVERITIES.includes(severity_user)) {
      return NextResponse.json(
        { error: "Ugyldig alvorlegheit" },
        { status: 400 }
      );
    }
    if (
      !user_comment ||
      typeof user_comment !== "string" ||
      user_comment.trim().length < 5
    ) {
      return NextResponse.json(
        { error: "Kommentaren må vere minst 5 teikn" },
        { status: 400 }
      );
    }

    // Sjekk at rapporten finst
    const { data: report } = await supabase
      .from("reports")
      .select("id")
      .eq("id", report_id)
      .maybeSingle();

    if (!report) {
      return NextResponse.json(
        { error: "Rapport ikkje funnen" },
        { status: 404 }
      );
    }

    // Dual-write: error_type held første val (for bakoverkompatibilitet med
    // admin-view som les single-value), error_types lagrar full array.
    const { data, error } = await supabase
      .from("error_reports")
      .insert({
        report_id,
        error_type: typesArray[0],
        error_types: typesArray,
        selected_section,
        severity_user: severity_user || "medium",
        user_comment: user_comment.trim(),
        status: "open",
      })
      .select()
      .single();

    if (error) {
      console.error("[error-reports] Insert failed:", error);
      return NextResponse.json(
        { error: "Kunne ikkje lagre tilbakemelding" },
        { status: 500 }
      );
    }

    console.log(
      `[error-reports] Logged: types=[${typesArray.join(",")}], section="${selected_section}", severity=${severity_user || "medium"}, report=${report_id}`
    );

    return NextResponse.json({
      success: true,
      error_report_id: data.id,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjend feil";
    console.error("[error-reports] FAILED:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}