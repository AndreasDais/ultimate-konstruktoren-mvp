import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const PIPELINE_SHARE_TOKEN_PREFIX = "pilar_share_v1" as const;
export const PIPELINE_SHARE_SCOPE = "review_and_fork_sanitized" as const;

export type PipelineShareScope = typeof PIPELINE_SHARE_SCOPE;

export type PipelineShareTokenPayload = {
  run_id: string;
  scope: PipelineShareScope;
  iat: number;
  exp: number;
  nonce: string;
};

export type PipelineShareTokenError =
  | "share_secret_missing"
  | "invalid_share_token"
  | "expired_share_token"
  | "share_scope_not_supported";

export type VerifyPipelineShareTokenResult =
  | { ok: true; payload: PipelineShareTokenPayload }
  | { ok: false; error: PipelineShareTokenError };

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function signingSecret(explicit?: string | null): string | null {
  const secret = explicit ?? process.env.PIPELINE_SHARE_SIGNING_SECRET;
  return typeof secret === "string" && secret.trim().length >= 32
    ? secret.trim()
    : null;
}

function sign(input: string, secret: string): string {
  return base64url(createHmac("sha256", secret).update(input).digest());
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

function isPayload(value: unknown): value is PipelineShareTokenPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.run_id === "string" &&
    record.run_id.length > 0 &&
    record.scope === PIPELINE_SHARE_SCOPE &&
    typeof record.iat === "number" &&
    Number.isFinite(record.iat) &&
    typeof record.exp === "number" &&
    Number.isFinite(record.exp) &&
    typeof record.nonce === "string" &&
    record.nonce.length >= 16
  );
}

export function createPipelineShareToken(input: {
  runId: string;
  nowSeconds?: number;
  ttlSeconds?: number;
  secret?: string | null;
  nonce?: string;
}): { ok: true; token: string; payload: PipelineShareTokenPayload } | { ok: false; error: PipelineShareTokenError } {
  const secret = signingSecret(input.secret);
  if (!secret) return { ok: false, error: "share_secret_missing" };

  const runId = input.runId.trim();
  if (!runId) return { ok: false, error: "invalid_share_token" };

  const now = Math.floor(input.nowSeconds ?? Date.now() / 1000);
  const ttl = Math.max(60, Math.min(input.ttlSeconds ?? DEFAULT_TTL_SECONDS, 30 * 24 * 60 * 60));
  const payload: PipelineShareTokenPayload = {
    run_id: runId,
    scope: PIPELINE_SHARE_SCOPE,
    iat: now,
    exp: now + ttl,
    nonce: input.nonce ?? base64url(randomBytes(18)),
  };
  const payloadPart = base64url(JSON.stringify(payload));
  const signedPart = `${PIPELINE_SHARE_TOKEN_PREFIX}.${payloadPart}`;
  return {
    ok: true,
    token: `${signedPart}.${sign(signedPart, secret)}`,
    payload,
  };
}

export function verifyPipelineShareToken(input: {
  token: string | null | undefined;
  nowSeconds?: number;
  secret?: string | null;
}): VerifyPipelineShareTokenResult {
  const secret = signingSecret(input.secret);
  if (!secret) return { ok: false, error: "share_secret_missing" };

  const token = typeof input.token === "string" ? input.token.trim() : "";
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== PIPELINE_SHARE_TOKEN_PREFIX) {
    return { ok: false, error: "invalid_share_token" };
  }

  const signedPart = `${parts[0]}.${parts[1]}`;
  const expected = sign(signedPart, secret);
  if (!safeEqual(expected, parts[2])) {
    return { ok: false, error: "invalid_share_token" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64url(parts[1]));
  } catch {
    return { ok: false, error: "invalid_share_token" };
  }

  if (!isPayload(parsed)) {
    const scope = (parsed as { scope?: unknown } | null)?.scope;
    return scope && scope !== PIPELINE_SHARE_SCOPE
      ? { ok: false, error: "share_scope_not_supported" }
      : { ok: false, error: "invalid_share_token" };
  }

  const now = Math.floor(input.nowSeconds ?? Date.now() / 1000);
  if (parsed.exp < now) return { ok: false, error: "expired_share_token" };

  return { ok: true, payload: parsed };
}
