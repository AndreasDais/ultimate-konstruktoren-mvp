export type MissingCheckSeverity = "info" | "warning" | "critical";

export type MissingCheck = {
  id: string;
  title: string;
  description: string;
  severity: MissingCheckSeverity;
};

const STEEL_KEYWORDS = ["stål", "steel", "ipe", "heb", "hea", "s355", "s275"];
const BEAM_KEYWORDS = ["bjelke", "beam", "moment", "skjær", "skjer", "qed", "qed"];
const COLUMN_KEYWORDS = ["søyle", "soyle", "column", "knekking", "buckling", "nrd", "nbrd"];

function includesAny(text: string, words: string[]) {
  const normalized = text.toLowerCase();
  return words.some((word) => normalized.includes(word));
}

export function inferMissingChecks(sourceText: string): MissingCheck[] {
  const text = sourceText.toLowerCase();
  const checks: MissingCheck[] = [];

  const steel = includesAny(text, STEEL_KEYWORDS);
  const beam = includesAny(text, BEAM_KEYWORDS);
  const column = includesAny(text, COLUMN_KEYWORDS);

  if (steel && beam && !text.includes("ltb") && !text.includes("vipping") && !text.includes("lateral")) {
    checks.push({
      id: "ltb",
      title: "LTB/vipping bør vurderes",
      description:
        "Stålbjelker uten dokumentert sideavstivning kan være styrt av lateral-torsjonal vipping. Kontroller dette før bruk i dimensjonering.",
      severity: "warning",
    });
  }

  if (beam && !text.includes("nedbøying") && !text.includes("deflection") && !text.includes("sls")) {
    checks.push({
      id: "sls_deflection",
      title: "SLS/nedbøying er ikke dokumentert",
      description:
        "For komplett vurdering bør nedbøying i bruksgrensetilstand kontrolleres, særlig i student- og prosjektrapporter.",
      severity: "info",
    });
  }

  if (steel && !text.includes("tverrsnittsklasse") && !text.includes("klasse")) {
    checks.push({
      id: "section_class",
      title: "Tverrsnittsklasse bør dokumenteres",
      description:
        "Eurokode 3-kapasitet bør normalt kobles til tverrsnittsklasse før plastisk eller elastisk kapasitet brukes.",
      severity: "info",
    });
  }

  if (beam && !text.includes("opplager") && !text.includes("support")) {
    checks.push({
      id: "supports",
      title: "Opplagerforhold bør bekreftes",
      description:
        "Moment- og skjærformler forutsetter klare opplagerforhold. Bekreft at modellen passer faktisk system.",
      severity: "warning",
    });
  }

  if (column && !text.includes("eksentrisitet") && !text.includes("moment") && !text.includes("interaksjon")) {
    checks.push({
      id: "interaction",
      title: "N-M-interaksjon kan mangle",
      description:
        "Søyler med aksialkraft og moment bør vurderes med interaksjonskontroll etter EC3 dersom lasten ikke er sentrisk.",
      severity: "warning",
    });
  }

  return checks.slice(0, 6);
}
