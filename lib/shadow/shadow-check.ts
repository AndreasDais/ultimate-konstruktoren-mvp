/**
 * Live shadow-checks (QA-spec 9.4, Fase 1 steg 5).
 *
 * Ein deterministisk sjekk — fremst FIKS 2 sin checkLoadCombination —
 * koeyrer alt i pipelinen. Her loggar vi resultatet til shadow_checks-
 * tabellen for kvar live-koeyring, so den daglege agenten (steg 6) kan
 * triagere FARLEG-FEIL-kandidatar utan aa trenge fasit.
 *
 * Ein FARLEG-FEIL-kandidat = sjekken fann avvik OG verdiktet var
 * approving. Det er eit gale svar presentert som godkjent.
 *
 * vurderShadowKandidat er rein og unit-testa; recordShadowCheck gjer I/O
 * og feilar mjukt (telemetri skal aldri stoppe ein berekningskoeyring).
 */
import { getSupabase } from "@/lib/supabase";

/** Verdikt som tel som "godkjent" — eit avvik her er farleg. */
const APPROVING = new Set(["approved", "approved_with_warnings"]);

/** Eitt avvik fraa ein deterministisk sjekk. */
export type ShadowDeviation = {
  /** Det konstruktoeren rapporterte. */
  got: number;
  /** Sjekken si uavhengige utrekning. */
  expected: number;
  /** Kven rapporterte got. */
  agent: "A" | "B";
};

export type ShadowCheckInput = {
  runId: string;
  /** Sjekk-id, t.d. "load_combination". */
  checkId: string;
  /** Avvika sjekken fann — tom array = ingen avvik. */
  deviations: ShadowDeviation[];
  /** Pilar sitt endelege verdikt da sjekken koeyrde (etter clamp). */
  verdikt: string | null;
};

export type ShadowKandidatVurdering = {
  deviationFound: boolean;
  /** Sann = FARLEG-FEIL-kandidat: avvik funne OG verdikt approving. */
  erFarlegFeilKandidat: boolean;
  /** Det fyrste avviket — representativt for rada. null utan avvik. */
  representativtAvvik: ShadowDeviation | null;
};

/**
 * Rein vurdering: gjev eit avvik + verdikt ein FARLEG-FEIL-kandidat?
 *
 * Kandidat = sjekken fann minst eitt avvik OG verdiktet var approving.
 * Fann sjekken avvik men verdiktet alt var usikker/avvist (clampen
 * gjorde jobben), er det IKKJE ein kandidat — Pilar flagga det sjoelv.
 */
export function vurderShadowKandidat(
  deviations: ShadowDeviation[],
  verdikt: string | null,
): ShadowKandidatVurdering {
  const deviationFound = deviations.length > 0;
  const verdiktApproving = verdikt !== null && APPROVING.has(verdikt);
  return {
    deviationFound,
    erFarlegFeilKandidat: deviationFound && verdiktApproving,
    representativtAvvik: deviationFound ? deviations[0] : null,
  };
}

/**
 * Loggar ei shadow_checks-rad for éi live-koeyring. Feilar mjukt:
 * loggar og returnerer, kastar aldri. Endrar ALDRI pipelinen eller
 * verdiktet — dette er rein observasjon.
 */
export async function recordShadowCheck(
  input: ShadowCheckInput,
): Promise<void> {
  try {
    const v = vurderShadowKandidat(input.deviations, input.verdikt);
    const avvik = v.representativtAvvik;
    const supabase = getSupabase();
    const { error } = await supabase.from("shadow_checks").insert({
      run_id: input.runId,
      check_id: input.checkId,
      deviation_found: v.deviationFound,
      expected: avvik ? avvik.expected : null,
      got: avvik ? avvik.got : null,
      agent: avvik ? avvik.agent : null,
      verdikt_da_sjekken_kjorte: input.verdikt,
      er_farleg_feil_kandidat: v.erFarlegFeilKandidat,
    });
    if (error) {
      console.error(
        `[shadow-check] kunne ikkje lagre "${input.checkId}":`,
        error,
      );
    } else if (v.erFarlegFeilKandidat) {
      // Synleg spor med ein gong — ein kandidat skal ikkje gøyme seg
      // i ein tabell til den daglege agenten ser han.
      console.warn(
        `[shadow-check] FARLEG-FEIL-KANDIDAT run=${input.runId} ` +
          `check=${input.checkId}: konstruktoer ${avvik?.agent} ` +
          `rapporterte ${avvik?.got}, sjekken rekna ${avvik?.expected}, ` +
          `verdikt "${input.verdikt}".`,
      );
    }
  } catch (err) {
    console.error(
      `[shadow-check] uventa feil ved lagring av "${input.checkId}":`,
      err,
    );
  }
}
