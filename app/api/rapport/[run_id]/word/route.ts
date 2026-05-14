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
import {
  decisionStatusLabel,
  decisionStatusShort,
  matchPhrase,
  matchStatusShort,
  inputStatusLabel,
  CONFIDENCE_LABELS,
  formatPromptVersion,
} from "@/lib/format";
import { tillitVisuals, type TillitBreakdown } from "@/lib/tillit-score";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/locale";
import { getLocaleFromCookies } from "@/lib/locale";

// — Lokale konstantar (Word-spesifikke; resten kjem frå lib/format) —

const WORD_LABELS: Record<string, Record<Locale, string>> = {
  // Disclaimer
  disclaimer: {
    nb: "Dette dokumentet er generert av et AI-basert beregnings- og dokumentasjonsverktøy. Innholdet skal kun brukes som støtte, læringshjelp eller foreløpig teknisk vurdering. Dokumentet er ikke en erstatning for kontroll utført av kvalifisert fagperson, ansvarlig prosjekterende eller godkjent foretak. Alle beregninger, forutsetninger, standardreferanser, materialdata og konklusjoner må kontrolleres av en kompetent byggingeniør før de blir brukt i reelle prosjekter, byggesøknader, produksjon eller utføring.",
    nn: "Dette dokumentet er generert av eit AI-basert bereknings- og dokumentasjonsverktøy. Innhaldet skal berre brukast som støtte, læringshjelp eller førebels teknisk vurdering. Dokumentet er ikkje ein erstatning for kontroll utført av kvalifisert fagperson, ansvarleg prosjekterande eller godkjent føretak. Alle berekningar, føresetnader, standardreferansar, materialdata og konklusjonar må kontrollerast av ein kompetent byggingeniør før dei blir brukte i reelle prosjekt, byggesøknader, produksjon eller utføring.",
  },
  viktigMerknad: { nb: "VIKTIG MERKNAD", nn: "VIKTIG MERKNAD" },
  // Tillit-blokk
  tillitSkar: { nb: "TILLIT-SKÅR", nn: "TILLIT-SKÅR" },
  konstruktorSemje: { nb: "Konstruktør-enighet", nn: "Konstruktør-semje" },
  kontrollorVerdict: { nb: "Kontrollør-verdict", nn: "Kontrollør-verdict" },
  fullstendigheit: { nb: "Fullstendighet", nn: "Fullstendigheit" },
  tillitMaler: {
    nb: "Måler AI-pipeline-tillit. Fagperson-kontroll vises separat i Kontrollstatus nedenfor.",
    nn: "Måler AI-pipeline-tillit. Fagperson-kontroll vises separat i Kontrollstatus nedanfor.",
  },
  // Kontrollstatus-tabell
  kontrollstatus: { nb: "KONTROLLSTATUS", nn: "KONTROLLSTATUS" },
  inputTolking: { nb: "Input-tolkning", nn: "Input-tolking" },
  konstruktorA: { nb: "Konstruktør A", nn: "Konstruktør A" },
  konstruktorB: { nb: "Konstruktør B", nn: "Konstruktør B" },
  samanlikning: { nb: "Sammenligning", nn: "Samanlikning" },
  kontrollor: { nb: "Kontrollør", nn: "Kontrollør" },
  fagperson: { nb: "Fagperson", nn: "Fagperson" },
  ikkjeKontrollert: { nb: "Ikke kontrollert", nn: "Ikkje kontrollert" },
  // Forside / cover
  berekningsnotatEyebrow: { nb: "BEREGNINGSNOTAT", nn: "BEREKNINGSNOTAT" },
  pilarTitle: { nb: "Pilar", nn: "Pilar" },
  metaDokumentID: { nb: "Dokument-ID:", nn: "Dokument-ID:" },
  metaDato: { nb: "Dato:", nn: "Dato:" },
  metaStatus: { nb: "Status:", nn: "Status:" },
  metaRapportVersjon: { nb: "Rapport-versjon:", nn: "Rapport-versjon:" },
  // Seksjon-headers
  samandrag: { nb: "Sammendrag", nn: "Samandrag" },
  forespurnad: { nb: "Forespørsel", nn: "Forespurnad" },
  inputTolkingH2: { nb: "Input-tolkning", nn: "Input-tolking" },
  statusPrefix: { nb: "Status: ", nn: "Status: " },
  foresetnader: { nb: "Forutsetninger", nn: "Føresetnader" },
  resultat: { nb: "Resultat", nn: "Resultat" },
  stegvisUtrekning: { nb: "Stegvis utregning", nn: "Stegvis utrekning" },
  fagleVurdering: { nb: "Faglig vurdering", nn: "Fagleg vurdering" },
  kvaErIkkjeRekna: { nb: "Hva er ikke beregnet", nn: "Kva er ikkje rekna" },
  atvaringar: { nb: "Advarsler", nn: "Åtvaringar" },
  konstruktorkontroll: { nb: "Konstruktørkontroll", nn: "Konstruktørkontroll" },
  berekningaLoyst: {
    nb: "Beregningen er løst uavhengig av to AI-konstruktører (Konstruktør A og Konstruktør B).",
    nn: "Berekninga er løyst uavhengig av to AI-konstruktørar (Konstruktør A og Konstruktør B).",
  },
  konklusjon: { nb: "Konklusjon", nn: "Konklusjon" },
  // Footer + meta
  generertAvPilar: { nb: "Generert av Pilar", nn: "Generert av Pilar" },
  docTitle: { nb: "Beregningsnotat", nn: "Berekningsnotat" },
  docDescription: {
    nb: "AI-generert beregningsnotat — må kontrolleres av fagperson",
    nn: "AI-generert berekningsnotat — må kontrollerast av fagperson",
  },
  // Fallback
  ukjent: { nb: "Ukjent", nn: "Ukjent" },
  ukjendFeil: { nb: "Ukjent feil", nn: "Ukjend feil" },
  kunneIkkjeHente: { nb: "Kunne ikke hente rapport-data", nn: "Kunne ikkje hente rapport-data" },
};

// — Typar (matcher det /api/agent-e returnerer) —

type AgentOutput = {
  agent_name: string;
  structured_output: {
    short_conclusion?: string;
    assumptions?: string[];
    calculation_steps?: { title: string; text: string; latex_formula?: string | null }[];
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
    tillit_score: number | null;
    tillit_breakdown: TillitBreakdown | null;
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

function smallEyebrow(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: "Calibri",
        size: 16,
        color: "666666",
        bold: true,
      }),
    ],
    spacing: { after: 80 },
  });
}

// — Tabell-helpers —

function disclaimerBox(locale: Locale): Table {
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
                    text: WORD_LABELS.viktigMerknad[locale],
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
                    text: WORD_LABELS.disclaimer[locale],
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

function tillitBlock(score: number, breakdown: TillitBreakdown, locale: Locale): Table {
  const { label, color } = tillitVisuals(score, locale);
  const colorHex = color.replace("#", "");

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: {
              type: ShadingType.SOLID,
              color: "F8FAFC",
              fill: "F8FAFC",
            },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.SINGLE, size: 24, color: colorHex },
            },
            margins: { top: 240, bottom: 240, left: 280, right: 280 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: WORD_LABELS.tillitSkar[locale],
                    font: "Calibri",
                    size: 16,
                    color: "666666",
                    bold: true,
                  }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${score}/100`,
                    font: "Calibri",
                    size: 40,
                    bold: true,
                    color: colorHex,
                  }),
                  new TextRun({
                    text: `   ${label}`,
                    font: "Calibri",
                    size: 24,
                    color: colorHex,
                  }),
                ],
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${WORD_LABELS.konstruktorSemje[locale]} ${breakdown.ab_agreement}/35   ·   ${WORD_LABELS.kontrollorVerdict[locale]} ${breakdown.controller_verdict}/35   ·   ${WORD_LABELS.fullstendigheit[locale]} ${String(breakdown.completeness).replace(".", ",")}/30`,
                    font: "Calibri",
                    size: 20,
                  }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: WORD_LABELS.tillitMaler[locale],
                    font: "Calibri",
                    size: 18,
                    color: "888888",
                    italics: true,
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

function kontrollstatusTable(data: FullReportResponse, locale: Locale): Table {
  const inputStatus = data.inputReview?.input_status ?? "";
  const inputLabel = inputStatusLabel(inputStatus, locale);

  const aConf = data.agentA.structured_output.confidence ?? "";
  const aLabel = CONFIDENCE_LABELS[aConf] ?? aConf ?? "—";
  const bConf = data.agentB.structured_output.confidence ?? "";
  const bLabel = CONFIDENCE_LABELS[bConf] ?? bConf ?? "—";

  const matchStatusKey = data.comparison?.match_status ?? "";
  const matchLabel = matchStatusShort(matchStatusKey, locale);

  const decisionStatusKey = data.controllerDecision?.decision_status ?? "";
  const decisionLabel = decisionStatusShort(decisionStatusKey, locale);

  const rows: [string, string][] = [
    [WORD_LABELS.inputTolking[locale], inputLabel],
    [WORD_LABELS.konstruktorA[locale], aLabel],
    [WORD_LABELS.konstruktorB[locale], bLabel],
    [WORD_LABELS.samanlikning[locale], matchLabel],
    [WORD_LABELS.kontrollor[locale], decisionLabel],
    [WORD_LABELS.fagperson[locale], WORD_LABELS.ikkjeKontrollert[locale]],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: label,
                      font: "Calibri",
                      size: 20,
                      color: "555555",
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: value, font: "Calibri", size: 20 }),
                  ],
                }),
              ],
            }),
          ],
        })
    ),
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
                    text: "Kontrollør si avgjerd: ",
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

function buildDocument(data: FullReportResponse, locale: Locale): Document {
  const dateTag = locale === "nb" ? "nb-NO" : "nn-NO";
  const reportDate = new Date(data.report.created_at).toLocaleDateString(
    dateTag,
    { year: "numeric", month: "long", day: "numeric" }
  );

  const decisionLabel =
    decisionStatusLabel(data.controllerDecision?.decision_status ?? "", locale) ??
    WORD_LABELS.ukjent[locale];
  const matchPhraseText =
    matchPhrase(data.comparison?.match_status ?? "", locale) ?? "";

  const blocked = data.controllerDecision?.blocked_outputs ?? [];
  const isBlocked = (field: string) => blocked.includes(field);

  const primary = data.agentA;
  const children: (Paragraph | Table)[] = [];

  // Eyebrow + tittel
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: WORD_LABELS.berekningsnotatEyebrow[locale],
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
          text: "Pilar",
          font: "Calibri",
          size: 40,
          bold: true,
        }),
      ],
      spacing: { after: 240 },
    })
  );

  // Metadata
  children.push(metadataLine(WORD_LABELS.metaDokumentID[locale], data.report.document_id));
  children.push(metadataLine(WORD_LABELS.metaDato[locale], reportDate));
  children.push(metadataLine(WORD_LABELS.metaStatus[locale], decisionLabel));
  children.push(
    metadataLine(
      WORD_LABELS.metaRapportVersjon[locale],
      formatPromptVersion(data.report.prompt_version)
    )
  );

  // Tillit-skår-blokk (Fase 2) — vises berre når tillit er rekna
  if (
    data.report.tillit_score !== null &&
    data.report.tillit_breakdown !== null
  ) {
    children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    children.push(
      tillitBlock(data.report.tillit_score, data.report.tillit_breakdown, locale)
    );
  }

  // Kontrollstatus-tabell (Fase 2)
  children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
  children.push(smallEyebrow(WORD_LABELS.kontrollstatus[locale]));
  children.push(kontrollstatusTable(data, locale));

  // Disclaimer
  children.push(new Paragraph({ children: [], spacing: { after: 240 } }));
  children.push(disclaimerBox(locale));

  // Samandrag
  children.push(heading2(WORD_LABELS.samandrag[locale]));
  children.push(body(data.report.executive_summary));

  // Forespurnad
  children.push(heading2(WORD_LABELS.forespurnad[locale]));
  children.push(monoBox(data.run.request.raw_text));

  // Input-tolking
  if (data.inputReview) {
    const rawStatus = data.inputReview.input_status;
    const prettyStatus = inputStatusLabel(rawStatus, locale);
    children.push(heading2(WORD_LABELS.inputTolkingH2[locale]));
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: WORD_LABELS.statusPrefix[locale], font: "Calibri", size: 22 }),
          new TextRun({
            text: prettyStatus,
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
    children.push(heading2(WORD_LABELS.foresetnader[locale]));
    for (const a of assumptions) children.push(bullet(a));
  }

  // Resultat
  const results = primary.structured_output.results;
  if (results && !isBlocked("results_a")) {
    children.push(heading2(WORD_LABELS.resultat[locale]));
    children.push(resultsTable(results));
  }

  // Stegvis utrekning
  const steps = primary.structured_output.calculation_steps;
  if (steps && !isBlocked("calculation_steps_a")) {
    children.push(heading2(WORD_LABELS.stegvisUtrekning[locale]));
    steps.forEach((step, i) => {
      children.push(heading3(`${i + 1}. ${step.title}`));
      children.push(monoBox(step.text));
    });
  }

  // Fagleg vurdering
  children.push(heading2(WORD_LABELS.fagleVurdering[locale]));
  children.push(body(data.report.technical_assessment));

  // Kva er ikkje rekna
  const limitations = primary.structured_output.limitations;
  if (limitations && limitations.length > 0) {
    children.push(heading2(WORD_LABELS.kvaErIkkjeRekna[locale]));
    for (const l of limitations) children.push(bullet(l));
  }

  // Åtvaringar
  const warnings = primary.structured_output.warnings;
  if (warnings && warnings.length > 0) {
    children.push(heading2(WORD_LABELS.atvaringar[locale]));
    for (const w of warnings) children.push(bullet(w));
  }

  // Konstruktørkontroll (tidlegare "Agentkontroll")
  children.push(heading2(WORD_LABELS.konstruktorkontroll[locale]));
  children.push(
    body(
      `${WORD_LABELS.berekningaLoyst[locale]}${matchPhraseText}`
    )
  );
  if (data.controllerDecision) {
    children.push(
      decisionBox(decisionLabel, data.controllerDecision.user_message)
    );
  }

  // Konklusjon
  children.push(heading2(WORD_LABELS.konklusjon[locale]));
  children.push(body(data.report.conclusion));

  // Footer
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${WORD_LABELS.generertAvPilar[locale]} • ${data.report.document_id}`,
          font: "Calibri",
          size: 18,
          color: "888888",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 720, after: 60 },
    })
  );

  return new Document({
    creator: "Pilar",
    title: `${WORD_LABELS.docTitle[locale]} ${data.report.document_id}`,
    description: WORD_LABELS.docDescription[locale],
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

  // Les locale frå cookie så Word-eksporten matchar valt språk i UI
  const locale = getLocaleFromCookies(await cookies());

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
      body: JSON.stringify({ run_id, locale }),
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
          error: errBody.error || WORD_LABELS.kunneIkkjeHente[locale],
          stage,
        },
        { status: agentERes.status }
      );
    }

    stage = "parse_data";
    const data: FullReportResponse = await agentERes.json();

    stage = "build_docx";
    const doc = buildDocument(data, locale);

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
    const message = error instanceof Error ? error.message : WORD_LABELS.ukjendFeil[locale];
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Word export error:", { stage, message, stack });
    return NextResponse.json(
      { error: message, stage },
      { status: 500 }
    );
  }
}