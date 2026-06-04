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

export default function ConditionalAppHeader({
  uiMode,
}: {
  uiMode: HeaderUiMode;
}) {
  const pathname = usePathname();
  if (MARKETING_ROUTES.has(pathname)) return null;
  return <Header uiMode={uiMode} />;
}
