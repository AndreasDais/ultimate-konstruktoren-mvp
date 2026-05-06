import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

const VALID_SEVERITIES = ["low", "medium", "high"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      report_id,
      error_type,
      selected_section,
      severity_user,
      user_comment,
    } = body;

    // Validering
    if (!report_id || typeof report_id !== "string") {
      return NextResponse.json(
        { error: "report_id er påkravd" },
        { status: 400 }
      );
    }
    if (!error_type || !VALID_ERROR_TYPES.includes(error_type)) {
      return NextResponse.json(
        { error: "Ugyldig feiltype" },
        { status: 400 }
      );
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

    // Lagre feilrapport
    const { data, error } = await supabase
      .from("error_reports")
      .insert({
        report_id,
        error_type,
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
        { error: "Kunne ikkje lagre feilrapport" },
        { status: 500 }
      );
    }

    console.log(
      `[error-reports] Logged: type=${error_type}, section="${selected_section}", report=${report_id}`
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