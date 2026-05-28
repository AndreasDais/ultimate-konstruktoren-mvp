"use client";

import { usePathname } from "next/navigation";
import Header, { type HeaderUiMode } from "./Header";

/**
 * Skjuler den globale app-headeren paa landingsruta /heim, som har sin eigen
 * marknads-header (MarketingHeader). Alle andre ruter faar app-headeren som foer.
 * usePathname er tilgjengeleg under SSR i App Router, saa ingen header-flash.
 */
export default function ConditionalAppHeader({
  uiMode,
}: {
  uiMode: HeaderUiMode;
}) {
  const pathname = usePathname();
  if (pathname === "/heim") return null;
  return <Header uiMode={uiMode} />;
}
