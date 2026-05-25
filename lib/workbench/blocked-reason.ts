/**
 * Blokkering-grunngiving for "Start berekning"-knappen i Workbench-fasen.
 *
 * Returnerer ein menneskeleg-lesbar grunn til at "Start berekning" er
 * deaktivert, eller null viss berekning kan startast. Status-spesifikk
 * for å unngå misvisande "legg til manglar"-melding på t.d.
 * relevant_ikkje_stotta.
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 5.
 */

import type { Locale } from "@/lib/locale";
import type { AgentResult } from "./types";

const BLOCKED_REASONS: Record<
  Locale,
  {
    avvist: string;
    relevant_ikkje_stotta: string;
    uklart: string;
    no_kalkulator: string;
  }
> = {
  nb: {
    avvist: "Inputen er ikke byggfaglig. Beregning kan ikke startes.",
    relevant_ikkje_stotta:
      "Forespørselen er byggfaglig relevant, men ligger utenfor det Pilar støtter ennå (typisk brann, dynamikk, seismisk eller geoteknisk diwhilejonering). Prøv en annen formulering eller en annen beregningstype.",
    uklart:
      "Forespørselen er for vag til å tolke trygt. Rediger forespørselen og tolk på nytt med mer konkret informasjon om geometri, last og materiale.",
    no_kalkulator:
      "Ingen beregning er mulig med oppgitt informasjon. Rediger forespørselen og legg til manglende data.",
  },
  nn: {
    avvist: "Inputen er ikkje byggfagleg. Berekning kan ikkje startast.",
    relevant_ikkje_stotta:
      "Forespurnaden er byggfagleg relevant, men ligg utanfor det Pilar støttar enno (typisk brann, dynamikk, seismisk eller geoteknisk diwhilejonering). Prøv ei anna formulering eller ein annan berekningstype.",
    uklart:
      "Forespurnaden er for vag til å tolke trygt. Rediger forespørselen og tolk på nytt med meir konkret informasjon om geometri, last og materiale.",
    no_kalkulator:
      "Ingen berekning er mogleg med oppgitt informasjon. Rediger forespørselen og legg til manglande data.",
  },
};

export function getBlockedReason(
  result: AgentResult | null,
  locale: Locale,
): string | null {
  if (!result) return null;
  const reasons = BLOCKED_REASONS[locale];

  if (result.status === "avvist") return reasons.avvist;
  if (result.status === "relevant_ikkje_stotta") return reasons.relevant_ikkje_stotta;
  if (result.status === "uklart") return reasons.uklart;
  if ((result.kan_reknast_no?.length ?? 0) === 0) return reasons.no_kalkulator;

  return null;
}