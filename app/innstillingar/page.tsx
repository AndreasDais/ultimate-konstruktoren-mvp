import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";
import type { Locale } from "@/lib/locale";
import { getLocaleFromCookies } from "@/lib/locale";

// Tving server-rendring per request — sessions må sjekkast på kvar hit.
export const dynamic = "force-dynamic";

type LangKey = "nb" | "nn" | "en";

const INNSTILLINGAR_LABELS: Record<string, Record<LangKey, string>> = {
  maVereInnlogga: {
    nb: "Du må være innlogget for å se denne siden.",
    nn: "Du må vere innlogga for å sjå denne sida.",
    en: "You must be signed in to see this page.",
  },
  // Top
  innstillingar: { nb: "Innstillinger", nn: "Innstillingar", en: "Settings" },
  konto: { nb: "Konto", nn: "Konto", en: "Account" },
  // Kontoinformasjon
  kontoinformasjon: {
    nb: "Kontoinformasjon",
    nn: "Kontoinformasjon",
    en: "Account information",
  },
  epost: { nb: "E-post", nn: "E-post", en: "Email" },
  kontoOppretta: {
    nb: "Konto opprettet",
    nn: "Konto oppretta",
    en: "Account created",
  },
  sisteInnlogging: {
    nb: "Siste innlogging",
    nn: "Siste innlogging",
    en: "Last sign-in",
  },
  // Pilot-status
  pilotStatus: { nb: "Pilot-status", nn: "Pilot-status", en: "Pilot status" },
  pilotP1: {
    nb: "Du er i pilot-fasen av Pilar (versjon 0.1). I denne fasen er bruker-preferanser (målform, eksport-format, desimaltegn) begrenset — de kommer som v0.2 etter pilot-tilbakemelding.",
    nn: "Du er i pilot-fasen av Pilar (versjon 0.1). I denne fasen er brukar-preferansar (målform, eksport-format, desimalteikn) avgrensa — dei kjem som v0.2 etter pilot-tilbakemelding.",
    en: "You are in the pilot phase of PILAR (version 0.1). User preferences (language, export format, decimal separator) are limited during this phase — they will arrive in v0.2 after pilot feedback.",
  },
  pilotP2: {
    nb: "Tilbakemelding er velkommen. Bruk «Send feilrapport» nederst på hver rapport-side, eller send e-post.",
    nn: "Tilbakemelding er velkomen. Bruk «Send feilrapport» nederst på kvar rapport-side, eller send e-post.",
    en: "Feedback is welcome. Use \"Report an issue\" at the bottom of each report page, or send an email.",
  },
  // Konto-handlingar
  kontoHandlingar: {
    nb: "Konto-handlinger",
    nn: "Konto-handlingar",
    en: "Account actions",
  },
  saMineBerekningar: {
    nb: "Se mine beregninger",
    nn: "Sjå mine berekningar",
    en: "See my runs",
  },
  nyBerekning: {
    nb: "Ny beregning →",
    nn: "Ny berekning →",
    en: "New calculation →",
  },
  slettKontoInfo: {
    nb: "Vil du slette kontoen din eller alle dine data? Send e-post til support, så ordner vi det manuelt i pilot-fasen.",
    nn: "Vil du slette kontoen din eller alle dine data? Send e-post til support, så ordnar vi det manuelt i pilot-fasen.",
    en: "Want to delete your account or all your data? Email support and we will handle it manually during the pilot phase.",
  },
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

function formatDate(iso: string | null | undefined, langKey: LangKey): string {
  if (!iso) return "—";
  const tag = langKey === "en" ? "en-US" : langKey === "nb" ? "nb-NO" : "nn-NO";
  return new Intl.DateTimeFormat(tag, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function InnstillingarPage() {
  const cookieStore = await cookies();
  const locale: Locale = getLocaleFromCookies(cookieStore);
  const isIntl = cookieStore.get("pilar-ui-mode")?.value === "intl";
  const langKey: LangKey = isIntl ? "en" : locale;

  const user = await getCurrentUser();

  // Middleware skal allereie ha kasta utlogga usear til /login,
  // men belt-and-suspenders.
  if (!user) {
    return (
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <p style={{ color: "var(--fg-muted)" }}>{INNSTILLINGAR_LABELS.maVereInnlogga[langKey]}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--fg-muted)" }}>
            {INNSTILLINGAR_LABELS.innstillingar[langKey]}
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: "var(--fg)" }}>{INNSTILLINGAR_LABELS.konto[langKey]}</h1>
        </div>

        <section className="uk-card p-6 mb-4">
          <h2 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: "var(--fg-muted)" }}>
            {INNSTILLINGAR_LABELS.kontoinformasjon[langKey]}
          </h2>
          <dl className="space-y-3">
            <Row label={INNSTILLINGAR_LABELS.epost[langKey]} value={user.email ?? "—"} />
            <Row label={INNSTILLINGAR_LABELS.kontoOppretta[langKey]} value={formatDate(user.created_at, langKey)} />
            <Row label={INNSTILLINGAR_LABELS.sisteInnlogging[langKey]} value={formatDate(user.last_sign_in_at, langKey)} />
          </dl>
        </section>

        <section className="uk-card p-6 mb-4">
          <h2 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: "var(--fg-muted)" }}>
            {INNSTILLINGAR_LABELS.pilotStatus[langKey]}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--fg-2)" }}>
            {INNSTILLINGAR_LABELS.pilotP1[langKey]}
          </p>
          <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--fg-2)" }}>
            {INNSTILLINGAR_LABELS.pilotP2[langKey]}
          </p>
        </section>

        <section className="uk-card p-6">
          <h2 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: "var(--fg-muted)" }}>
            {INNSTILLINGAR_LABELS.kontoHandlingar[langKey]}
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/mine"
              className="uk-btn"
            >
              {INNSTILLINGAR_LABELS.saMineBerekningar[langKey]}
            </Link>
            <Link
              href="/"
              className="uk-btn uk-btn--primary"
            >
              {INNSTILLINGAR_LABELS.nyBerekning[langKey]}
            </Link>
          </div>
          <p className="text-xs mt-4" style={{ color: "var(--fg-muted)" }}>
            {INNSTILLINGAR_LABELS.slettKontoInfo[langKey]}
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
