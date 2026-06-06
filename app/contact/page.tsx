import type { Metadata } from "next";
import { PublicSection, PublicShell } from "@/app/components/public-page";

export const metadata: Metadata = {
  title: "Contact — Pilar",
  description: "Reach the PILAR pilot team.",
};

export default function ContactPage() {
  return (
    <PublicShell title="Contact" intro="Reach the PILAR pilot team.">
      <PublicSection title="Email">
        <p>
          For questions, feedback, concerns or data-deletion requests, email{" "}
          <a className="underline" href="mailto:pilot@pilarcalc.com">
            pilot@pilarcalc.com
          </a>
          .
        </p>
      </PublicSection>
      <PublicSection title="Pilot status">
        <p>
          PILAR is in active development. During the pilot, messages are handled
          manually, so responses may take a little time.
        </p>
      </PublicSection>
    </PublicShell>
  );
}
