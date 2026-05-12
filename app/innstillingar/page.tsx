import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";

// Tving server-rendring per request — sessions må sjekkast på kvar hit.
export const dynamic = "force-dynamic";

async function getCurrentUser() {
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
            // Best-effort — session-refresh skjer i middleware
          }
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("nn-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function InnstillingarPage() {
  const user = await getCurrentUser();

  // Middleware skal allereie ha kasta utlogga brukarar til /login,
  // men belt-and-suspenders.
  if (!user) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <p className="text-neutral-600">Du må vere innlogga for å sjå denne sida.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
            Innstillingar
          </p>
          <h1 className="text-3xl font-semibold text-neutral-900">Konto</h1>
        </div>

        <section className="rounded-lg border border-neutral-200 bg-white p-6 mb-4">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-4">
            Kontoinformasjon
          </h2>
          <dl className="space-y-3">
            <Row label="E-post" value={user.email ?? "—"} />
            <Row label="Konto oppretta" value={formatDate(user.created_at)} />
            <Row label="Siste innlogging" value={formatDate(user.last_sign_in_at)} />
          </dl>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-6 mb-4">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-4">
            Pilot-status
          </h2>
          <p className="text-sm text-neutral-700 leading-relaxed">
            Du er i pilot-fasen av Pilar (versjon 0.1). I denne fasen er
            brukar-preferansar (målform, eksport-format, desimalteikn) avgrensa
            — dei kjem som v0.2 etter pilot-tilbakemelding.
          </p>
          <p className="text-sm text-neutral-700 leading-relaxed mt-3">
            Tilbakemelding er velkomen. Bruk «Send feilrapport» nederst på kvar
            rapport-side, eller send e-post.
          </p>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-4">
            Konto-handlingar
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/mine"
              className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Sjå mine berekningar
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Ny berekning →
            </Link>
          </div>
          <p className="text-xs text-neutral-500 mt-4">
            Vil du slette kontoen din eller alle dine data? Send e-post til
            support, så ordnar vi det manuelt i pilot-fasen.
          </p>
        </section>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <dt className="text-sm text-neutral-600">{label}</dt>
      <dd className="text-sm text-neutral-900 text-right">{value}</dd>
    </div>
  );
}