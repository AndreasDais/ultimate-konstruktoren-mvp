import { cookies } from "next/headers";
import type { HeaderUiMode } from "../components/Header";
import PilotClient from "./PilotClient";

const UI_MODE_COOKIE = "pilar-ui-mode";

export default async function PilotPage() {
  const cookieStore = await cookies();
  const uiMode: HeaderUiMode =
    cookieStore.get(UI_MODE_COOKIE)?.value === "intl" ? "intl" : "no";

  return (
    <>
      {/* Set js-anim på <html> FØR paint (scopa til /pilot) → initial-skjulte
          reveal-tilstandar gjeld frå fyrste paint utan flash, men sida renderer
          fullstendig om JS er av. Same mønster som /heim og /international. */}
      <script
        dangerouslySetInnerHTML={{
          __html: "try{document.documentElement.classList.add('js-anim')}catch(e){}",
        }}
      />
      <PilotClient uiMode={uiMode} />
    </>
  );
}
