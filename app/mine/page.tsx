import { cookies } from "next/headers";
import type { Locale } from "@/lib/locale";
import { getLocaleFromCookies } from "@/lib/locale";
import { createServerClient } from "@supabase/ssr";
import { getSupabase } from "@/lib/supabase";
import { sweepOrphanRuns } from "@/lib/calculation-runs/sweep-orphans";
import Link from "next/link";
import { MineList, type MineRow } from "./MineList";

// Tving server-rendring per request — sessions må sjekkast på hver hit.
export const dynamic = "force-dynamic";

const MINE_LABELS: Record<string, Record<Locale, string>> = {
  // Default fallback for prettyCalculationType
  defaultBerekning: { nb: "Beregning", nn: "Berekning" },
  // Auth-gate
  maVereInnlogga: { nb: "Du må være innlogget for å se denne siden.", nn: "Du må vere innlogga for å sjå denne sida." },
  // Header
  mineEyebrow: { nb: "Mine", nn: "Mine" },
  berekningarH1: { nb: "Beregninger", nn: "Berekningar" },
  oversiktDescription: { nb: "Oversikt over beregninger du har startet, nyeste først.", nn: "Oversikt over berekningar du har starta, nyaste først." },
  // EmptyState
  ingenBerekningar: { nb: "Ingen beregninger ennå", nn: "Ingen berekningar enno" },
  narDuStartar: { nb: "Når du starter din første beregning, dukker den opp her.", nn: "Når du startar di første berekning, dukkar ho opp her." },
  startEiBerekning: { nb: "Start en beregning →", nn: "Start ei berekning →" },
};


// === FORMATERING (server-only — brukt for å bygge MineRow.title) ===
function prettyCalculationType(type: string | null | undefined, locale: Locale): string {
  if (!type) return MINE_LABELS.defaultBerekning[locale];
  const known: Record<string, Record<Locale, string>> = {
    lastkombinasjon: { nb: "Lastkombinasjon i bruddgrense", nn: "Lastkombinasjon i brotgrense" },
    bjelke_lastverknad: { nb: "Bjelke — moment og skjær", nn: "Bjelke — moment og skjerkraft" },
    armering_betongbjelke: { nb: "Armeringsberegning av betongbjelke", nn: "Armeringsberekning av betongbjelke" },
    stalkapasitet: { nb: "Kapasitetskontroll av stålbjelke", nn: "Kapasitetskontroll av stålbjelke" },
  };
  if (known[type]) return known[type][locale];
  // snake_case → "Bjelke lastverknad" (første ord stor bokstav)
  const words = type.split("_");
  return words
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function titleFromInputReview(
  review: { calculation_type: string | null; parsed_data?: unknown } | null,
  locale: Locale,
): string {
  const parsed =
    review?.parsed_data && typeof review.parsed_data === "object" && !Array.isArray(review.parsed_data)
      ? (review.parsed_data as Record<string, unknown>)
      : null;
  const reportTitle = parsed?.report_title;
  if (typeof reportTitle === "string" && reportTitle.trim()) {
    return reportTitle.trim();
  }
  return prettyCalculationType(review?.calculation_type, locale);
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
    | { calculation_type: string | null; parsed_data?: unknown }
    | { calculation_type: string | null; parsed_data?: unknown }[]
    | null;
};

function firstOrNull<T>(x: T | T[] | null | undefined): T | null {
  if (!x) return null;
  if (Array.isArray(x)) return x[0] ?? null;
  return x;
}

async function getUserCalculations(userId: string, locale: Locale): Promise<MineRow[]> {
  const supabase = getSupabase();

  // === LAZY CLEANUP ===
  // Sweep brukar sine egne orphan-runs. init-run gjer same sweep + anon
  // ved kvar ny berekning (sprint 62.0); /mine-sweepen dekker brukarar
  // som ikkje har starta nye berekningar nyleg.
  await sweepOrphanRuns(supabase, { userId });

  // Query 1: alle calculation_runs for use
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

  // Query 2: alle requests for use (vi filtrerer ut dei med run i JS)
  const { data: requests, error: requestsError } = await supabase
    .from("requests")
    .select(`
      id,
      created_at,
      input_reviews ( calculation_type, parsed_data )
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
    const hasEngineerOutputs = (run.agent_outputs ?? []).some(
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
      // Krasja før rapport — send use til workbench for å prøve på nytt.
      phase = "krasja";
      href = `/?from_request=${run.request_id}`;
    } else if (hasEngineerOutputs) {
      phase = "mission_control";
      href = `/?from_run=${run.id}`;
    } else {
      phase = "workbench";
      href = `/?from_request=${run.request_id}`;
    }

    return {
      key: `run-${run.id}`,
      title: prettyCalculationType(run.calculation_type, locale),
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
        title: titleFromInputReview(review, locale),
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
  const locale = getLocaleFromCookies(await cookies());
  const userId = await getCurrentUserId();

  if (!userId) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <p style={{ color: "var(--fg-muted)" }}>
          {MINE_LABELS.maVereInnlogga[locale]}
        </p>
      </main>
    );
  }

  const rows = await getUserCalculations(userId, locale);

  return (
    <main className="flex-1 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--fg-muted)" }}>
            {MINE_LABELS.mineEyebrow[locale]}
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: "var(--fg)" }}>
            {MINE_LABELS.berekningarH1[locale]}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
            {MINE_LABELS.oversiktDescription[locale]}
          </p>
        </div>

        {rows.length === 0 ? <EmptyState locale={locale} /> : <MineList rows={rows} />}
      </div>
    </main>
  );
}

function EmptyState({ locale }: { locale: Locale }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center" style={{ borderColor: "var(--border-2)", background: "var(--surface-2)" }}>
      <p className="font-medium mb-1" style={{ color: "var(--fg-2)" }}>
        {MINE_LABELS.ingenBerekningar[locale]}
      </p>
      <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
        {MINE_LABELS.narDuStartar[locale]}
      </p>
      <Link href="/" className="uk-btn uk-btn--primary">
        {MINE_LABELS.startEiBerekning[locale]}
      </Link>
    </div>
  );
}