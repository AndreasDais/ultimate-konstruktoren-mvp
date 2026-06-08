import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  insertReportIdempotently,
  isReportRunIdUniqueConflict,
  type ReportInsertRow,
} from "./report-save-idempotency";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const row: ReportInsertRow = {
  run_id: "1dde60e4-2875-411b-a67e-d3c694f51d6c",
  document_id: "PILAR-1DDE60E4",
  executive_summary: "Summary",
  technical_assessment: "Assessment",
  conclusion: "Conclusion",
  prompt_version: "agent_e_v0.3",
  tillit_score: 80,
  tillit_breakdown: null,
};

function createReportsClient(options: {
  insertData?: Record<string, unknown> | null;
  insertError?: { code?: string; message?: string; details?: string } | null;
  existingData?: Record<string, unknown> | null;
  existingError?: { code?: string; message?: string } | null;
}) {
  const calls: string[] = [];
  const client = {
    calls,
    from(table: "reports") {
      calls.push(`from:${table}`);
      return {
        insert(insertRow: ReportInsertRow) {
          calls.push(`insert:${insertRow.run_id}`);
          return {
            select() {
              calls.push("insert.select");
              return {
                async single() {
                  calls.push("insert.single");
                  return {
                    data: options.insertData ?? null,
                    error: options.insertError ?? null,
                  };
                },
              };
            },
          };
        },
        select(columns = "*") {
          calls.push(`select:${columns}`);
          return {
            eq(column: "run_id", value: string) {
              calls.push(`eq:${column}:${value}`);
              return {
                async maybeSingle() {
                  calls.push("maybeSingle");
                  return {
                    data: options.existingData ?? null,
                    error: options.existingError ?? null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  return client;
}

describe("report save idempotency", () => {
  it("treats reports.run_id unique errors as duplicate report races", () => {
    expect(isReportRunIdUniqueConflict({ code: "23505" })).toBe(true);
    expect(
      isReportRunIdUniqueConflict({
        message: 'duplicate key value violates unique constraint "reports_run_id_key"',
      }),
    ).toBe(true);
    expect(isReportRunIdUniqueConflict({ message: "permission denied" })).toBe(false);
  });

  it("returns the newly inserted report when insert succeeds", async () => {
    const inserted = { id: "report-new", run_id: row.run_id, document_id: row.document_id };
    const supabase = createReportsClient({ insertData: inserted });

    const result = await insertReportIdempotently(supabase, row);

    expect(result).toEqual({ report: inserted, recoveredExisting: false, error: null });
    expect(supabase.calls).not.toContain("maybeSingle");
  });

  it("loads the existing report when a duplicate run_id save races", async () => {
    const existing = { id: "report-existing", run_id: row.run_id, document_id: row.document_id };
    const supabase = createReportsClient({
      insertError: { code: "23505", message: "duplicate key value violates unique constraint" },
      existingData: existing,
    });

    const result = await insertReportIdempotently(supabase, row);

    expect(result).toEqual({ report: existing, recoveredExisting: true, error: null });
    expect(supabase.calls).toContain(`eq:run_id:${row.run_id}`);
  });

  it("keeps non-unique insert failures as errors", async () => {
    const error = { code: "42501", message: "permission denied" };
    const supabase = createReportsClient({ insertError: error });

    const result = await insertReportIdempotently(supabase, row);

    expect(result).toEqual({ report: null, recoveredExisting: false, error });
    expect(supabase.calls).not.toContain("maybeSingle");
  });

  it("loads existing report data on the report page before mounting agent-e generation", () => {
    const page = readSource("app/rapport/[run_id]/page.tsx");
    const runRead = readSource("app/api/runs/[id]/route.ts");

    expect(page).toContain('fetch(`/api/runs/${runId}?mode=resume`,');
    expect(page).toContain("`/api/runs/${runId}?share=${encodeURIComponent(urlShareToken)}`");
    expect(page).toContain("fetch(`/api/runs/${runId}`, readOptions)");
    expect(page).toContain("existingReportResponse(runData, ownerData)");
    expect(page).toContain("sourceMode: ownerData?.mode ?? data.mode ?? null");
    expect(page).toContain('data.sourceMode !== "public_report_snapshot"');
    expect(page.indexOf("if (!data && !existingReportChecked)")).toBeLessThan(
      page.indexOf("<RapportLoadingPilelinja"),
    );
    expect(runRead).toContain("executive_summary, technical_assessment, conclusion");
    expect(runRead).toContain('mode: "shared_report"');
    expect(runRead).toContain('mode: "public_report_snapshot"');
    expect(runRead).toContain('mode: "owner_resume"');
    expect(runRead).toContain("resume_requires_owner_or_share_token");
    expect(runRead).toContain('.select("id, run_status, calculation_type, started_at, completed_at, display_language")');
    expect(runRead).toContain("run.user_id !== userId");
    expect(runRead).not.toContain("input_payload");
    expect(runRead).not.toContain("output_text");
    expect(runRead).not.toContain("raw_message");
  });

  it("blocks public request resume while allowing owner-gated raw request resume", () => {
    const requestRead = readSource("app/api/requests/[id]/route.ts");

    expect(requestRead).toContain("request_resume_requires_owner_or_share_token");
    expect(requestRead).toContain('mode: "owner_request_resume"');
    expect(requestRead).toContain("requestRow.user_id !== userId");
    expect(requestRead).toContain("request: { id: requestRow.id, raw_text: requestRow.raw_text }");
    expect(requestRead).toContain("Cache-Control");
    expect(requestRead).not.toContain('select("*")');
    expect(requestRead).not.toContain("input_payload");
    expect(requestRead).not.toContain("output_text");
    expect(requestRead).not.toContain("raw_message");
  });
});
