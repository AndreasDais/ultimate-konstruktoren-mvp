import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const reportPage = readSource("app/rapport/[run_id]/page.tsx");
const pipelinePage = readSource("app/rapport/[run_id]/pipeline/page.tsx");
const helper = readSource("lib/share-link.ts");
const shareRoute = readSource("app/api/runs/[id]/share/route.ts");
const reviewRoute = readSource("app/api/runs/[id]/pipeline-review/route.ts");

describe("QR / share-link token propagation", () => {
  it("report page mints an owner share link and carries it on the QR/share card (not naked)", () => {
    expect(reportPage).toContain("appendShareToken");
    expect(reportPage).toContain("maskShareTokenForDisplay");
    // Reads an inbound share token (shared viewer) ...
    expect(reportPage).toContain('.get("share")');
    // ... or mints one for the owner via the owner-gated share route.
    expect(reportPage).toContain("/api/runs/${runId}/share");
    expect(reportPage).toContain('method: "POST"');
    // QR keeps the real share-aware URL; the visible control copies that URL
    // rather than exposing a fake share=secure-link URL.
    expect(reportPage).toContain("value={shareableUrl}");
    expect(reportPage).toContain("const shareableUrl = shareToken");
    expect(reportPage).toContain("copyShareableUrl");
    expect(reportPage).toContain("navigator.clipboard?.writeText");
    expect(reportPage).toContain("shareableDisplayText");
    expect(reportPage).toContain("qrAccessCopyLink");
    // Shared link targets the sanitized shared report flow.
    expect(reportPage).toContain("appendShareToken(stableRapportUrl, shareToken)");
    expect(reportPage).not.toContain("appendShareToken(`${stableRapportUrl}/pipeline`, shareToken)");
  });

  it("report page preserves ?share across report -> sheet navigation without linking pipeline-review", () => {
    expect(reportPage).toContain(
      "appendShareToken(`/rapport/${runId}/beregning?locale=${locale}`, shareToken)",
    );
    expect(reportPage).toContain(
      "appendShareToken(`/api/rapport/${runId}/pdf`, shareToken)",
    );
    expect(reportPage).toContain(
      "appendShareToken(`/api/rapport/${runId}/word`, shareToken)",
    );
    expect(reportPage).not.toContain("const pipelineReviewUrl");
    expect(reportPage).not.toContain("RP_LABELS.pipelineReview");
  });

  it("pipeline page preserves ?share across pipeline -> report and pipeline -> sheet navigation", () => {
    expect(pipelinePage).toContain('import { appendShareToken } from "@/lib/share-link"');
    expect(pipelinePage).toContain("const withShare = (url: string): string => appendShareToken(url, shareToken)");
    expect(pipelinePage).toContain("withShare(review.report.links.report)");
    expect(pipelinePage).toContain("withShare(review.report.links.calculationSheet)");
    // Bad/expired token fail-closed error state still links back to the report,
    // preserving the (failing) token rather than silently dropping it.
    expect(pipelinePage).toContain("withShare(`/rapport/${runId}`)");
  });

  it("share-link helper is pure/client-safe and never embeds the signing secret", () => {
    expect(helper).toContain("encodeURIComponent");
    expect(helper).not.toMatch(/from "node:|require\(|createHmac|node:crypto/);
    expect(helper).not.toContain("PIPELINE_SHARE_SIGNING_SECRET");
    expect(helper).not.toContain("createPipelineShareToken");
  });

  it("does not log the share token / secrets in the changed client pages (no-leak)", () => {
    const consoleTokenLeak = /console\.(log|info|warn|error|debug)\([^\n]*(shareToken|shareData|share_url|\btoken\b|user_?id|secret)/i;
    expect(reportPage).not.toMatch(consoleTokenLeak);
    expect(pipelinePage).not.toMatch(consoleTokenLeak);
    // The token is a bearer credential; the client must never receive the secret.
    expect(reportPage).not.toContain("PIPELINE_SHARE_SIGNING_SECRET");
    expect(pipelinePage).not.toContain("PIPELINE_SHARE_SIGNING_SECRET");
    // The shared pipeline view must not introduce raw provider payloads; it
    // renders only the sanitized PublicPipelineReview (no structured_output).
    expect(pipelinePage).not.toMatch(/structured_output|raw_message|output_text|input_payload/);
    // The share-link helper carries only an opaque token — no payloads at all.
    expect(helper).not.toMatch(/structured_output|raw_message|output_text|input_payload/);
  });

  it("keeps server boundaries intact: owner-gated minting + token-gated shared review", () => {
    // Owner mints (server-side, with the secret); shared view is verified server-side.
    expect(shareRoute).toContain("createPipelineShareToken");
    expect(shareRoute).toContain("owner_required");
    expect(reviewRoute).toContain("verifyPipelineShareToken");
    expect(reviewRoute).toContain("share_token_required");
    expect(shareRoute).toContain("new URL(`/rapport/${id}`");
    expect(readSource("app/api/runs/[id]/route.ts")).toContain('mode: "shared_report"');
    expect(readSource("app/api/runs/[id]/route.ts")).toContain("verifyPipelineShareToken");
    expect(readSource("app/api/runs/[id]/route.ts")).toContain("SHARED_REPORT_INPUT_REVIEW_SELECT");
    expect(readSource("app/api/runs/[id]/route.ts")).toContain("parsed_data: row.extracted_inputs ?? null");
    // Naked report stays a sanitized public snapshot; resume stays owner/token-gated.
    expect(readSource("app/api/runs/[id]/route.ts")).toContain(
      "resume_requires_owner_or_share_token",
    );
  });
});
