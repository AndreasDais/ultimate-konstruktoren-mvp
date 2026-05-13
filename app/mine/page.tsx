import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";
import { MineList, type MineRow } from "./MineList";

// Tving server-rendring per request — sessions må sjekkast på hver hit.
export const dynamic = "force-dynamic";

// === FORMATERING (server-only — brukt for å bygge MineRow.title) ===
function prettyCalculationType(type: string | null | undefined): string {
  if (!type) return "Berekning";
  // snake_case → "Bjelke lastverknad" (første ord stor bokstav)
  const words = type.split("_");
  return words
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// === DATA ===
async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Best-effort — session-refresh skjer i middleware.
          }
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

type RawRunRow = {
  id: string;
  request_id: string;
  run_status: string;
  started_at: string | null;
  calculation_type: string | null;
  controller_decisions:
    | { decision_status: string }
    | { decision_status: string }[]
    | null;
  reports:
    | { tillit_score: number | null; document_id: string | null }
    | { tillit_score: number | null; document_id: string | null }[]
    | null;
  agent_outputs: { agent_name: string }[] | null;
};

type RawRequestRow = {
  id: string;
  created_at: string;
  input_reviews:
    | { calculation_type: string | null }
    | { calculation_type: string | null }[]
    | null;
};

function firstOrNull<T>(x: T | T[] | null | undefined): T | null {
  if (!x) return null;
  if (Array.isArray(x)) return x[0] ?? null;
  return x;
}

async function getUserCalculations(userId: string): Promise<MineRow[]> {
  const supabase = getSupabase();

  // === LAZY CLEANUP ===
  // Marker orphaned "running"-runs eldre enn 30 min som "aborted". Skjer på
  // kvar /mine-visit — billigare enn cron-jobb for pilot-skala. Typisk
  // Pilar-berekning fullførar på 3-4 min, så 30 min er trygt: aktive runs
  // vil aldri bli markert som krasja ved feil.
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { error: cleanupError } = await supabase
    .from("calculation_runs")
    .update({ run_status: "aborted" })
    .eq("user_id", userId)
    .eq("run_status", "running")
    .lt("started_at", thirtyMinAgo);

  if (cleanupError) {
    // Ikkje fatal — fall gjennom til vanleg lasting.
    console.warn("[/mine] cleanup failed:", cleanupError.message);
  }

  // Query 1: alle calculation_runs for brukar
  const { data: runs, error: runsError } = await supabase
    .from("calculation_runs")
    .select(`
      id,
      request_id,
      run_status,
      started_at,
      calculation_type,
      controller_decisions ( decision_status ),
      reports ( tillit_score, document_id ),
      agent_outputs ( agent_name )
    `)
    .eq("user_id", userId);

  if (runsError) {
    console.error("[/mine] runs query failed:", {
      message: runsError.message,
      code: runsError.code,
      details: runsError.details,
      hint: runsError.hint,
    });
  }

  // Query 2: alle requests for brukar (vi filtrerer ut dei med run i JS)
  const { data: requests, error: requestsError } = await supabase
    .from("requests")
    .select(`
      id,
      created_at,
      input_reviews ( calculation_type )
    `)
    .eq("user_id", userId);

  if (requestsError) {
    console.error("[/mine] requests query failed:", {
      message: requestsError.message,
      code: requestsError.code,
    });
  }

  // Map calculation_runs → MineRow
  const runRows: MineRow[] = (runs ?? []).map((run: RawRunRow) => {
    const report = firstOrNull(run.reports);
    const tillit = report?.tillit_score ?? null;
    const documentId = report?.document_id ?? null;
    const hasKonstruktørOutputs = (run.agent_outputs ?? []).some(
      (a) => a.agent_name === "agent_a" || a.agent_name === "agent_b"
    );
    const isKrasja =
      run.run_status === "aborted" || run.run_status === "failed";

    let phase: MineRow["phase"];
    let href: string;
    if (documentId) {
      // Rapport finst — uansett status, vis han.
      phase = "rapport";
      href = `/rapport/${run.id}`;
    } else if (isKrasja) {
      // Krasja før rapport — send brukar til workbench for å prøve på nytt.
      phase = "krasja";
      href = `/?from_request=${run.request_id}`;
    } else if (hasKonstruktørOutputs) {
      phase = "mission_control";
      href = `/?from_run=${run.id}`;
    } else {
      phase = "workbench";
      href = `/?from_request=${run.request_id}`;
    }

    return {
      key: `run-${run.id}`,
      title: prettyCalculationType(run.calculation_type),
      date: run.started_at,
      phase,
      href,
      tillit,
      documentId,
    };
  });

  // Map requests UTAN run → workbench-only MineRow
  const requestIdsWithRuns = new Set(
    (runs ?? []).map((r: RawRunRow) => r.request_id)
  );

  const workbenchRows: MineRow[] = (requests ?? [])
    .filter((r: RawRequestRow) => !requestIdsWithRuns.has(r.id))
    .map((r: RawRequestRow) => {
      const review = firstOrNull(r.input_reviews);
      return {
        key: `req-${r.id}`,
        title: prettyCalculationType(review?.calculation_type),
        date: r.created_at,
        phase: "workbench" as const,
        href: `/?from_request=${r.id}`,
        tillit: null,
        documentId: null,
      };
    });

  // Merge + sorter (nyaste først)
  return [...runRows, ...workbenchRows].sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? "")
  );
}

// === SIDE ===
export default async function MinePage() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <p className="text-neutral-600">
          Du må vere innlogga for å sjå denne sida.
        </p>
      </main>
    );
  }

  const rows = await getUserCalculations(userId);

  return (
    <main className="flex-1 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
            Mine
          </p>
          <h1 className="text-3xl font-semibold text-neutral-900">
            Berekningar
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Oversikt over berekningar du har starta, nyaste først.
          </p>
        </div>

        {rows.length === 0 ? <EmptyState /> : <MineList rows={rows} />}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
      <p className="text-neutral-700 font-medium mb-1">
        Ingen berekningar enno
      </p>
      <p className="text-sm text-neutral-500 mb-6">
        Når du startar di første berekning, dukkar ho opp her.
      </p>
      <Link href="/" className="inline-flex items-center gap-1 rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-2 hover:bg-neutral-800 transition-colors">
        Start ei berekning →
      </Link>
    </div>
  );
}