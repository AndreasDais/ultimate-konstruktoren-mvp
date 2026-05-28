import { cookies } from "next/headers";
import type { HeaderUiMode } from "../components/Header";
import PilotClient from "./PilotClient";

const UI_MODE_COOKIE = "pilar-ui-mode";

export default async function PilotPage() {
  const cookieStore = await cookies();
  const uiMode: HeaderUiMode =
    cookieStore.get(UI_MODE_COOKIE)?.value === "intl" ? "intl" : "no";

  return <PilotClient uiMode={uiMode} />;
}
