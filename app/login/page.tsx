import { cookies } from "next/headers";
import type { HeaderUiMode } from "@/app/components/Header";
import LoginForm from "./LoginForm";

const UI_MODE_COOKIE = "pilar-ui-mode";

// Server wrapper: read the same pilar-ui-mode cookie the layout uses for the
// header/footer, so the login card matches the surrounding shell language
// (English chrome -> English card; Norwegian default -> nb/nn card).
export default async function LoginPage() {
  const cookieStore = await cookies();
  const uiMode: HeaderUiMode =
    cookieStore.get(UI_MODE_COOKIE)?.value === "intl" ? "intl" : "no";

  return <LoginForm uiMode={uiMode} />;
}
