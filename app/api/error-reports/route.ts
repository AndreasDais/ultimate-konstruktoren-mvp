import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const VALID_ERROR_TYPES = [
  "feil_talverdi",
  "feil_formel",
  "feil_standardreferanse",
  "feil_eining",
  "feil_foresetnad",
  "uklart_sprak",
  "manglande_kontroll",
  "feil_tolking",
  "anna",
];

const VALID_SEVERITIES = ["low", "medium", "high"];

/**
 * Send Slack-varsling for høg-severity tilbakemelding.
 * Fire-and-forget: feilar ikkje request-en om Slack er nede.
 */
async function notifyHighSeveritySlack(payload: {
  errorReportId: string;
  reportId: string;
  errorTypes: string[];
  selectedSection: string;
  userComment: string;
  baseUrl: string;
}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[slack] SLACK_WEBHOOK_URL ikkje sett — hopper over notifikasjon");
    return;
  }

  // Trunkér kommentar til ~200 teikn for Slack-display
  const commentExcerpt =
    payload.userComment.length > 200
      ? payload.userComment.slice(0, 200) + "…"
      : payload.userComment;

  const adminUrl = `${payload.baseUrl}/admin/error-reports?highlight=${payload.errorReportId}`;

  const slackPayload = {
    text: `🚨 Høg-severity tilbakemelding på Pilar`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "🚨 Høg-severity tilbakemelding" },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Rapport-ID:*\n\`${payload.reportId.slice(0, 8)}…\``,
          },
          {
            type: "mrkdwn",
            text: `*Seksjon:*\n${payload.selectedSection}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Type feil:*\n${payload.errorTypes.map((t) => `\`${t}\``).join(", ")}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Kommentar:*\n>${commentExcerpt.replace(/\n/g, "\n>")}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Opn i admin →" },
            url: adminUrl,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[slack] Webhook returnerte ${res.status}: ${body}`);
    }
  } catch (err) {
    console.error("[slack] Webhook feila:", err);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      report_id,
      error_type,
      error_types,
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

    // Aksepter enten error_types (array, ny modal) eller error_type (string, legacy)
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

    const supabase = getSupabase();

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

    const finalSeverity = severity_user || "medium";

    const { data, error } = await supabase
      .from("error_reports")
      .insert({
        report_id,
        error_type: typesArray[0],
        error_types: typesArray,
        selected_section,
        severity_user: finalSeverity,
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
      `[error-reports] Logged: types=[${typesArray.join(",")}], section="${selected_section}", severity=${finalSeverity}, report=${report_id}`
    );

    // === SLACK-NOTIFIKASJON ved høg severity ===
    // Wrappa i try-catch så feil ikkje breaker respons-pathen til useen.
    if (finalSeverity === "high") {
      const baseUrl = new URL(request.url).origin;
      await notifyHighSeveritySlack({
        errorReportId: data.id,
        reportId: report_id,
        errorTypes: typesArray,
        selectedSection: selected_section,
        userComment: user_comment.trim(),
        baseUrl,
      });
    }

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