"use client";

import { usePathname } from "next/navigation";
import Header, { type HeaderUiMode } from "./Header";

/**
 * Skjuler den globale app-headeren paa landingsrutene /heim og /home, som har
 * sin eigen marknads-header (MarketingHeader). Alle andre ruter faar
 * app-headeren som foer. usePathname er tilgjengeleg under SSR i App Router,
 * saa ingen header-flash.
 */
const MARKETING_ROUTES = new Set(["/heim", "/home"]);

// English canonical public pages: render the English header chrome regardless
// of the pilar-ui-mode cookie. nb/nn routes (e.g. /vilkar) and the app keep
// their cookie-driven mode.
const ENGLISH_HEADER_ROUTES = new Set([
  "/about",
  "/guide",
  "/safety",
  "/roadmap",
  "/privacy",
  "/contact",
  "/terms",
]);

export default function ConditionalAppHeader({
  uiMode,
}: {
  uiMode: HeaderUiMode;
}) {
  const pathname = usePathname();
  if (MARKETING_ROUTES.has(pathname)) return null;
  const effectiveUiMode: HeaderUiMode = ENGLISH_HEADER_ROUTES.has(pathname)
    ? "intl"
    : uiMode;
  return <Header uiMode={effectiveUiMode} />;
}
