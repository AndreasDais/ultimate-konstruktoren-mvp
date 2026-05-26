import Link from "next/link";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/locale";
import { getLocaleFromCookies } from "@/lib/locale";

export const metadata = {
  title: "Vilkår — Pilar",
};

// === ALLE STRENGER (bokmål default, nynorsk via toggle) ===
const VILKAR_LABELS: Record<string, Record<Locale, string>> = {
  // Topp
  eyebrow: { nb: "Pilar v0.1", nn: "Pilar v0.1" },
  h1: { nb: "Vilkår for bruk", nn: "Vilkår for bruk" },
  sistOppdatert: { nb: "Sist oppdatert: 12. mai 2026", nn: "Sist oppdatert: 12. mai 2026" },

  // Intro
  introPre: { nb: "Pilar er en ", nn: "Pilar er ein " },
  introBold: { nb: "tidlig pilot-versjon", nn: "tidleg pilot-versjon" },
  introPost: {
    nb: " av et AI-basert verktøy for norsk byggfaglig praksis. Vilkårene under gjelder for pilot-fasen og kan endres uten varsel.",
    nn: " av eit AI-basert verktøy for norsk byggfagleg praksis. Vilkåra under gjeld for pilot-fasen og kan endrast utan varsel.",
  },

  // 1. Kva Pilar er
  s1Title: { nb: "1. Hva Pilar er", nn: "1. Kva Pilar er" },
  s1P1Pre: {
    nb: "Pilar tolker og beregner konstruksjonsfaglige forespørsler (stål, betong, last) etter Eurokode og norsk nasjonalt tillegg. All output er ",
    nn: "Pilar tolkar og bereknar konstruksjonsfaglege forespurnader (stål, betong, last) etter Eurokode og norsk nasjonalt tillegg. All output er ",
  },
  s1P1Bold: { nb: "AI-generert", nn: "AI-generert" },
  s1P1Post: {
    nb: " ved hjelp av store språkmodeller og må kontrolleres av kvalifisert fagperson før bruk i reelle prosjekter.",
    nn: " ved hjelp av store språkmodellar og må kontrollerast av kvalifisert fagperson før bruk i reelle prosjekt.",
  },

  // 2. Avgrensingar og ansvar
  s2Title: { nb: "2. Begrensninger og ansvar", nn: "2. Avgrensingar og ansvar" },
  s2P1Pre: {
    nb: "Du som bruker er fullt ut ansvarlig for å verifisere alle resultater Pilar produserer. Pilar er ",
    nn: "Du som brukar er fullt ut ansvarleg for å verifisere alle resultat Pilar produserer. Pilar er ",
  },
  s2P1Bold: { nb: "ikke sertifisert", nn: "ikkje sertifisert" },
  s2P1Post: {
    nb: " for dimensjonering av reelle byggverk, og resultatene skal ikke brukes som eneste grunnlag for konstruksjonsavgjørelser.",
    nn: " for dimensjonering av reelle byggverk, og resultata skal ikkje brukast som einaste grunnlag for konstruksjonsavgjerder.",
  },
  s2P2: {
    nb: "Vi gir ingen garanti for at AI-genererte beregninger er korrekte, komplette eller i samsvar med gjeldende regelverk. Bruk av Pilar skjer på eget ansvar.",
    nn: "Vi gir ingen garanti for at AI-genererte berekningar er korrekte, komplette eller i samsvar med gjeldande regelverk. Bruk av Pilar skjer på eige ansvar.",
  },

  // 3. Data vi lagrar
  s3Title: { nb: "3. Data vi lagrer", nn: "3. Data vi lagrar" },
  s3P1: { nb: "Når du bruker Pilar, lagrer vi:", nn: "Når du brukar Pilar, lagrar vi:" },
  s3Li1: { nb: "Din e-postadresse (fra innlogging)", nn: "Di e-postadresse (frå innlogging)" },
  s3Li2: { nb: "Forespørslene du sender inn (input-tekst)", nn: "Forespurnadene du sender inn (input-tekst)" },
  s3Li3: { nb: "AI-genererte tolkninger, beregninger og rapporter", nn: "AI-genererte tolkingar, berekningar og rapportar" },
  s3Li4: { nb: "Tilbakemeldinger og feilrapporter du sender", nn: "Tilbakemeldingar og feilrapportar du sender" },
  s3P2: {
    nb: "Vi bruker dataen til å forbedre produktet og analysere kalibreringen av tillit-systemet vårt. Data blir lagret i Supabase (EU-region). Vi deler ikke dataen din med tredjepart utenfor det som er nødvendig for å levere tjenesten (Anthropic for AI-beregning, Supabase for lagring, Vercel for hosting).",
    nn: "Vi brukar dataen til å forbetre produktet og analysere kalibreringa av tillit-systemet vårt. Data blir lagra i Supabase (EU-region). Vi deler ikkje dataen din med tredjepart utanfor det som er naudsynt for å levere tenesta (Anthropic for AI-berekning, Supabase for lagring, Vercel for hosting).",
  },
  s3P3: {
    nb: "Du kan også bruke Pilar anonymt (uten innlogging) — da lagrer vi bare forespørselen og resultatet, uten bruker-kobling.",
    nn: "Du kan òg bruke Pilar anonymt (utan innlogging) — då lagrar vi berre forespurnaden og resultatet, utan brukar-kopling.",
  },

  // 4. Sletting av data
  s4Title: { nb: "4. Sletting av data", nn: "4. Sletting av data" },
  s4P1Pre: { nb: "Du har rett til å få alle dine data slettet. Send e-post til ", nn: "Du har rett til å få alle dine data sletta. Send e-post til " },
  s4P1Post: { nb: " med en forespørsel om sletting, så ordner vi det manuelt i pilot-fasen. Sletting er irreversibel.", nn: " med ein førespurnad om sletting, så ordnar vi det manuelt i pilot-fasen. Sletting er irreversibel." },

  // 5. Endringar i pilot
  s5Title: { nb: "5. Endringer i pilot", nn: "5. Endringar i pilot" },
  s5P1: {
    nb: "Pilar er under aktiv utvikling. Funksjonalitet, priser (gratis i pilot), og vilkår kan endres uten varsel. Større endringer blir kommunisert via e-post til registrerte usee.",
    nn: "Pilar er under aktiv utvikling. Funksjonalitet, prisar (gratis i pilot), og vilkår kan endrast utan varsel. Større endringar blir kommunisert via e-post til registrerte usear.",
  },

  // 6. Kontakt
  s6Title: { nb: "6. Kontakt", nn: "6. Kontakt" },
  s6P1Pre: { nb: "Spørsmål, tilbakemelding eller bekymring? Send e-post til ", nn: "Spørsmål, tilbakemelding eller bekymring? Send e-post til " },
  s6P1Post: { nb: ".", nn: "." },

  // Footer link
  tilbakePilar: { nb: "← Tilbake til Pilar", nn: "← Tilbake til Pilar" },
};

export default async function VilkarPage() {
  const locale = getLocaleFromCookies(await cookies());

  return (
    <main className="flex-1 px-4 py-8 md:py-12">
      <article className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--fg-muted)" }}>
            {VILKAR_LABELS.eyebrow[locale]}
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: "var(--fg)" }}>
            {VILKAR_LABELS.h1[locale]}
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--fg-muted)" }}>
            {VILKAR_LABELS.sistOppdatert[locale]}
          </p>
        </div>

        <div className="space-y-6">
          <p className="text-base leading-relaxed" style={{ color: "var(--fg-2)" }}>
            {VILKAR_LABELS.introPre[locale]}<strong>{VILKAR_LABELS.introBold[locale]}</strong>{VILKAR_LABELS.introPost[locale]}
          </p>

          <Section title={VILKAR_LABELS.s1Title[locale]}>
            <p>
              {VILKAR_LABELS.s1P1Pre[locale]}<strong>{VILKAR_LABELS.s1P1Bold[locale]}</strong>{VILKAR_LABELS.s1P1Post[locale]}
            </p>
          </Section>

          <Section title={VILKAR_LABELS.s2Title[locale]}>
            <p>
              {VILKAR_LABELS.s2P1Pre[locale]}<strong>{VILKAR_LABELS.s2P1Bold[locale]}</strong>{VILKAR_LABELS.s2P1Post[locale]}
            </p>
            <p>{VILKAR_LABELS.s2P2[locale]}</p>
          </Section>

          <Section title={VILKAR_LABELS.s3Title[locale]}>
            <p>{VILKAR_LABELS.s3P1[locale]}</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>{VILKAR_LABELS.s3Li1[locale]}</li>
              <li>{VILKAR_LABELS.s3Li2[locale]}</li>
              <li>{VILKAR_LABELS.s3Li3[locale]}</li>
              <li>{VILKAR_LABELS.s3Li4[locale]}</li>
            </ul>
            <p>{VILKAR_LABELS.s3P2[locale]}</p>
            <p>{VILKAR_LABELS.s3P3[locale]}</p>
          </Section>

          <Section title={VILKAR_LABELS.s4Title[locale]}>
            <p>
              {VILKAR_LABELS.s4P1Pre[locale]}
              <a href="mailto:pilot@pilar.no" className="underline">pilot@pilar.no</a>
              {VILKAR_LABELS.s4P1Post[locale]}
            </p>
          </Section>

          <Section title={VILKAR_LABELS.s5Title[locale]}>
            <p>{VILKAR_LABELS.s5P1[locale]}</p>
          </Section>

          <Section title={VILKAR_LABELS.s6Title[locale]}>
            <p>
              {VILKAR_LABELS.s6P1Pre[locale]}
              <a href="mailto:pilot@pilar.no" className="underline">pilot@pilar.no</a>
              {VILKAR_LABELS.s6P1Post[locale]}
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
          <Link
            href="/"
            className="text-sm hover:underline" style={{ color: "var(--fg-muted)" }}
          >
            {VILKAR_LABELS.tilbakePilar[locale]}
          </Link>
        </div>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold" style={{ color: "var(--fg)" }}>{title}</h2>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: "var(--fg-2)" }}>
        {children}
      </div>
    </section>
  );
}