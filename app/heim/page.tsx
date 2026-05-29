import { cookies } from "next/headers";
import type { Metadata } from "next";
import HeimClient from "./HeimClient";
import "./heim.css";

export const metadata: Metadata = {
  title: "Pilar — AI-konstruksjonsassistent",
  description: "AI-basert konstruksjonsassistent. Skriv et konstruksjonsproblem, faa en kontrollert beregning.",
};

type Lang = "nb" | "en";

export default async function HeimPage() {
  const c = await cookies();
  const uiMode = c.get("pilar-ui-mode")?.value;

  // To variantar: bokmaal (norsk-default) eller engelsk (intl).
  const lang: Lang = uiMode === "intl" ? "en" : "nb";
  // Modal viser berre naar brukaren ikkje har valt region enno.
  const hasRegionChoice = uiMode === "intl" || uiMode === "no";

  return (
    <>
      {/* Set js-anim paa <html> FOER paint, scopa til /heim. Gjer at
          initial-skjulte animasjons-tilstandar gjeld fraa fyrste paint
          (ingen flash), men sida renderer fullstendig om JS er av. */}
      <script
        dangerouslySetInnerHTML={{
          __html: "try{document.documentElement.classList.add('js-anim')}catch(e){}",
        }}
      />
      <HeimClient lang={lang} showRegionModal={!hasRegionChoice} />
    </>
  );
}
