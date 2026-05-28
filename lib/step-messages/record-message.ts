/**
 * Raw LLM envelope logger for replay (sprint 64.1).
 *
 * Skriv éi rad til step_messages-tabellen med (a) full SDK-respons-payload
 * og (b) parametra som faktisk vart sendt (model, temperature, max_tokens).
 * Saman med step_metrics (telemetri-samandrag) gir det nok til at ein
 * framtidig replay-harness kan invokere same kall på nytt og diff-e
 * resultatet.
 *
 * Designprinsipp — same som recordStepMetric:
 *  - Feilar mjukt: loggar og returnerer, kastar aldri.
 *  - Tabell-mangel skal ikkje stoppe ein berekningskøyring (relevant medan
 *    migrationen er på veg ut til Supabase-prod).
 *  - Krev anten runId eller requestId — same CHECK-constraint som tabellen.
 */
import { getSupabase } from "@/lib/supabase";

/**
 * Minimal form av SDK-message-objektet vi forventar å lagre. SDK-typen er
 * breiare; vi held kontrakta smal her og lèt jsonb-kolonnen bere resten.
 */
export type RecordableMessage = {
  id?: string | null;
  model?: string | null;
  stop_reason?: string | null;
  usage?: unknown;
  content?: unknown;
  [key: string]: unknown;
};

export type RecordStepMessageInput = {
  /** Sett for konstruktør/samanliknar/kontrollør/rapportør. */
  runId?: string | null;
  /** Sett for Tolkar (køyrer før run_id finst). */
  requestId?: string | null;
  /** tolkar | konstruktor_a | konstruktor_b | samanliknar | kontrollor | rapportor */
  stepName: string;
  /** Modell-id slik han vart sendt til SDK-en, t.d. "claude-opus-4-7". */
  model: string;
  promptVersion?: string | null;
  /** temperature slik han vart sendt. null/undefined når SDK-default brukt. */
  temperature?: number | null;
  /** max_tokens slik han vart sendt. */
  maxTokens?: number | null;
  /** Full SDK-respons. Blir lagra som jsonb. */
  rawMessage: RecordableMessage;
};

/**
 * Skriv éi step_messages-rad. Feilar mjukt: loggar og returnerer, kastar
 * aldri. Hoppar over (med ei åtvaring) om korkje runId eller requestId er
 * sett — då ville insertet feilet på CHECK-constrainten.
 */
export async function recordStepMessage(
  input: RecordStepMessageInput,
): Promise<void> {
  try {
    if (!input.runId && !input.requestId) {
      console.warn(
        `[step-messages] hoppar over "${input.stepName}": korkje runId ` +
          `eller requestId — ingen korrelasjonsnøkkel.`,
      );
      return;
    }
    if (!input.rawMessage || typeof input.rawMessage !== "object") {
      console.warn(
        `[step-messages] hoppar over "${input.stepName}": rawMessage manglar.`,
      );
      return;
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("step_messages").insert({
      run_id: input.runId ?? null,
      request_id: input.requestId ?? null,
      step_name: input.stepName,
      model: input.model,
      prompt_version: input.promptVersion ?? null,
      temperature: typeof input.temperature === "number" ? input.temperature : null,
      max_tokens: typeof input.maxTokens === "number" ? input.maxTokens : null,
      raw_message: input.rawMessage,
    });

    if (error) {
      // Tabell-mangel (PGRST205 / 42P01) er forventa medan migrationen er
      // på veg ut. Logg på warn-nivå utan å snubla; agent-routen held fram.
      console.warn(
        `[step-messages] kunne ikkje lagre "${input.stepName}":`,
        error.message ?? error,
      );
    }
  } catch (err) {
    console.warn(
      `[step-messages] uventa feil ved lagring av "${input.stepName}":`,
      err instanceof Error ? err.message : err,
    );
  }
}
