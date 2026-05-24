import type { ImprovementAction, IntelligenceFindingCategory } from "./types";

export type ImplementationPlanRisk = "low" | "medium" | "high";

export type ImplementationPlanStep = {
  title: string;
  detail: string;
  files?: string[];
  doneWhen?: string;
};

export type ImplementationPlan = {
  version: string;
  actionId: string;
  generatedAt: string;
  mode: "human_approval_required";
  summary: string;
  category: IntelligenceFindingCategory;
  riskLevel: ImplementationPlanRisk;
  expectedImpact: string;
  recommendedBranch: string;
  touchedAreas: string[];
  filesToInspect: string[];
  steps: ImplementationPlanStep[];
  tests: string[];
  acceptanceCriteria: string[];
  rollbackPlan: string[];
  humanApprovalRequired: true;
  autonomousExecutionAllowed: false;
  notes: string[];
};

const VERSION = "pilar_implementation_planner_v0.1";

function includesAny(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function categoryFiles(category: IntelligenceFindingCategory): string[] {
  switch (category) {
    case "pipeline":
      return [
        "app/api/agent-a/route.ts",
        "app/api/agent-b/route.ts",
        "app/api/agent-c/route.ts",
        "app/api/agent-d/route.ts",
        "app/api/agent-e/route.ts",
        "lib/report/build-report-model.ts",
      ];
    case "product":
      return [
        "app/page.tsx",
        "app/rapport/[run_id]/page.tsx",
        "app/rapport/[run_id]/beregning/page.tsx",
        "lib/report/build-report-model.ts",
      ];
    case "cost":
      return [
        "app/api/agent-a/route.ts",
        "app/api/agent-b/route.ts",
        "app/api/agent-c/route.ts",
        "app/api/agent-d/route.ts",
        "app/api/agent-e/route.ts",
        "lib/intelligence/metrics.ts",
      ];
    case "marketing":
      return ["app/page.tsx", "app/layout.tsx", "app/admin/intelligence/page.tsx"];
    case "pricing":
      return ["app/page.tsx", "lib/intelligence/metrics.ts", "docs/pricing.md"];
    case "timing":
      return ["docs/", "app/admin/intelligence/page.tsx"];
    case "risk":
      return ["app/api/agent-d/route.ts", "lib/report/validate-report-model.ts", "lib/intelligence/metrics.ts"];
    default:
      return ["app/", "lib/"];
  }
}

function inferFiles(action: ImprovementAction): string[] {
  const text = `${action.title}\n${action.description}\n${action.expectedImpact}`;
  const files = [...categoryFiles(action.category)];

  if (includesAny(text, ["rapport", "pdf", "word", "latex", "beregning", "beregningsark"])) {
    files.push(
      "app/rapport/[run_id]/page.tsx",
      "app/rapport/[run_id]/rapport.css",
      "app/rapport/[run_id]/beregning/page.tsx",
      "app/rapport/[run_id]/beregning/beregning.css",
      "lib/report/render-docx.ts",
      "lib/report/render-calculation-latex.ts",
      "lib/report/render-calculation-docx.ts",
    );
  }

  if (includesAny(text, ["input", "tolkar", "mangelfull", "avvist", "validering"])) {
    files.push("app/api/agent-a/route.ts", "lib/report/validate-report-model.ts");
  }

  if (includesAny(text, ["ltb", "vipping", "knekking", "ec3", "stål", "gamma", "materialfaktor"])) {
    files.push("app/api/agent-a/route.ts", "app/api/agent-b/route.ts", "app/api/agent-d/route.ts", "lib/report/build-report-model.ts");
  }

  if (includesAny(text, ["kostnad", "token", "pris", "pricing", "margin"])) {
    files.push("lib/intelligence/metrics.ts", "lib/intelligence/generate-report.ts");
  }

  if (includesAny(text, ["admin", "intelligence", "dashboard", "feedback", "forslag"])) {
    files.push("app/admin/intelligence/page.tsx", "app/admin/intelligence/intelligence.css", "lib/intelligence/actions.ts");
  }

  return unique(files);
}

function inferTouchedAreas(action: ImprovementAction): string[] {
  const text = `${action.title}\n${action.description}`;
  const areas = [action.category];
  if (includesAny(text, ["rapport", "word", "pdf", "latex", "beregningsark"])) areas.push("report_export");
  if (includesAny(text, ["input", "tolkar", "mangelfull", "avvist"])) areas.push("input_validation");
  if (includesAny(text, ["kontrollør", "usikker", "avvik", "risiko"])) areas.push("quality_control");
  if (includesAny(text, ["kostnad", "token", "pris", "margin"])) areas.push("unit_economics");
  if (includesAny(text, ["marknad", "landing", "cta", "konvertering"])) areas.push("growth");
  return unique(areas);
}

function riskLevel(action: ImprovementAction): ImplementationPlanRisk {
  if (action.riskLevel === "high" || action.priority === "critical") return "high";
  if (action.riskLevel === "medium" || action.effort === "large") return "medium";

  const text = `${action.title}\n${action.description}`;
  if (includesAny(text, ["supabase", "rls", "betaling", "pris", "auth", "security", "sikkerheit", "main", "produksjon"])) {
    return "high";
  }
  if (includesAny(text, ["agent", "prompt", "kontrollør", "beregning", "standard", "eurokode"])) {
    return "medium";
  }
  return "low";
}

export function buildImplementationPlan(action: ImprovementAction): ImplementationPlan {
  const filesToInspect = inferFiles(action);
  const touchedAreas = inferTouchedAreas(action);
  const risk = riskLevel(action);
  const branchSlug = action.title
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "intelligence-action";

  const steps: ImplementationPlanStep[] = [
    {
      title: "Avklar mål og avgrensing",
      detail: "Skriv éi setning om kva som skal bli betre, og kva som ikkje skal endrast i denne runden.",
      doneWhen: "Tiltaket har eit tydeleg scope som kan testast utan å tolke intensjonen på nytt.",
    },
    {
      title: "Les relevante filer før endring",
      detail: "Gå gjennom filene under og identifiser minst mogleg endring som løyser problemet.",
      files: filesToInspect.slice(0, 10),
      doneWhen: "Du veit kvar endringa høyrer heime, og har unngått å endre urelaterte delar.",
    },
    {
      title: "Implementer minste trygge endring",
      detail: "Lag ein liten, isolert patch. Unngå store refaktoreringar dersom tiltaket berre krev ein regel, tekst, prompt eller UI-justering.",
      files: filesToInspect.slice(0, 6),
      doneWhen: "Patchen er liten nok til å reviewast raskt og kan reverserast lett.",
    },
    {
      title: "Køyr lokal kvalitetssjekk",
      detail: "Køyr typecheck/build og minst eitt relevant manuelt testscenario frå rapport-/pipelineflyten.",
      doneWhen: "Build er grøn, og testscenarioet viser at tiltaket faktisk gir forventa effekt.",
    },
    {
      title: "Logg resultat tilbake til agenten",
      detail: "Marker tiltaket som implementert eller verifisert i intelligence-boardet, og skriv kort kva som fungerte/ikkje fungerte.",
      doneWhen: "Agenten har feedback som kan brukast i morgondagens prioritering.",
    },
  ];

  const tests = [
    "npm run debug:sweep",
    "npm run build",
  ];

  if (touchedAreas.includes("report_export")) {
    tests.push("Generer ein rapport og test PDF, Word, LaTeX og beregningsark manuelt.");
  }
  if (touchedAreas.includes("input_validation")) {
    tests.push("Test ein komplett input og ein mangelfull input. Mangelfull input skal stoppast eller få tydeleg forbehold.");
  }
  if (touchedAreas.includes("quality_control")) {
    tests.push("Test eit tilfelle med A/B-avvik og sjekk at Kontrollør ikkje overgodkjenner.");
  }
  if (touchedAreas.includes("unit_economics")) {
    tests.push("Sjekk at manglande kostnadstabellar ikkje krasjar intelligence-rapporten.");
  }

  return {
    version: VERSION,
    actionId: action.id,
    generatedAt: new Date().toISOString(),
    mode: "human_approval_required",
    summary: `Plan for å gjennomføre: ${action.title}`,
    category: action.category,
    riskLevel: risk,
    expectedImpact: action.expectedImpact,
    recommendedBranch: `improve/${branchSlug}`,
    touchedAreas,
    filesToInspect,
    steps,
    tests: unique(tests),
    acceptanceCriteria: [
      "Endringa er avgrensa til tiltaket som vart godkjent.",
      "Ingen sikkerheitskritiske reglar, RLS, betalingslogikk eller produksjonsdata er endra utan eksplisitt godkjenning.",
      "Build og typecheck er grøne lokalt.",
      "Tiltaket er dokumentert i improvement action med resultat og feedback.",
    ],
    rollbackPlan: [
      "Hald patchen liten og commit for seg sjølv.",
      "Ved feil: revert committen eller restore dei endra filene frå git.",
      "Dersom tiltaket påverkar database eller adminflyt: marker improvement action som deferred/rejected med forklaring.",
    ],
    humanApprovalRequired: true,
    autonomousExecutionAllowed: false,
    notes: [
      "Dette er ein plan, ikkje autonom implementering.",
      "Agenten skal aldri endre Supabase RLS, prisar, betalingsflyt eller production secrets automatisk.",
      "Når fleire tiltak overlappar, implementer eitt tiltak om gongen og mål effekt før neste.",
    ],
  };
}
