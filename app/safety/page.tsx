import type { Metadata } from "next";
import { PublicSection, PublicShell } from "@/app/components/public-page";

export const metadata: Metadata = {
  title: "Safety — Pilar",
  description:
    "How PILAR tries to be trustworthy, and the limits you must keep in mind.",
};

export default function SafetyPage() {
  return (
    <PublicShell
      title="Safety"
      intro="How PILAR tries to be trustworthy — and the limits you must keep in mind."
    >
      <PublicSection title="Checked by design">
        <p>
          Two independent AI engineers solve each problem with different
          methods. A comparator confirms they agree before anything is shown — a
          disagreement halts the run — and a controller then decides whether it
          is safe to present the result and flags caveats a reviewing engineer
          should know about.
        </p>
      </PublicSection>
      <PublicSection title="Always preliminary">
        <p>
          Every output is AI-generated and preliminary. It must be reviewed by a
          qualified engineer before use in real projects.
        </p>
      </PublicSection>
      <PublicSection title="What PILAR does not do">
        <p>
          PILAR is not a substitute for a qualified engineer&apos;s judgment. It
          does not produce verified design documentation, and it does not
          warrant that results are correct, complete or conformant with the
          applicable codes. Use is at your own risk.
        </p>
      </PublicSection>
      <PublicSection title="Data handling">
        <p>
          Internal monitoring tools surface sanitized, read-only summaries only.
          Human review remains final.
        </p>
      </PublicSection>
    </PublicShell>
  );
}
