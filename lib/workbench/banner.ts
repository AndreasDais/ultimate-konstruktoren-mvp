/**
 * getBannerDetail — bygger detaljert banner-tekst for Tolkar-status-banner.
 *
 * Returnerer "Fagomraade · X manglar" / "Stål · 4 verdier OK" / etc basert
 * på AgentResult.status. Bruker WB_LABELS for lokaliserte tekstar.
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 5.
 */

import type { Locale } from "@/lib/locale";
import type { AgentResult } from "./types";
import { WB_LABELS as BASE_WB_LABELS } from "@/lib/result/labels";

/**
 * Bygg detail-tekst til status-banneret. Tek valfritt eit `labels`-objekt
 * (typisk proxied WB_LABELS frå page.tsx) for å støtte intl-engelsk via
 * buildLocalizedLabelProxy. Default er BASE_WB_LABELS (norsk).
 */
// Tolkar emiterar fagområde-namnet på norsk uansett pipeline-språk
// (det er ein controlled vocabulary internt). Vi translate til engelsk
// i intl-modus for banner-visning.
const FAGOMRAADE_EN: Record<string, string> = {
  stål: "Steel",
  stal: "Steel",
  betong: "Concrete",
  tre: "Timber",
  mur: "Masonry",
  laster: "Loads",
  last: "Loads",
  lastkombinasjon: "Load combination",
  geoteknikk: "Geotechnical",
  fundament: "Foundation",
  forbinding: "Connection",
  knekking: "Buckling",
};

function translateFagomraade(
  raw: string,
  displayLanguage?: "nb" | "nn" | "en",
): string {
  if (displayLanguage !== "en") {
    // Norsk default — capitaliser første bokstav slik som før
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  const en = FAGOMRAADE_EN[raw.toLowerCase()];
  if (en) return en;
  // Ukjent fagområde — capitaliser råverdien som fallback
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function getBannerDetail(
  result: AgentResult,
  locale: Locale,
  labels: typeof BASE_WB_LABELS = BASE_WB_LABELS,
  displayLanguage?: "nb" | "nn" | "en",
): string {
  const nMangler = result.manglande_verdiar?.length ?? 0;
  const nKanReknast = result.kan_reknast_no?.length ?? 0;
  const fag = result.fagomraade
    ? translateFagomraade(result.fagomraade, displayLanguage)
    : undefined;
  const parts: string[] = [];
  if (fag) parts.push(fag);

  switch (result.status) {
    case "klar":
      parts.push(
        labels.bannerKlarDetail[locale].replace("{n}", String(nKanReknast)),
      );
      break;
    case "delvis_klar":
      parts.push(
        labels.bannerDelvisDetail[locale].replace("{n}", String(nMangler)),
      );
      break;
    case "mangelfull":
      return labels.bannerMangelfullDetail[locale].replace(
        "{n}",
        String(nMangler),
      );
    case "relevant_ikkje_stotta":
      parts.push(labels.bannerIkkjeStottaDetail[locale]);
      break;
    case "avvist":
      return labels.bannerAvvistDetail[locale];
    case "uklart":
    case "uklar":
      return labels.bannerUklartDetail[locale];
  }

  return parts.join(" · ");
}