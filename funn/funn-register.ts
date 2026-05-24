/**
 * Funn-register — typa tilgang til funn/funn-register.json
 * (QA-spec kap. 7, Fase 1 steg 3).
 *
 * F1–F16 fraa A0 som strukturert data i repoet, ikkje eit dokument —
 * det er det som gjer regresjons-deteksjon mogleg. Test-agenten (steg 4)
 * les registeret, koeyrer detektorane, og melder eit fiksa funn som dukkar
 * opp att som regresjon.
 *
 * Dette gjev type + validator. Detektorane sjoelve er i funn/detectors.ts.
 */
import rawRegister from "./funn-register.json";

export type FunnSeverity = "blokker" | "hog" | "middels" | "lag";
export type FunnStatus = "open" | "fiksa" | "regressert";

/** Eitt funn-record (QA-spec 7.1). */
export type Finding = {
  /** Stabil id, t.d. "F11". Unik. */
  id: string;
  title: string;
  description: string;
  severity: FunnSeverity;
  status: FunnStatus;
  /**
   * Namn paa detektor-funksjonen i funn/detectors.ts, eller null naar
   * funnet ikkje kan kjennast att av eit reint predikat over RunRecord
   * (spec-only — sjaa funn/README.md).
   */
  detector: string | null;
};

type RegisterFile = {
  _meta: Record<string, unknown>;
  findings: Finding[];
};

const register = rawRegister as RegisterFile;

/** Alle funn. */
export const FINDINGS: Finding[] = register.findings;

/** Slaa opp eitt funn paa id. */
export function findingById(id: string): Finding | undefined {
  return FINDINGS.find((f) => f.id === id);
}

const GYLDIG_SEVERITY: readonly FunnSeverity[] = [
  "blokker",
  "hog",
  "middels",
  "lag",
];
const GYLDIG_STATUS: readonly FunnStatus[] = ["open", "fiksa", "regressert"];

/**
 * Validerer registeret strukturelt. Kastar Error ved fyrste problem.
 * Koeyrt av funn-register.test.ts.
 *
 * `kjendeDetektorar` er namna detectors.ts faktisk eksporterer — kvart
 * funn med ein ikkje-null detector maa peike paa eit av desse, elles er
 * registeret og koden ute av takt.
 */
export function validateFunnRegister(
  findings: Finding[] = FINDINGS,
  kjendeDetektorar: readonly string[] = [],
): void {
  if (findings.length === 0) {
    throw new Error("funn-register: tomt register.");
  }
  const sett = new Set<string>();
  for (const f of findings) {
    if (!f.id) {
      throw new Error(`funn-register: funn manglar id (${f.title}).`);
    }
    if (sett.has(f.id)) {
      throw new Error(`funn-register: duplisert id "${f.id}".`);
    }
    sett.add(f.id);

    if (!GYLDIG_SEVERITY.includes(f.severity)) {
      throw new Error(
        `funn-register: "${f.id}" har ugyldig severity "${f.severity}".`,
      );
    }
    if (!GYLDIG_STATUS.includes(f.status)) {
      throw new Error(
        `funn-register: "${f.id}" har ugyldig status "${f.status}".`,
      );
    }
    if (
      f.detector !== null &&
      kjendeDetektorar.length > 0 &&
      !kjendeDetektorar.includes(f.detector)
    ) {
      throw new Error(
        `funn-register: "${f.id}" peikar paa ukjend detektor ` +
          `"${f.detector}" — finst ikkje i detectors.ts.`,
      );
    }
  }
}
