import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";
import type { Locale } from "@/lib/locale";
import { getLocaleFromCookies } from "@/lib/locale";

// Tving server-rendring per request — sessions må sjekkast på kvar hit.
export const dynamic = "force-dynamic";

const INNSTILLINGAR_LABELS: Record<string, Record<Locale, string>> = {
  maVereInnlogga: { nb: "Du må være innlogget for å se denne siden.", nn: "Du må vere innlogga for å sjå denne sida." },
  // Top
  innstillingar: { nb: "Innstillinger", nn: "Innstillingar" },
  konto: { nb: "Konto", nn: "Konto" },
  // Kontoinformasjon
  kontoinformasjon: { nb: "Kontoinformasjon", nn: "Kontoinformasjon" },
  epost: { nb: "E-post", nn: "E-post" },
  kontoOppretta: { nb: "Konto opprettet", nn: "Konto oppretta" },
  sisteInnlogging: { nb: "Siste innlogging", nn: "Siste innlogging" },
  // Pilot-status
  pilotStatus: { nb: "Pilot-status", nn: "Pilot-status" },
  pilotP1: { nb: "Du er i pilot-fasen av Pilar (versjon 0.1). I denne fasen er bruker-preferanser (målform, eksport-format, desimaltegn) begrenset — de kommer som v0.2 etter pilot-tilbakemelding.", nn: "Du er i pilot-fasen av Pilar (versjon 0.1). I denne fasen er brukar-preferansar (målform, eksport-format, desimalteikn) avgrensa — dei kjem som v0.2 etter pilot-tilbakemelding." },
  pilotP2: { nb: "Tilbakemelding er velkommen. Bruk «Send feilrapport» nederst på hver rapport-side, eller send e-post.", nn: "Tilbakemelding er velkomen. Bruk «Send feilrapport» nederst på kvar rapport-side, eller send e-post." },
  // Konto-handlingar
  kontoHandlingar: { nb: "Konto-handlinger", nn: "Konto-handlingar" },
  saMineBerekningar: { nb: "Se mine beregninger", nn: "Sjå mine berekningar" },
  nyBerekning: { nb: "Ny beregning →", nn: "Ny berekning →" },
  slettKontoInfo: { nb: "Vil du slette kontoen din eller alle dine data? Send e-post til support, så ordner vi det manuelt i pilot-fasen.", nn: "Vil du slette kontoen din eller alle dine data? Send e-post til support, så ordnar vi det manuelt i pilot-fasen." },
};


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

function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const tag = locale === "nb" ? "nb-NO" : "nn-NO";
  return new Intl.DateTimeFormat(tag, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function InnstillingarPage() {
  const locale = getLocaleFromCookies(await cookies());
  const user = await getCurrentUser();

  // Middleware skal allereie ha kasta utlogga brukarar til /login,
  // men belt-and-suspenders.
  if (!user) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <p style={{ color: "var(--fg-muted)" }}>{INNSTILLINGAR_LABELS.maVereInnlogga[locale]}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--fg-muted)" }}>
            {INNSTILLINGAR_LABELS.innstillingar[locale]}
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: "var(--fg)" }}>{INNSTILLINGAR_LABELS.konto[locale]}</h1>
        </div>

        <section className="uk-card p-6 mb-4">
          <h2 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: "var(--fg-muted)" }}>
            {INNSTILLINGAR_LABELS.kontoinformasjon[locale]}
          </h2>
          <dl className="space-y-3">
            <Row label={INNSTILLINGAR_LABELS.epost[locale]} value={user.email ?? "—"} />
            <Row label={INNSTILLINGAR_LABELS.kontoOppretta[locale]} value={formatDate(user.created_at, locale)} />
            <Row label={INNSTILLINGAR_LABELS.sisteInnlogging[locale]} value={formatDate(user.last_sign_in_at, locale)} />
          </dl>
        </section>

        <section className="uk-card p-6 mb-4">
          <h2 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: "var(--fg-muted)" }}>
            {INNSTILLINGAR_LABELS.pilotStatus[locale]}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--fg-2)" }}>
            {INNSTILLINGAR_LABELS.pilotP1[locale]}
          </p>
          <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--fg-2)" }}>
            {INNSTILLINGAR_LABELS.pilotP2[locale]}
          </p>
        </section>

        <section className="uk-card p-6">
          <h2 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: "var(--fg-muted)" }}>
            {INNSTILLINGAR_LABELS.kontoHandlingar[locale]}
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/mine"
              className="uk-btn"
            >
              {INNSTILLINGAR_LABELS.saMineBerekningar[locale]}
            </Link>
            <Link
              href="/"
              className="uk-btn uk-btn--primary"
            >
              {INNSTILLINGAR_LABELS.nyBerekning[locale]}
            </Link>
          </div>
          <p className="text-xs mt-4" style={{ color: "var(--fg-muted)" }}>
            {INNSTILLINGAR_LABELS.slettKontoInfo[locale]}
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
      <dt className="text-sm" style={{ color: "var(--fg-muted)" }}>{label}</dt>
      <dd className="text-sm text-right" style={{ color: "var(--fg)" }}>{value}</dd>
    </div>
  );
}