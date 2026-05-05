// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error(
    "Manglar Supabase env vars. Sjekk at NEXT_PUBLIC_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY er sett i .env.local"
  );
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});