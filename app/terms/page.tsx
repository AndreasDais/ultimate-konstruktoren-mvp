import Link from "next/link";

export const metadata = {
  title: "Terms of use — Pilar",
};

export default function TermsPage() {
  return (
    <main className="flex-1 px-4 py-8 md:py-12">
      <article className="mx-auto max-w-2xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--fg-muted)" }}>
            Pilar v0.1
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: "var(--fg)" }}>
            Terms of use
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--fg-muted)" }}>
            Last updated: 27 May 2026
          </p>
        </div>

        <div className="space-y-6">
          <p className="text-base leading-relaxed" style={{ color: "var(--fg-2)" }}>
            Pilar is an <strong>early pilot version</strong> of an AI-based tool for
            structural engineering practice. The terms below apply to the pilot phase
            and may change without notice.
          </p>

          <Section title="1. What Pilar is">
            <p>
              Pilar interprets and calculates structural engineering requests
              (steel, concrete, loads) primarily against Eurocode and the
              Norwegian national annex. All output is <strong>AI-generated</strong>{" "}
              using large language models and is <strong>experimental</strong>.
              It must be reviewed by a qualified engineer before any real use.
            </p>
            <p>
              Pilar is <strong>not a replacement for professional engineering
              judgment</strong>, and its output is <strong>not stamped or sealed
              engineering design</strong>. Nothing produced by Pilar may be used
              as a verified design basis or submitted as certified engineering
              documentation.
            </p>
          </Section>

          <Section title="2. Limitations and liability">
            <p>
              You as the user are fully responsible for verifying every result
              Pilar produces. Pilar is <strong>not certified</strong> for the
              design of real structures, and the results must not be used as
              the sole basis for engineering decisions.
            </p>
            <p>
              We make no warranty that AI-generated calculations are correct,
              complete, or in compliance with applicable regulations. Use of
              Pilar is entirely at your own risk.
            </p>
            <p>
              Support outside Eurocode/Norway is experimental. Other regional
              standards may be partially modelled or not modelled at all; treat
              any non-Eurocode output as a starting point for manual work, not
              as a verified result.
            </p>
          </Section>

          <Section title="3. Data we store">
            <p>When you use Pilar, we store:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your email address (from sign-in)</li>
              <li>The requests you submit (input text)</li>
              <li>AI-generated interpretations, calculations and reports</li>
              <li>Feedback and bug reports you send</li>
            </ul>
            <p>
              We use this data to improve the product and to analyse the
              calibration of our trust-scoring system. Data is stored in
              Supabase (EU region). We do not share your data with third
              parties beyond what is required to deliver the service
              (Anthropic for AI inference, Supabase for storage, Vercel for
              hosting).
            </p>
            <p>
              You can also use Pilar anonymously (without signing in) — in
              that case we only store the request and the result, without
              linking it to a user.
            </p>
          </Section>

          <Section title="4. Deleting your data">
            <p>
              You have the right to have all your data deleted. Send an email
              to{" "}
              <a href="mailto:pilot@pilar.no" className="underline">pilot@pilar.no</a>{" "}
              with a deletion request and we will handle it manually during
              the pilot phase. Deletion is irreversible.
            </p>
          </Section>

          <Section title="5. Changes during the pilot">
            <p>
              Pilar is under active development. Functionality, pricing (free
              during the pilot) and terms may change without notice. Material
              changes will be communicated by email to registered users.
            </p>
          </Section>

          <Section title="6. Contact">
            <p>
              Questions, feedback or concerns? Email{" "}
              <a href="mailto:pilot@pilar.no" className="underline">pilot@pilar.no</a>.
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
          <Link
            href="/"
            className="text-sm hover:underline" style={{ color: "var(--fg-muted)" }}
          >
            ← Back to Pilar
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
