import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
} from "docx";

// — Konstantar (duplisert frå page.tsx for no; flytt til lib/ seinare) —

const DECISION_LABELS: Record<string, string> = {
  approved: "Førebels godkjent",
  approved_with_warnings: "Godkjent med åtvaringar",
  rejected: "Avvist — må kontrollerast",
  uncertain: "Usikker",
  needs_more_input: "Treng meir informasjon",
};

const MATCH_PHRASES: Record<string, string> = {
  match: " Dei kom fram til same resultat.",
  minor_disagreement:
    " Det er små forskjellar mellom svara, hovudsakleg avrunding.",
  significant_disagreement:
    " Det er betydelege forskjellar mellom svara — sjå Agent D-vurderinga nedanfor.",
  critical_disagreement: " Det er kritiske forskjellar mellom svara.",
};

const DISCLAIMER_TEXT =
  "Dette dokumentet er generert av eit AI-basert bereknings- og dokumentasjonsverktøy. " +
  "Innhaldet skal berre brukast som støtte, læringshjelp eller førebels teknisk vurdering. " +
  "Dokumentet er ikkje ein erstatning for kontroll utført av kvalifisert fagperson, " +
  "ansvarleg prosjekterande eller godkjent føretak. Alle berekningar, føresetnader, " +
  "standardreferansar, materialdata og konklusjonar må kontrollerast av ein kompetent " +
  "byggingeniør før dei blir brukte i reelle prosjekt, byggesøknader, produksjon eller utføring.";

// — Typar (matcher det /api/agent-e returnerer) —

type AgentOutput = {
  agent_name: string;
  structured_output: {
    short_conclusion?: string;
    assumptions?: string[];
    calculation_steps?: { title: string; text: string }[];
    results?: Record<string, string>;
    limitations?: string[];
    warnings?: string[];
    confidence?: string;
  };
  prompt_version: string;
};

type FullReportResponse = {
  report: {
    id: string;
    document_id: string;
    executive_summary: string;
    technical_assessment: string;
    conclusion: string;
    prompt_version: string;
    created_at: string;
  };
  cached: boolean;
  run: { request: { raw_text: string } };
  inputReview: {
    input_status: string;
    parsed_data: unknown;
    prompt_version: string;
  } | null;
  agentA: AgentOutput;
  agentB: AgentOutput;
  comparison: { match_status: string; comparison_data: unknown } | null;
  controllerDecision: {
    decision_status: string;
    risk_level: string;
    reason: string;
    user_message: string;
    blocked_outputs: string[];
  } | null;
};

// — Paragraph-helpers —

function heading2(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: "Calibri", size: 28, bold: true })],
    spacing: { before: 360, after: 180 },
    border: {
      bottom: {
        color: "E5E5E5",
        style: BorderStyle.SINGLE,
        size: 4,
        space: 4,
      },
    },
  });
}

function heading3(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: "Calibri", size: 24, bold: true })],
    spacing: { before: 240, after: 120 },
  });
}

function body(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: "Calibri", size: 22 })],
    spacing: { after: 160 },
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: "Calibri", size: 22 })],
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function metadataLine(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: label, font: "Calibri", size: 20, color: "666666" }),
      new TextRun({ text: " ", font: "Calibri", size: 20 }),
      new TextRun({ text: value, font: "Calibri", size: 20 }),
    ],
    spacing: { after: 60 },
  });
}

function monoBox(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, font: "Consolas", size: 20 })],
    spacing: { after: 200 },
    shading: { type: ShadingType.SOLID, color: "FAFAFA", fill: "FAFAFA" },
    indent: { left: 200, right: 200 },
  });
}

// — Tabell-helpers —

function disclaimerBox(): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: {
              type: ShadingType.SOLID,
              color: "FEF9E7",
              fill: "FEF9E7",
            },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.SINGLE, size: 24, color: "D4A017" },
            },
            margins: { top: 240, bottom: 240, left: 280, right: 280 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "VIKTIG MERKNAD",
                    font: "Calibri",
                    size: 20,
                    bold: true,
                  }),
                ],
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: DISCLAIMER_TEXT,
                    font: "Calibri",
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function resultsTable(results: Record<string, string>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: Object.entries(results).map(
      ([key, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: key,
                      font: "Calibri",
                      size: 22,
                      color: "555555",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: value, font: "Calibri", size: 22 }),
                  ],
                }),
              ],
            }),
          ],
        })
    ),
  });
}

function decisionBox(label: string, message: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: {
              type: ShadingType.SOLID,
              color: "F0F4F8",
              fill: "F0F4F8",
            },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.SINGLE, size: 24, color: "4A73A8" },
            },
            margins: { top: 240, bottom: 240, left: 280, right: 280 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Agent D-avgjerd: ",
                    font: "Calibri",
                    size: 22,
                    bold: true,
                  }),
                  new TextRun({ text: label, font: "Calibri", size: 22 }),
                ],
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: message,
                    font: "Calibri",
                    size: 22,
                    italics: true,
                    color: "555555",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// — Hovuddokument-byggjar —

function buildDocument(data: FullReportResponse): Document {
  const reportDate = new Date(data.report.created_at).toLocaleDateString(
    "nn-NO",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const decisionLabel =
    DECISION_LABELS[data.controllerDecision?.decision_status ?? ""] ?? "Ukjent";
  const matchPhrase =
    MATCH_PHRASES[data.comparison?.match_status ?? ""] ?? "";

  const blocked = data.controllerDecision?.blocked_outputs ?? [];
  const isBlocked = (field: string) => blocked.includes(field);

  const primary = data.agentA;
  const children: (Paragraph | Table)[] = [];

  // Eyebrow + tittel
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "BEREKNINGSNOTAT",
          font: "Calibri",
          size: 16,
          color: "888888",
        }),
      ],
      spacing: { after: 60 },
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Ultimate Konstruktøren",
          font: "Calibri",
          size: 40,
          bold: true,
        }),
      ],
      spacing: { after: 240 },
    })
  );

  // Metadata
  children.push(metadataLine("Dokument-ID:", data.report.document_id));
  children.push(metadataLine("Dato:", reportDate));
  children.push(metadataLine("Status:", decisionLabel));
  children.push(metadataLine("Rapport-versjon:", data.report.prompt_version));

  // Disclaimer
  children.push(new Paragraph({ children: [], spacing: { after: 120 } }));
  children.push(disclaimerBox());

  // Samandrag
  children.push(heading2("Samandrag"));
  children.push(body(data.report.executive_summary));

  // Forespurnad
  children.push(heading2("Forespurnad"));
  children.push(monoBox(data.run.request.raw_text));

  // Input-tolking
  if (data.inputReview) {
    children.push(heading2("Input-tolking"));
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Status: ", font: "Calibri", size: 22 }),
          new TextRun({
            text: data.inputReview.input_status,
            font: "Calibri",
            size: 22,
            bold: true,
          }),
        ],
        spacing: { after: 160 },
      })
    );
  }

  // Føresetnader
  const assumptions = primary.structured_output.assumptions;
  if (assumptions && assumptions.length > 0) {
    children.push(heading2("Føresetnader"));
    for (const a of assumptions) children.push(bullet(a));
  }

  // Resultat
  const results = primary.structured_output.results;
  if (results && !isBlocked("results_a")) {
    children.push(heading2("Resultat"));
    children.push(resultsTable(results));
  }

  // Stegvis utrekning
  const steps = primary.structured_output.calculation_steps;
  if (steps && !isBlocked("calculation_steps_a")) {
    children.push(heading2("Stegvis utrekning"));
    steps.forEach((step, i) => {
      children.push(heading3(`${i + 1}. ${step.title}`));
      children.push(monoBox(step.text));
    });
  }

  // Fagleg vurdering
  children.push(heading2("Fagleg vurdering"));
  children.push(body(data.report.technical_assessment));

  // Kva er ikkje rekna
  const limitations = primary.structured_output.limitations;
  if (limitations && limitations.length > 0) {
    children.push(heading2("Kva er ikkje rekna"));
    for (const l of limitations) children.push(bullet(l));
  }

  // Åtvaringar
  const warnings = primary.structured_output.warnings;
  if (warnings && warnings.length > 0) {
    children.push(heading2("Åtvaringar"));
    for (const w of warnings) children.push(bullet(w));
  }

  // Agentkontroll
  children.push(heading2("Agentkontroll"));
  children.push(
    body(
      `Berekninga er løyst uavhengig av to AI-agentar (Agent A og Agent B).${matchPhrase}`
    )
  );
  if (data.controllerDecision) {
    children.push(
      decisionBox(decisionLabel, data.controllerDecision.user_message)
    );
  }

  // Konklusjon
  children.push(heading2("Konklusjon"));
  children.push(body(data.report.conclusion));

  // Footer
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generert av Ultimate Konstruktøren • ${data.report.document_id}`,
          font: "Calibri",
          size: 18,
          color: "888888",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 720, after: 60 },
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text:
            "Resultatet er førebels og må kontrollerast av fagperson før bruk i prosjektering.",
          font: "Calibri",
          size: 18,
          color: "888888",
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  return new Document({
    creator: "Ultimate Konstruktøren",
    title: `Berekningsnotat ${data.report.document_id}`,
    description: "AI-generert berekningsnotat — må kontrollerast av fagperson",
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });
}

// — Route handler —

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ run_id: string }> }
) {
  const requestStart = Date.now();
  let stage = "init";

  try {
    stage = "params";
    const { run_id } = await context.params;

    if (!run_id) {
      return NextResponse.json(
        { error: "run_id is required" },
        { status: 400 }
      );
    }

    // Vidaresend cookies frå brukaren slik at evt. Vercel-auth/Supabase-session
    // følgjer med på den interne fetchen til /api/agent-e
    stage = "fetch_data";
    const origin = request.nextUrl.origin;
    const cookieHeader = request.headers.get("cookie") ?? "";

    const agentERes = await fetch(`${origin}/api/agent-e`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ run_id }),
    });

    if (!agentERes.ok) {
      const errBody = await agentERes.json().catch(() => ({}));
      console.error("Word export: agent-e fetch failed", {
        run_id,
        status: agentERes.status,
        body: errBody,
        had_cookie: cookieHeader.length > 0,
      });
      return NextResponse.json(
        {
          error: errBody.error || "Kunne ikkje hente rapport-data",
          stage,
        },
        { status: agentERes.status }
      );
    }

    stage = "parse_data";
    const data: FullReportResponse = await agentERes.json();

    stage = "build_docx";
    const doc = buildDocument(data);

    stage = "pack_docx";
    const buffer = await Packer.toBuffer(doc);

    // Konverter Buffer til Uint8Array — ryddig BodyInit utan `as unknown` cast
    stage = "respond";
    const body = new Uint8Array(buffer);

    const elapsed = Date.now() - requestStart;
    console.log("Word export: success", {
      run_id,
      elapsed_ms: elapsed,
      size_bytes: body.length,
    });

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${data.report.document_id}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ukjend feil";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Word export error:", { stage, message, stack });
    return NextResponse.json(
      { error: message, stage },
      { status: 500 }
    );
  }
}