import type { Metadata } from "next";
import InternationalClient from "./InternationalClient";
import "./international.css";

export const metadata: Metadata = {
  title: "PILAR — International pilot",
  description:
    "Set your region and engineering standard for PILAR's international (English) pilot.",
};

export default function InternationalPage() {
  return (
    <>
      {/* Set js-anim på <html> FØR paint (scopa til denne ruta sin CSS). Gjer at
          initial-skjulte reveal-tilstandar gjeld frå fyrste paint (ingen flash),
          men sida renderer fullstendig om JS er av. */}
      <script
        dangerouslySetInnerHTML={{
          __html: "try{document.documentElement.classList.add('js-anim')}catch(e){}",
        }}
      />
      <InternationalClient />
    </>
  );
}
