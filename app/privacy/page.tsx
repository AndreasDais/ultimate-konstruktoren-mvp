import type { Metadata } from "next";
import { PublicSection, PublicShell } from "@/app/components/public-page";

export const metadata: Metadata = {
  title: "Privacy — Pilar",
  description: "What PILAR stores during the pilot and how it is used.",
};

export default function PrivacyPage() {
  return (
    <PublicShell
      title="Privacy"
      intro="PILAR is an early pilot. This page summarises what we store and how it is used during the pilot. It may change as the product develops."
    >
      <PublicSection title="What we store">
        <p>When you use PILAR we may store:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your email address, if you sign in</li>
          <li>The requests you submit (your input text)</li>
          <li>AI-generated interpretations, calculations and reports</li>
          <li>Feedback and error reports you send</li>
        </ul>
        <p>
          You can also use PILAR without signing in — then we store only the
          request and its result, with no user link.
        </p>
      </PublicSection>
      <PublicSection title="How we use it">
        <p>
          We use this data to improve the product and to study how well our
          confidence signals are calibrated. Data is stored in Supabase (EU
          region). We do not share your data beyond what is needed to run the
          service: Anthropic for AI computation, Supabase for storage, and
          Vercel for hosting.
        </p>
      </PublicSection>
      <PublicSection title="Deletion">
        <p>
          You can ask us to delete your data. Email{" "}
          <a className="underline" href="mailto:pilot@pilarcalc.com">
            pilot@pilarcalc.com
          </a>{" "}
          and we will handle it manually during the pilot. Deletion is
          irreversible.
        </p>
      </PublicSection>
      <PublicSection title="Changes">
        <p>
          PILAR is under active development. This summary, the features and the
          terms may change during the pilot.
        </p>
      </PublicSection>
    </PublicShell>
  );
}
