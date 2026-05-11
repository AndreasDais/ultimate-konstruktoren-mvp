import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

/**
 * Rate-limit-helper for Pilar pilot.
 *
 * To grenser per IP per sliding window:
 * - Timesgrense: 10 requests / time
 * - Dagleggrense: 50 requests / dag
 *
 * Begge må passere for at requesten skal passere. Returnerer NextResponse
 * med status 429 og Retry-After-header viss éin av dei feilar.
 *
 * Viss UPSTASH-credentials manglar (t.d. lokal dev utan secrets), let
 * funksjonen requesten passere og loggar warning. Pilot-deploy MÅ ha
 * credentials sett — sjekk via /api/health-endpointet.
 */

function makeLimiter(
  requests: number,
  window: "1 h" | "1 d",
  prefix: string
): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      `[ratelimit] Manglar UPSTASH_REDIS_REST_URL/TOKEN — ${prefix} er deaktivert`
    );
    return null;
  }

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true, // gir oss tal på blokkerte forsøk i Upstash-dashbordet
    prefix,
  });
}

// Module-level singletons — init éin gong per cold start
const hourlyLimit = makeLimiter(10, "1 h", "pilar:hourly");
const dailyLimit = makeLimiter(50, "1 d", "pilar:daily");

/**
 * Hent klient-IP frå request-headers. Vercel set X-Forwarded-For automatisk.
 */
function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  return "unknown";
}

/**
 * Sjekk rate-limit for ein request.
 * Returnerer NextResponse med 429 viss blokkert, null viss requesten kan passere.
 */
export async function checkRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  // Viss limiters ikkje er konfigurert, let passere (dev-modus)
  if (!hourlyLimit || !dailyLimit) return null;

  const ip = getClientIp(request);

  // Sjekk timesgrense først (strengare)
  const hourly = await hourlyLimit.limit(ip);
  if (!hourly.success) {
    const retryAfterSec = Math.max(1, Math.ceil((hourly.reset - Date.now()) / 1000));
    return NextResponse.json(
      {
        error: "For mange førespurnader. Vent og prøv igjen.",
        detail: `Timesgrense overskredet (10/time). Prøv igjen om ${Math.ceil(retryAfterSec / 60)} minutt.`,
        retryAfter: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(hourly.limit),
          "X-RateLimit-Remaining": String(hourly.remaining),
          "X-RateLimit-Reset": String(hourly.reset),
        },
      }
    );
  }

  // Sjekk dagleggrense
  const daily = await dailyLimit.limit(ip);
  if (!daily.success) {
    const retryAfterSec = Math.max(1, Math.ceil((daily.reset - Date.now()) / 1000));
    return NextResponse.json(
      {
        error: "Dagleg grense nådd.",
        detail: `Dagleg rate-limit overskredet (50/dag). Prøv igjen i morgon.`,
        retryAfter: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(daily.limit),
          "X-RateLimit-Remaining": String(daily.remaining),
          "X-RateLimit-Reset": String(daily.reset),
        },
      }
    );
  }

  return null; // pass through
}