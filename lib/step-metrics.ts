/**
 * Steg-telemetri for agent-pipelinen (Fase 1, steg 1b).
 *
 * Kvart agent-kall gjev SDK-en eit `message`-objekt med `usage` (token-
 * bruk), `model` og `stop_reason`. I dag kastast alt. recordStepMetric
 * hentar det ut og skriv ei rad til step_metrics-tabellen.
 *
 * Designprinsipp: skriving feilar MJUKT — telemetri skal aldri stoppe ein
 * berekningskøyring. Same mønster som agent_outputs-insert i rutene.
 *
 * extractUsage er rein og unit-testa; recordStepMetric gjer I/O.
 */
import { getSupabase } from "@/lib/supabase";

/** Token-bruk plukka ut av SDK-en sin message.usage. */
export type StepUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheCreationTokens: number | null;
};

const SAFE_STEP_STATUSES = [
  "completed",
  "failed",
  "blocked",
  "skipped",
  "not_applicable",
] as const;

const SAFE_ERROR_CATEGORIES = [
  "none",
  "quota",
  "auth",
  "transient",
  "bad_request",
  "model_output",
  "validation",
  "unsupported_context",
  "blocked",
  "internal",
  "unknown",
  "not_applicable",
] as const;

export type StepMetricStatus = (typeof SAFE_STEP_STATUSES)[number];
export type StepMetricErrorCategory = (typeof SAFE_ERROR_CATEGORIES)[number];

/**
 * Minimal form av SDK-message-objektet — only felta vi treng. SDK-typen
 * er breiare; dette held kontrakta smal og testbar.
 */
export type MetricMessage = {
  model?: string | null;
  stop_reason?: string | null;
  usage?: {
    input_tokens?: number | null;
    output_tokens?: number | null;
    cache_read_input_tokens?: number | null;
    cache_creation_input_tokens?: number | null;
  } | null;
};

/** Heiltal >= 0, elles null. Toler undefined/NaN/negative. */
function intOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value);
}

function safeStepStatus(value: unknown): StepMetricStatus | null {
  return typeof value === "string" &&
    (SAFE_STEP_STATUSES as readonly string[]).includes(value)
    ? (value as StepMetricStatus)
    : null;
}

function safeErrorCategory(value: unknown): StepMetricErrorCategory | null {
  return typeof value === "string" &&
    (SAFE_ERROR_CATEGORIES as readonly string[]).includes(value)
    ? (value as StepMetricErrorCategory)
    : null;
}

/**
 * Rein uttrekk av token-bruk frå eit SDK-message. Toler manglande usage,
 * manglande cache-felt, og null/undefined message.
 */
export function extractUsage(message: MetricMessage | null | undefined): StepUsage {
  const u = message?.usage;
  return {
    inputTokens: intOrNull(u?.input_tokens),
    outputTokens: intOrNull(u?.output_tokens),
    cacheReadTokens: intOrNull(u?.cache_read_input_tokens),
    cacheCreationTokens: intOrNull(u?.cache_creation_input_tokens),
  };
}

export type RecordStepMetricInput = {
  /** Sett for konstruktør/samanliknar/kontrollør/rapportør. */
  runId?: string | null;
  /** Sett for Tolkar (køyrer før run_id finst). */
  requestId?: string | null;
  /** tolkar | konstruktor_a | konstruktor_b | samanliknar | kontrollor | rapportor */
  stepName: string;
  message: MetricMessage | null | undefined;
  promptVersion?: string | null;
  /** Veggklokke-latens for SDK-kallet, millisekund. */
  latencyMs: number;
  /** false = steget vart truncert / problematisk. */
  ok: boolean;
  /** Safe top-level release-readiness status. Nullable during rollout. */
  status?: StepMetricStatus | null;
  /** Safe terminal timestamp for release-readiness evidence. */
  completedAt?: string | null;
  /** Bounded, redacted category; never raw provider text. */
  errorCategory?: StepMetricErrorCategory | null;
  /** Safe retryability hint for failed/blocked steps. */
  retryable?: boolean | null;
  /** Explicit redaction proof; no implicit default true. */
  rawErrorRedacted?: boolean | null;
};

/**
 * Skriv ei step_metrics-rad. Feilar mjukt: loggar og returnerer, kastar
 * aldri. Hoppar over (med ei åtvaring) om korkje runId eller requestId er
 * sett — då finst ingen korrelasjonsnøkkel.
 */
export async function recordStepMetric(
  input: RecordStepMetricInput,
): Promise<void> {
  try {
    if (!input.runId && !input.requestId) {
      console.warn(
        `[step-metrics] hoppar over "${input.stepName}": korkje runId ` +
          `eller requestId — ingen korrelasjonsnøkkel.`,
      );
      return;
    }
    const usage = extractUsage(input.message);
    const supabase = getSupabase();
    const { error } = await supabase.from("step_metrics").insert({
      run_id: input.runId ?? null,
      request_id: input.requestId ?? null,
      step_name: input.stepName,
      model: input.message?.model ?? null,
      prompt_version: input.promptVersion ?? null,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cache_read_tokens: usage.cacheReadTokens,
      cache_creation_tokens: usage.cacheCreationTokens,
      latency_ms: Number.isFinite(input.latencyMs)
        ? Math.round(input.latencyMs)
        : null,
      stop_reason: input.message?.stop_reason ?? null,
      ok: input.ok,
      status: safeStepStatus(input.status),
      completed_at: input.completedAt ?? null,
      error_category: safeErrorCategory(input.errorCategory),
      retryable: typeof input.retryable === "boolean" ? input.retryable : null,
      raw_error_redacted:
        typeof input.rawErrorRedacted === "boolean"
          ? input.rawErrorRedacted
          : null,
    });
    if (error) {
      console.error(
        `[step-metrics] kunne ikkje lagre "${input.stepName}":`,
        error,
      );
    }
  } catch (err) {
    console.error(
      `[step-metrics] uventa feil ved lagring av "${input.stepName}":`,
      err,
    );
  }
}
