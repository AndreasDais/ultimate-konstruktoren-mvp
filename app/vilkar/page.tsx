import Link from "next/link";

export const metadata = {
  title: "Vilkår — Pilar",
};

export default function VilkarPage() {
  return (
    <main className="flex-1 px-4 py-8 md:py-12">
      <article className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
            Pilar v0.1
          </p>
          <h1 className="text-3xl font-semibold text-neutral-900">
            Vilkår for bruk
          </h1>
          <p className="text-sm text-neutral-600 mt-2">
            Sist oppdatert: 12. mai 2026
          </p>
        </div>

        <div className="space-y-6">
          <p className="text-base leading-relaxed text-neutral-800">
            Pilar er ein <strong>tidleg pilot-versjon</strong> av eit AI-basert
            verktøy for norsk byggfagleg praksis. Vilkåra under gjeld for
            pilot-fasen og kan endrast utan varsel.
          </p>

          <Section title="1. Kva Pilar er">
            <p>
              Pilar tolkar og bereknar konstruksjonsfaglege forespurnader (stål,
              betong, last) etter Eurokode og norsk nasjonalt tillegg. All
              output er <strong>AI-generert</strong> ved hjelp av store
              språkmodellar og må kontrollerast av kvalifisert fagperson før
              bruk i reelle prosjekt.
            </p>
          </Section>

          <Section title="2. Avgrensingar og ansvar">
            <p>
              Du som brukar er fullt ut ansvarleg for å verifisere alle resultat
              Pilar produserer. Pilar er <strong>ikkje sertifisert</strong> for
              dimensjonering av reelle byggverk, og resultata skal ikkje brukast
              som einaste grunnlag for konstruksjonsavgjerder.
            </p>
            <p>
              Vi gir ingen garanti for at AI-genererte berekningar er korrekte,
              komplette eller i samsvar med gjeldande regelverk. Bruk av Pilar
              skjer på eige ansvar.
            </p>
          </Section>

          <Section title="3. Data vi lagrar">
            <p>Når du brukar Pilar, lagrar vi:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Di e-postadresse (frå innlogging)</li>
              <li>Forespurnadene du sender inn (input-tekst)</li>
              <li>AI-genererte tolkingar, berekningar og rapportar</li>
              <li>Tilbakemeldingar og feilrapportar du sender</li>
            </ul>
            <p>
              Vi brukar dataen til å forbetre produktet og analysere
              kalibreringa av tillit-systemet vårt. Data blir lagra i Supabase
              (EU-region). Vi deler ikkje dataen din med tredjepart utanfor det
              som er naudsynt for å levere tenesta (Anthropic for AI-berekning,
              Supabase for lagring, Vercel for hosting).
            </p>
            <p>
              Du kan òg bruke Pilar anonymt (utan innlogging) — då lagrar vi
              berre forespurnaden og resultatet, utan brukar-kopling.
            </p>
          </Section>

          <Section title="4. Sletting av data">
            <p>
              Du har rett til å få alle dine data sletta. Send e-post til{" "}
              
              <a href="mailto:pilot@pilar.no" className="underline hover:text-neutral-900">pilot@pilar.no</a>{" "}
              med ein førespurnad om sletting, så ordnar vi det manuelt i
              pilot-fasen. Sletting er irreversibel.
            </p>
          </Section>

          <Section title="5. Endringar i pilot">
            <p>
              Pilar er under aktiv utvikling. Funksjonalitet, prisar (gratis i
              pilot), og vilkår kan endrast utan varsel. Større endringar blir
              kommunisert via e-post til registrerte brukarar.
            </p>
          </Section>

          <Section title="6. Kontakt">
            <p>
              Spørsmål, tilbakemelding eller bekymring? Send e-post til{" "}
              
              <a href="mailto:pilot@pilar.no" className="underline hover:text-neutral-900">pilot@pilar.no</a>
              .
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t border-neutral-200">
          <Link
            href="/"
            className="text-sm text-neutral-600 hover:text-neutral-900 hover:underline"
          >
            ← Tilbake til Pilar
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
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="text-sm leading-relaxed text-neutral-700 space-y-3">
        {children}
      </div>
    </section>
  );
}