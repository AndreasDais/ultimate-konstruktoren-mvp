import type { Metadata } from "next";
import { PublicSection, PublicShell } from "@/app/components/public-page";

export const metadata: Metadata = {
  title: "Guide — Pilar",
  description: "How to use PILAR during the pilot.",
};

export default function GuidePage() {
  return (
    <PublicShell title="Guide" intro="How to use PILAR during the pilot.">
      <PublicSection title="1. Describe the problem">
        <p>
          Write your structural problem in plain language — for example, a
          simply-supported steel beam with a span and a distributed load.
        </p>
      </PublicSection>
      <PublicSection title="2. Let PILAR work">
        <p>
          The pipeline interprets the input, runs two independent solutions,
          compares them, and assesses whether the result is safe to present.
        </p>
      </PublicSection>
      <PublicSection title="3. Read the note">
        <p>
          You get a calculation note — every step, assumption and caveat is laid
          out so it can be checked.
        </p>
      </PublicSection>
      <PublicSection title="4. Have it reviewed">
        <p>
          A qualified engineer must review the result before it is used in a
          real project. PILAR is not a substitute for professional engineering
          judgment.
        </p>
      </PublicSection>
    </PublicShell>
  );
}
