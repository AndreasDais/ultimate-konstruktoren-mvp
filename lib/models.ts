/**
 * Sentral modell-konfigurasjon for agent-pipelinen.
 *
 * QA-spec P7: modellen er config, aldri hardkoda. Tidlegare låg strengen
 * "claude-sonnet-4-6" hardkoda i seks route-filer — umogleg å byte trygt,
 * og umogleg å modell-merke telemetri meiningsfullt. Ein stad no.
 *
 * Verdien er pinna til ein eksakt modell-versjon (QA-spec 3.2): telemetri
 * og golden-set-køyringar må vere reproduseronly, så vi vil vite nøyaktig
 * kva modell som gav eit resultat. Overstyr via env-variabel ved behov.
 */
export const PIPELINE_MODEL: string =
  process.env.PIPELINE_MODEL ?? "claude-sonnet-4-6";
