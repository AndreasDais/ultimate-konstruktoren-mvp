export type ReportInsertRow = {
  run_id: string;
  document_id: string;
  executive_summary: string;
  technical_assessment: string;
  conclusion: string;
  prompt_version: string;
  tillit_score: number | null;
  tillit_breakdown: unknown | null;
};

type SupabaseErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

type AwaitableResult<T> = PromiseLike<T> | Promise<T>;

type SupabaseReportsClient = {
  from: (table: "reports") => {
    insert: (row: ReportInsertRow) => {
      select: () => {
        single: () => AwaitableResult<{ data: Record<string, unknown> | null; error: SupabaseErrorLike | null }>;
      };
    };
    select: (columns?: string) => {
      eq: (column: "run_id", value: string) => {
        maybeSingle: () => AwaitableResult<{ data: Record<string, unknown> | null; error: SupabaseErrorLike | null }>;
      };
    };
  };
};

export type IdempotentReportInsertResult =
  | { report: Record<string, unknown>; recoveredExisting: false; error: null }
  | { report: Record<string, unknown>; recoveredExisting: true; error: null }
  | { report: null; recoveredExisting: false; error: SupabaseErrorLike };

export function isReportRunIdUniqueConflict(error: SupabaseErrorLike | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "23505") return true;

  const text = [
    error.message,
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes("reports_run_id") || (text.includes("unique") && text.includes("run_id"));
}

export async function loadExistingReportForRun(
  supabaseClient: unknown,
  runId: string,
): Promise<Record<string, unknown> | null> {
  const supabase = supabaseClient as SupabaseReportsClient;
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("run_id", runId)
    .maybeSingle();

  if (error) return null;
  return data ?? null;
}

export async function insertReportIdempotently(
  supabaseClient: unknown,
  row: ReportInsertRow,
): Promise<IdempotentReportInsertResult> {
  const supabase = supabaseClient as SupabaseReportsClient;
  const { data, error } = await supabase
    .from("reports")
    .insert(row)
    .select()
    .single();

  if (!error && data) {
    return { report: data, recoveredExisting: false, error: null };
  }

  if (isReportRunIdUniqueConflict(error)) {
    const existing = await loadExistingReportForRun(supabaseClient, row.run_id);
    if (existing) {
      return { report: existing, recoveredExisting: true, error: null };
    }
  }

  return { report: null, recoveredExisting: false, error: error ?? { message: "Report insert returned no data" } };
}
