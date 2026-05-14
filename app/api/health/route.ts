import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Health check-endpoint for uptime-monitoring.
 *
 * Returnerer status på alle eksterne avhengnader:
 * - Supabase (les éin rad frå reports-tabellen)
 * - Upstash Redis (PING-endpoint)
 * - Anthropic API (env-var-sjekk berre, ingen faktisk API-kall = ingen kost)
 * - Slack webhook (env-var-sjekk)
 * - Sentry (env-var-sjekk)
 *
 * HTTP-status:
 * - 200 viss alle "ok"
 * - 503 viss noko "down"
 *
 * Eksempel-bruk: Vercel-monitoring, eksternt uptime-verktøy (UptimeRobot etc).
 *
 * Køyr lokalt: curl http://localhost:3000/api/health
 */

type CheckStatus = "ok" | "down" | "skipped";
type CheckResult = { status: CheckStatus; detail?: string };

export async function GET() {
  const checks: Record<string, CheckResult> = {};

  // === Supabase ===
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      checks.supabase = { status: "down", detail: "env-variablar manglar" };
    } else {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { error } = await supabase.from("reports").select("id").limit(1);
      checks.supabase = error
        ? { status: "down", detail: error.message }
        : { status: "ok" };
    }
  } catch (e) {
    checks.supabase = {
      status: "down",
      detail: e instanceof Error ? e.message : "ukjent feil",
    };
  }

  // === Upstash Redis ===
  try {
    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      checks.upstash = { status: "down", detail: "env-variablar manglar" };
    } else {
      const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        },
      });
      checks.upstash = res.ok
        ? { status: "ok" }
        : { status: "down", detail: `HTTP ${res.status}` };
    }
  } catch (e) {
    checks.upstash = {
      status: "down",
      detail: e instanceof Error ? e.message : "ukjent feil",
    };
  }

  // === Anthropic (env-sjekk berre) ===
  checks.anthropic = {
    status: process.env.ANTHROPIC_API_KEY ? "ok" : "down",
    detail: process.env.ANTHROPIC_API_KEY ? undefined : "ANTHROPIC_API_KEY manglar",
  };

  // === Slack webhook (env-sjekk berre) ===
  checks.slack = {
    status: process.env.SLACK_WEBHOOK_URL ? "ok" : "down",
    detail: process.env.SLACK_WEBHOOK_URL ? undefined : "SLACK_WEBHOOK_URL manglar",
  };

  // === Sentry (env-sjekk berre) ===
  checks.sentry = {
    status: process.env.NEXT_PUBLIC_SENTRY_DSN ? "ok" : "down",
    detail: process.env.NEXT_PUBLIC_SENTRY_DSN
      ? undefined
      : "NEXT_PUBLIC_SENTRY_DSN manglar",
  };

  const anyDown = Object.values(checks).some((c) => c.status === "down");

  const overallStatus = anyDown ? "degraded" : "ok";
  const httpStatus = anyDown ? 503 : 200;

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: httpStatus }
  );
}