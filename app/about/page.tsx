import type { Metadata } from "next";
import { PublicSection, PublicShell } from "@/app/components/public-page";

export const metadata: Metadata = {
  title: "About — Pilar",
  description: "What PILAR is and what it is for.",
};

export default function AboutPage() {
  return (
    <PublicShell
      title="About"
      intro="PILAR is an AI structural-engineering assistant, currently in pilot."
    >
      <PublicSection title="What it does">
        <p>
          PILAR interprets and computes structural problems (steel, concrete,
          loads) against Eurocode and the Norwegian National Annex. Every output
          is AI-generated.
        </p>
      </PublicSection>
      <PublicSection title="How it works">
        <p>
          Two independent AI engineers solve the same problem with different
          methods. A comparator confirms that the two answers agree before
          anything is shown, and a controller decides whether the result is safe
          to present and flags any caveats. You get a calculation note laid out
          so it can be checked.
        </p>
      </PublicSection>
      <PublicSection title="What it is not">
        <p>
          PILAR is a pilot tool, not a substitute for a qualified engineer&apos;s
          judgment. Results are preliminary and must be reviewed by a qualified
          engineer before use in real projects. Outputs are not verified design
          documentation.
        </p>
      </PublicSection>
    </PublicShell>
  );
}
