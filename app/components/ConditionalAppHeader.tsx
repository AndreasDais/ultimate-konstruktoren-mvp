"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
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
  "/international",
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
  const { locale } = useLocale();
  const isMarketingRoute = MARKETING_ROUTES.has(pathname);
  const effectiveUiMode: HeaderUiMode = ENGLISH_HEADER_ROUTES.has(pathname)
    ? "intl"
    : uiMode;

  useEffect(() => {
    if (isMarketingRoute) return;
    document.documentElement.lang = effectiveUiMode === "intl" ? "en" : locale;
  }, [effectiveUiMode, isMarketingRoute, locale]);

  if (isMarketingRoute) return null;
  return <Header uiMode={effectiveUiMode} />;
}
