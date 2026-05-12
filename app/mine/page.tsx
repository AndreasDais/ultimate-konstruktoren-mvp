import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabase } from "@/lib/supabase";
import Link from "next/link";

// Tving server-rendring per request — sessions må sjekkast på hver hit.
export const dynamic = "force-dynamic";

// === STATUS-MAPPING ===
const DECISION_LABELS: Record<string, { label: string; color: string }> = {
  approved: {
    label: "Godkjent",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  approved_with_warnings: {
    label: "Førebels",
    color: "bg-amber-50 text-amber-800 border-amber-200",
  },
  uncertain: {
    label: "Usikker",
    color: "bg-orange-50 text-orange-800 border-orange-200",
  },
  rejected: {
    label: "Avvist",
    color: "bg-red-50 text-red-800 border-red-200",
  },
};

const RUN_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Ventar", color: "bg-neutral-50 text-neutral-700 border-neutral-200" },
  running: { label: "Køyrer", color: "bg-blue-50 text-blue-800 border-blue-200" },
  completed: { label: "Ferdig", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  failed: { label: "Feila", color: "bg-red-50 text-red-800 border-red-200" },
  aborted: { label: "Avbroten", color: "bg-neutral-50 text-neutral-700 border-neutral-200" },
};

// === FORMATERING ===
function prettyCalculationType(type: string | null | undefined): string {
  if (!type) return "Berekning";
  // snake_case → "Bjelke lastverknad" (første ord stor bokstav)
  const words = type.split("_");
  return words
    .map((w, i) =>
      i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w
    )
    .join(" ");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("nn-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function getTillitColor(score: number): string {
  // Speilar fargane i tokens.css frå spec (90+ mørk grøn, 75+ grøn, 50+ okrer, <50 raud).
  if (score >= 90) return "text-emerald-800";
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
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

type CalculationRow = {
  id: string;
  run_status: string;
  started_at: string | null;
  calculation_type: string | null;
  // Embedded resources kjem som array frå PostgREST sjølv ved unique constraint —
  // vi handterer det ved å ta første element.
  controller_decisions:
    | { decision_status: string }
    | { decision_status: string }[]
    | null;
    reports:
    | { tillit_score: number | null; document_id: string | null }
    | { tillit_score: number | null; document_id: string | null }[]
    | null;
};

async function getUserCalculations(userId: string): Promise<CalculationRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("calculation_runs")
    .select(`
      id,
      run_status,
      started_at,
      calculation_type,
      controller_decisions ( decision_status ),
      reports ( tillit_score, document_id )
    `)
    .eq("user_id", userId)
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(50);

    if (error) {
        console.error("[/mine] fetch failed:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return [];
      }
  return (data ?? []) as unknown as CalculationRow[];
}

// === HELPER FOR EMBEDDED-RESOURCES ===
function firstOrNull<T>(x: T | T[] | null | undefined): T | null {
  if (!x) return null;
  if (Array.isArray(x)) return x[0] ?? null;
  return x;
}

// === SIDE ===
export default async function MinePage() {
  const userId = await getCurrentUserId();

  // Middleware skal allereie ha kasta utlogga brukarar til /login. Dette er belt-and-suspenders.
  if (!userId) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <p className="text-neutral-600">Du må vere innlogga for å sjå denne sida.</p>
      </main>
    );
  }

  const calculations = await getUserCalculations(userId);

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

        {calculations.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {calculations.map((calc) => (
              <li key={calc.id}>
                <CalculationCard calc={calc} />
              </li>
            ))}
          </ul>
        )}
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
      <Link
        href="/"
        className="inline-flex items-center gap-1 rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-2 hover:bg-neutral-800 transition-colors"
      >
        Start ei berekning →
      </Link>
    </div>
  );
}

function CalculationCard({ calc }: { calc: CalculationRow }) {
    const decision = firstOrNull(calc.controller_decisions);
    const report = firstOrNull(calc.reports);
  
    const tillit = report?.tillit_score ?? null;
    const documentId = report?.document_id ?? null;

  // Status: kontrollør-avgjerd har forrang. Fall tilbake til run_status for pågåande/feila.
  const statusInfo = decision?.decision_status
    ? DECISION_LABELS[decision.decision_status] ?? {
        label: decision.decision_status,
        color: "bg-neutral-50 text-neutral-700 border-neutral-200",
      }
    : RUN_STATUS_LABELS[calc.run_status] ?? {
        label: calc.run_status,
        color: "bg-neutral-50 text-neutral-700 border-neutral-200",
      };

  const title = prettyCalculationType(calc.calculation_type);
  const date = formatDate(calc.started_at);
  // Klikkbar berre når det finst ein rapport å lenke til.
  const isClickable = Boolean(documentId);

  const inner = (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400 hover:shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-medium text-neutral-900 truncate">{title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
            <span>{date}</span>
            {documentId && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{documentId}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {tillit !== null && (
            <div className="text-right">
              <div
                className={`text-xl font-semibold leading-none ${getTillitColor(
                  tillit
                )}`}
              >
                {tillit}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-500 mt-1">
                Tillit
              </div>
            </div>
          )}
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${statusInfo.color}`}
          >
            {statusInfo.label}
          </span>
        </div>
      </div>
    </div>
  );

  if (isClickable) {
    // NB: juster URL-pattern viss din rapport-route ikkje er /rapport/[run_id].
    return (
      <Link
        href={`/rapport/${calc.id}`}
        className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {inner}
      </Link>
    );
  }

  return inner;
}