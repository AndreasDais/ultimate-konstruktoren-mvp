/**
 * Golden-set — typa tilgang til golden/golden-set.json (Fase 1, steg 2).
 *
 * Golden-settet er versjonskontrollert testdata: lærebok-oppgåver med
 * kode-verifisert fasit. QA-test-agenten (steg 4) les dette for å gradere
 * pipeline-køyringar. Data ligg i JSON-fila; denne fila gjev type + ein
 * validator som golden-set.test.ts køyrer, så eit malformert sett bryt
 * `npm test`.
 *
 * QA-spec P1: fasiten er kode-verifiserbar, aldri LLM-vurdert.
 */
import rawGoldenSet from "./golden-set.json";

/** Tolkar-status — speglar input_status-enumet i pipelinen. */
export type ForventaStatus =
  | "klar"
  | "delvis_klar"
  | "mangelfull"
  | "uklart"
  | "relevant_ikkje_stotta"
  | "klar_eller_delvis_klar";

const GYLDIGE_STATUSAR: readonly ForventaStatus[] = [
  "klar",
  "delvis_klar",
  "mangelfull",
  "uklart",
  "relevant_ikkje_stotta",
  "klar_eller_delvis_klar",
];

/** Ein fasit-verdi for ei reknbar oppgåve. */
export type Fasit = {
  /** Storleiken som vert sjekka, t.d. "M_Ed". */
  storleik: string;
  verdi: number;
  eining: string;
  /** Toleranse i prosent (A/B: 2, C/D: 5). */
  toleranse_pct: number;
};

/** Éin golden-case. */
export type GoldenCase = {
  /** Stabil id, t.d. "A1", "E5". Unik i settet. */
  id: string;
  /** "A0" for det opphavlege settet, "utviding" for nye case. */
  source: "A0" | "utviding";
  gruppe: string;
  tittel: string;
  /** Inputteksten ordrett, slik han limast i Workbench. */
  input: string;
  forventa_status: ForventaStatus;
  /** Reknbar fasit, eller null for klassifiserings-/tryggleiks-oppgåver. */
  fasit: Fasit | null;
  /** Ekstra fasit-verdiar (t.d. V_Ed i tillegg til M_Ed). */
  fasit_tillegg?: Fasit[];
  /** Prosa-skildring av forventa pipeline-åtferd (E-oppgåver). */
  forventa_aatferd?: string;
  /** Metode-kravet — rett tal via feil metode tel ikkje som korrekt. */
  metode_krav: string;
  /** true => ein farleg feil her bryt Port 2. */
  port2_kritisk: boolean;
};

type GoldenSetFile = {
  _meta: Record<string, unknown>;
  cases: GoldenCase[];
};

const goldenSet = rawGoldenSet as GoldenSetFile;

/** Alle golden-case. */
export const GOLDEN_CASES: GoldenCase[] = goldenSet.cases;

/** Metadata-blokka frå JSON-fila. */
export const GOLDEN_META = goldenSet._meta;

/**
 * Validerer golden-settet strukturelt. Kastar Error ved fyrste problem.
 * Køyrt av golden-set.test.ts — eit malformert sett bryt dermed testane.
 *
 * Dette sjekkar STRUKTUR, ikkje fagleg fasit-korrektheit — fasiten må
 * framleis verifiserast av fagperson (sjå golden/README.md).
 */
export function validateGoldenSet(cases: GoldenCase[] = GOLDEN_CASES): void {
  if (cases.length === 0) {
    throw new Error("golden-set: tomt sett.");
  }

  const sett = new Set<string>();
  for (const c of cases) {
    if (!c.id || typeof c.id !== "string") {
      throw new Error(`golden-set: case manglar gyldig id (${c.tittel}).`);
    }
    if (sett.has(c.id)) {
      throw new Error(`golden-set: duplisert id "${c.id}".`);
    }
    sett.add(c.id);

    if (!GYLDIGE_STATUSAR.includes(c.forventa_status)) {
      throw new Error(
        `golden-set: case "${c.id}" har ugyldig forventa_status ` +
          `"${c.forventa_status}".`,
      );
    }

    // Eit case må enten ha reknbar fasit ELLER ein forventa_aatferd.
    if (c.fasit === null && !c.forventa_aatferd) {
      throw new Error(
        `golden-set: case "${c.id}" har korkje fasit eller ` +
          `forventa_aatferd — eitt av dei må vere sett.`,
      );
    }

    // Har eit case fasit, må talverdiane vere gyldige.
    const alleFasit = [
      ...(c.fasit ? [c.fasit] : []),
      ...(c.fasit_tillegg ?? []),
    ];
    for (const f of alleFasit) {
      if (!Number.isFinite(f.verdi)) {
        throw new Error(
          `golden-set: case "${c.id}" har ugyldig fasit-verdi for ` +
            `"${f.storleik}".`,
        );
      }
      if (!Number.isFinite(f.toleranse_pct) || f.toleranse_pct <= 0) {
        throw new Error(
          `golden-set: case "${c.id}" har ugyldig toleranse_pct for ` +
            `"${f.storleik}".`,
        );
      }
    }

    if (!c.metode_krav) {
      throw new Error(`golden-set: case "${c.id}" manglar metode_krav.`);
    }
  }
}
