/**
 * Deterministiske detektorar (QA-spec 7.2, Fase 1 steg 3).
 *
 * Kvar detektor er eit reint predikat over éin RunRecord — ingen LLM,
 * ingen I/O. Test-agenten (steg 4) koeyrer dei mot kvar koeyring; ein
 * fiksa funn som utloeyser ein detektor = regresjons-alarm.
 *
 * REALISERT: F1, F9, F10, F16 — reine predikat over felt som faktisk
 * finst i RunRecord.
 *
 * SPEC-ONLY (detector = null i registeret): F3, F6, F13. Grunn:
 *  - F3  krev rapportor.selvkontroll_count / is_real_inconsistency —
 *        Rapportoer-outputen har ikkje desse felta.
 *  - F6  krev den rendra VISNING-badge-strengen — frontend-avleidd,
 *        ikkje lagra i RunRecord.
 *  - F13 krev eit "requested"-flagg per result_value — finst ikkje;
 *        "bad brukaren om dette" er folda inn i dimensjonerande-rolla.
 * Heller spec-only enn ein detektor som gjettar og gjev falske funn.
 */
import type { RunRecord } from "@/lib/runrecord";

/** Utfallet av éin detektor mot éin RunRecord. */
export type DetectorResult = {
  funn_id: string;
  /** true => funn-moensteret vart observert i denne koeyringa. */
  utloyst: boolean;
  /** Kort, lesbar grunngiving — kvifor utloeyst, eller kvifor ikkje. */
  bevis: string;
};

// --- defensive narrowing-hjelparar -----------------------------------
// RunRecord sine pipeline-felt er `unknown` (forma eig agentane).
// Detektorane narrow-ar trygt og degraderer til "kan ikkje avgjere"
// naar data manglar — dei skal aldri kaste.

function asRecord(x: unknown): Record<string, unknown> | null {
  return x !== null && typeof x === "object" && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : null;
}

function asArray(x: unknown): unknown[] {
  return Array.isArray(x) ? x : [];
}

function asString(x: unknown): string | null {
  return typeof x === "string" ? x : null;
}

/** structured_output for ein konstruktoer (agent_outputs-rada ber det). */
function structuredOutput(agent: unknown): Record<string, unknown> | null {
  const row = asRecord(agent);
  return row ? asRecord(row.structured_output) : null;
}

// --- F1 ---------------------------------------------------------------
// Upara noekkel (i unpaired_keys) vist som ein para numeric_differences-
// rad. Upara noeklar er rapporterings-hol, ikkje avvik.
export function detectF1(rr: RunRecord): DetectorResult {
  const id = "F1";
  const cmp = asRecord(rr.samanliknar);
  if (!cmp) {
    return { funn_id: id, utloyst: false, bevis: "Ingen Samanliknar-data." };
  }
  const unpaired = asRecord(cmp.unpaired_keys);
  if (!unpaired) {
    return {
      funn_id: id,
      utloyst: false,
      bevis: "unpaired_keys ikkje sett — ingenting aa kryssjekke.",
    };
  }
  const upara = new Set<string>(
    [...asArray(unpaired.only_a), ...asArray(unpaired.only_b)]
      .map(asString)
      .filter((s): s is string => s !== null),
  );
  const traff = asArray(cmp.numeric_differences)
    .map(asRecord)
    .filter((d): d is Record<string, unknown> => d !== null)
    .map((d) => asString(d.field))
    .filter((f): f is string => f !== null && upara.has(f));

  return traff.length > 0
    ? {
        funn_id: id,
        utloyst: true,
        bevis: `Upara noekkel vist som para avvik: ${traff.join(", ")}.`,
      }
    : { funn_id: id, utloyst: false, bevis: "Ingen upara noekkel i numeric_differences." };
}

// --- F9 ---------------------------------------------------------------
// match_status = minor_differences, men kvar numeric_differences-rad har
// percent_diff = 0. Ingen reell skilnad => skulle vore "match".
export function detectF9(rr: RunRecord): DetectorResult {
  const id = "F9";
  const cmp = asRecord(rr.samanliknar);
  if (!cmp) {
    return { funn_id: id, utloyst: false, bevis: "Ingen Samanliknar-data." };
  }
  if (cmp.match_status !== "minor_differences") {
    return {
      funn_id: id,
      utloyst: false,
      bevis: `match_status er "${asString(cmp.match_status) ?? "ukjend"}", ikkje minor_differences.`,
    };
  }
  const diffar = asArray(cmp.numeric_differences)
    .map(asRecord)
    .filter((d): d is Record<string, unknown> => d !== null);
  if (diffar.length === 0) {
    return {
      funn_id: id,
      utloyst: true,
      bevis: "minor_differences utan ein einaste numeric_differences-rad.",
    };
  }
  const alleNull = diffar.every(
    (d) => typeof d.percent_diff === "number" && d.percent_diff === 0,
  );
  return alleNull
    ? {
        funn_id: id,
        utloyst: true,
        bevis: `minor_differences, men alle ${diffar.length} avvik er 0,0 %.`,
      }
    : { funn_id: id, utloyst: false, bevis: "Minst eitt avvik er ulikt 0." };
}

// --- F10 --------------------------------------------------------------
// Konstruktoeren produserte result_roles, men tagga ingen noekkel som
// "dimensjonerande". Daa har frontend ingen dimensjonerande verdi aa
// vise og maa loefte fram ein mellomledd-/input-verdi som tile.
function f10ForAgent(
  agent: unknown,
  agentNamn: string,
): { utloyst: boolean; bevis: string } {
  const so = structuredOutput(agent);
  const roles = so ? asRecord(so.result_roles) : null;
  if (!roles || Object.keys(roles).length === 0) {
    return {
      utloyst: false,
      bevis: `${agentNamn}: ingen result_roles — F10 foereset rolle-data.`,
    };
  }
  const harDimensjonerande = Object.values(roles).some(
    (r) => r === "dimensjonerande",
  );
  return harDimensjonerande
    ? { utloyst: false, bevis: `${agentNamn}: minst éin dimensjonerande noekkel.` }
    : {
        utloyst: true,
        bevis: `${agentNamn}: result_roles sett, men ingen noekkel er dimensjonerande.`,
      };
}

export function detectF10(rr: RunRecord): DetectorResult {
  const id = "F10";
  const a = f10ForAgent(rr.konstruktor_a, "Konstruktoer A");
  const b = f10ForAgent(rr.konstruktor_b, "Konstruktoer B");
  const utloyst = a.utloyst || b.utloyst;
  return {
    funn_id: id,
    utloyst,
    bevis: utloyst
      ? [a, b].filter((x) => x.utloyst).map((x) => x.bevis).join(" ")
      : `${a.bevis} ${b.bevis}`,
  };
}

// --- F16 --------------------------------------------------------------
// Tolkar set status = relevant_ikkje_stotta, men can_calculate er
// ikkje-tom. Sjoelvmotseiande: er oppgaava utanfor omfang, kan ingenting
// reknast.
export function detectF16(rr: RunRecord): DetectorResult {
  const id = "F16";
  const tolkar = asRecord(rr.tolkar);
  if (!tolkar) {
    return { funn_id: id, utloyst: false, bevis: "Ingen Tolkar-data." };
  }
  if (tolkar.input_status !== "relevant_ikkje_stotta") {
    return {
      funn_id: id,
      utloyst: false,
      bevis: `input_status er "${asString(tolkar.input_status) ?? "ukjend"}", ikkje relevant_ikkje_stotta.`,
    };
  }
  const kanReknast = asArray(tolkar.can_calculate);
  return kanReknast.length > 0
    ? {
        funn_id: id,
        utloyst: true,
        bevis: `relevant_ikkje_stotta, men can_calculate har ${kanReknast.length} element.`,
      }
    : {
        funn_id: id,
        utloyst: false,
        bevis: "relevant_ikkje_stotta og can_calculate er tom — konsistent.",
      };
}

/** Namna paa detektorane som faktisk er realiserte. */
export const DETECTOR_NAMES = [
  "detectF1",
  "detectF9",
  "detectF10",
  "detectF16",
] as const;

/**
 * Koeyrer alle realiserte detektorar mot éin RunRecord. Test-agenten
 * (steg 4) brukar denne; ein utloeyst detektor for eit funn med status
 * "fiksa" i registeret er ein regresjon.
 */
export function runAllDetectors(rr: RunRecord): DetectorResult[] {
  return [detectF1(rr), detectF9(rr), detectF10(rr), detectF16(rr)];
}
