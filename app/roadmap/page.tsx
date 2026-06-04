import type { Metadata } from "next";
import { PublicSection, PublicShell } from "@/app/components/public-page";

export const metadata: Metadata = {
  title: "Roadmap — Pilar",
  description: "An indicative view of where PILAR is heading.",
};

export default function RoadmapPage() {
  return (
    <PublicShell
      title="Roadmap"
      intro="An indicative view of where PILAR is heading. Items and ordering may change."
    >
      <PublicSection title="Now — Pilot">
        <p>
          Gather feedback, calibrate the confidence signals, and harden the core
          interpret → compute → check → document flow.
        </p>
      </PublicSection>
      <PublicSection title="Next — Hardening">
        <p>
          Improve reliability and observability, and make the review surfaces
          clearer for the qualified engineer who checks each result.
        </p>
      </PublicSection>
      <PublicSection title="Later">
        <p>
          Broader standard profiles and workflow integrations, guided by what
          pilot users need most.
        </p>
      </PublicSection>
      <PublicSection title="Note">
        <p>
          This roadmap is indicative and is not a commitment to specific dates
          or scope.
        </p>
      </PublicSection>
    </PublicShell>
  );
}
