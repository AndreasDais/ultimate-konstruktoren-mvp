import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createPipelineShareToken,
  PIPELINE_SHARE_SCOPE,
  verifyPipelineShareToken,
} from "./pipeline-share-token";

const SECRET = "0123456789abcdef0123456789abcdef";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("pipeline share tokens", () => {
  it("creates and verifies a signed review/fork token", () => {
    const created = createPipelineShareToken({
      runId: "run-123",
      nowSeconds: 1000,
      ttlSeconds: 3600,
      secret: SECRET,
      nonce: "nonce-nonce-nonce-123",
    });

    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.token).toMatch(/^pilar_share_v1\./);

    const verified = verifyPipelineShareToken({
      token: created.token,
      nowSeconds: 1200,
      secret: SECRET,
    });

    expect(verified).toEqual({
      ok: true,
      payload: {
        run_id: "run-123",
        scope: PIPELINE_SHARE_SCOPE,
        iat: 1000,
        exp: 4600,
        nonce: "nonce-nonce-nonce-123",
      },
    });
  });

  it("rejects expired, malformed, and tampered tokens", () => {
    const created = createPipelineShareToken({
      runId: "run-123",
      nowSeconds: 1000,
      ttlSeconds: 60,
      secret: SECRET,
      nonce: "nonce-nonce-nonce-123",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(
      verifyPipelineShareToken({
        token: created.token,
        nowSeconds: 1061,
        secret: SECRET,
      }),
    ).toEqual({ ok: false, error: "expired_share_token" });
    expect(
      verifyPipelineShareToken({
        token: `${created.token}tampered`,
        nowSeconds: 1001,
        secret: SECRET,
      }),
    ).toEqual({ ok: false, error: "invalid_share_token" });
    expect(
      verifyPipelineShareToken({
        token: "not-a-token",
        nowSeconds: 1001,
        secret: SECRET,
      }),
    ).toEqual({ ok: false, error: "invalid_share_token" });
  });

  it("disables creation and verification when the server secret is missing or too short", () => {
    expect(
      createPipelineShareToken({
        runId: "run-123",
        secret: "too-short",
      }),
    ).toEqual({ ok: false, error: "share_secret_missing" });
    expect(
      verifyPipelineShareToken({
        token: "pilar_share_v1.payload.signature",
        secret: null,
      }),
    ).toEqual({ ok: false, error: "share_secret_missing" });
  });

  it("keeps resume owner-only and shared review token-gated at the route boundary", () => {
    const runRoute = readSource("app/api/runs/[id]/route.ts");
    const requestRoute = readSource("app/api/requests/[id]/route.ts");
    const shareRoute = readSource("app/api/runs/[id]/share/route.ts");
    const reviewRoute = readSource("app/api/runs/[id]/pipeline-review/route.ts");
    const forkSeedRoute = readSource("app/api/pipeline-shares/[token]/fork-seed/route.ts");
    const minePage = readSource("app/mine/page.tsx");
    const pipelinePage = readSource("app/rapport/[run_id]/pipeline/page.tsx");

    expect(runRoute).toContain('mode: "owner_resume"');
    expect(runRoute).toContain("run.user_id !== userId");
    expect(runRoute).toContain("resume_requires_owner_or_share_token");
    expect(requestRoute).toContain('mode: "owner_request_resume"');
    expect(requestRoute).toContain("requestRow.user_id !== userId");
    expect(requestRoute).toContain("request_resume_requires_owner_or_share_token");
    expect(shareRoute).toContain("createPipelineShareToken");
    expect(shareRoute).toContain("share_requires_completed_run");
    expect(reviewRoute).toContain("verifyPipelineShareToken");
    expect(reviewRoute).toContain("share_token_required");
    expect(reviewRoute.indexOf('access: "owner"')).toBeLessThan(
      reviewRoute.indexOf("const verified = verifyPipelineShareToken"),
    );
    expect(reviewRoute).toContain('access: "shared"');
    expect(reviewRoute).toContain("viewer: { access: access.access }");
    expect(forkSeedRoute).toContain("verifyPipelineShareToken");
    expect(forkSeedRoute).toContain('mode: "pipeline_share_fork_seed"');
    expect(forkSeedRoute).toContain('.select("document_id")');
    expect(forkSeedRoute).toContain(
      '.select("calculation_type, extracted_inputs, can_calculate, assumptions, interpretation_summary, discipline")',
    );
    expect(forkSeedRoute).toContain("does not include the original raw prompt");
    expect(forkSeedRoute).not.toContain("parsed_data");
    expect(forkSeedRoute).not.toMatch(/raw_text|input_payload|output_text|raw_message|structured_output|user_id/i);
    expect(forkSeedRoute).not.toContain("request_id:");
    expect(minePage).toContain('href = `/?from_run=${run.id}`');
    expect(minePage).toContain('href: `/?from_request=${r.id}`');
    expect(pipelinePage).toContain("pilar-pipeline-fork-seed-v1");
    expect(pipelinePage).toContain("/?from_run=");
    expect(pipelinePage).toContain("Sharing is not configured in this environment.");
    expect(pipelinePage).toContain("Only the owner can create a share link.");
    expect(pipelinePage).toContain("A report must exist before sharing.");
  });
});
