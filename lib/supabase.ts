import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createResilientFetch } from "./resilient-fetch";

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Manglar Supabase env vars. Sjekk at NEXT_PUBLIC_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY er sett."
    );
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false },
    // F-open-2: bound the blast radius of transient Cloudflare/undici connect
    // blips — retry pre-send connection failures (safe; no double-write) and
    // cap each attempt. See lib/resilient-fetch.ts.
    global: { fetch: createResilientFetch() as typeof fetch },
  });

  return cachedClient;
}