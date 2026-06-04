import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  buildAgentLiveOpsEventsFromRows,
  createSupabaseAgentLiveOpsReader,
  readAgentLiveOpsRowsFromReader,
} from "@/lib/agent-liveops/live-event-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

type AdminUser = {
  id: string;
};

type AdminCheckResult =
  | { ok: true; supabase: SupabaseClient; userId: string }
  | { ok: false; status: 401 | 403 | 500; code: string };

function env(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`missing_env:${name}`);
  }
  return value;
}

function createServiceRoleClient(): SupabaseClient {
  return createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

async function readSessionUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // API route does not need to mutate cookies for this read-only endpoint.
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ? { id: user.id } : null;
}

export async function verifyAgentLiveOpsAdmin(): Promise<AdminCheckResult> {
  const user = await readSessionUser();
  if (!user) {
    return { ok: false, status: 401, code: "unauthorized" };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[agent-liveops/events] admin verification failed");
    return { ok: false, status: 500, code: "admin_verification_failed" };
  }
  if (!data) {
    return { ok: false, status: 403, code: "forbidden" };
  }

  return { ok: true, supabase, userId: user.id };
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function safeError(status: number, code: string) {
  return jsonResponse({ error: code }, status);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { runId } = await context.params;
    if (!runId || typeof runId !== "string") {
      return safeError(400, "missing_run_id");
    }

    const admin = await verifyAgentLiveOpsAdmin();
    if (!admin.ok) {
      return safeError(admin.status, admin.code);
    }

    const reader = createSupabaseAgentLiveOpsReader(admin.supabase);
    const rows = await readAgentLiveOpsRowsFromReader(reader, runId);
    if (!rows) {
      return safeError(404, "run_not_found");
    }

    const events = buildAgentLiveOpsEventsFromRows(rows);
    if (!events.every((event) => event.redaction_status)) {
      throw new Error("agent_liveops_redaction_boundary_failed");
    }

    return jsonResponse({
      run_id: rows.run?.id ?? runId,
      mode: "diagnostic",
      read_only: true,
      human_final: true,
      events,
    });
  } catch {
    console.error("[agent-liveops/events] read failed");
    return safeError(500, "liveops_events_unavailable");
  }
}
