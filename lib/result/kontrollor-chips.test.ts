import { describe, it, expect } from "vitest";
import {
  buildKontrollorChips,
  jaccardSimilarity,
  warningTokenSet,
} from "@/lib/result/kontrollor-chips";
import type { CalculationResult } from "@/lib/result/types";

// Minimal Konstruktør-output der berre `warnings` varierer per test.
function calc(warnings: string[]): CalculationResult {
  return {
    short_conclusion: "",
    assumptions: [],
    calculation_steps: [],
    results: {},
    limitations: [],
    warnings,
    confidence: "high",
  };
}

// Warn-chips frå warnings-steget. comparison=null gjer at ingen
// assumption_differences (som òg er warn/⚠) blandar seg inn — vi isolerer
// steg 3 i buildKontrollorChips.
function warningChips(aWarnings: string[], bWarnings: string[]) {
  return buildKontrollorChips(
    null,
    calc(aWarnings),
    calc(bWarnings),
    null,
    "nn",
  ).filter((c) => c.prefix === "⚠");
}

// Faktiske advarsel-tekstar frå A2-køyringa (PILAR-993D2E4C). A og B reiser
// uavhengig SAME åtvaring om forenklingsformelen, med ulik ordlyd.
const A2_WARN_A_LEADING =
  "For 6.10b er det avgjørende å identifisere riktig ledende variabel last. " +
  "Her gir q_k som ledende klart høyest Ed (22,88 vs. 20,85 kN/m) — " +
  "s_k som ledende er underordnet.";
const A2_WARN_A_SIMPLIFIED =
  "Likning 6.10 = 1,35·G + 1,5·Q (forenklingsformelen) er IKKE brukt, i " +
  "samsvar med NA-GRUNNLAG som eksplisitt angir at 6.10a/6.10b er NA-kombinasjonen.";
const A2_WARN_B_SIMPLIFIED =
  "Forenklet kombinasjon Ed = 1,35·G + 1,5·Q (likning 6.10) er IKKE " +
  "NA-kombinasjonen og skal ikke brukes — NA krever 6.10a/6.10b.";

describe("FIKS 11 (F15) — kryss-A/B nær-dedup av advarsler", () => {
  it("kalibrering: A2-paret ligg over terskelen, distinkte advarsler under", () => {
    const aSimplified = warningTokenSet(A2_WARN_A_SIMPLIFIED);
    const bSimplified = warningTokenSet(A2_WARN_B_SIMPLIFIED);
    const aLeading = warningTokenSet(A2_WARN_A_LEADING);

    // Same faktum, ulik ordlyd → over terskelen (0.5).
    expect(jaccardSimilarity(aSimplified, bSimplified)).toBeGreaterThanOrEqual(0.5);
    // Distinkt advarsel → klart under terskelen (ingen falsk kollaps).
    expect(jaccardSimilarity(aLeading, bSimplified)).toBeLessThan(0.5);
  });

  it("kollapsar ulikt formulerte A/B-advarsler om same faktum", () => {
    const chips = warningChips(
      [A2_WARN_A_LEADING, A2_WARN_A_SIMPLIFIED],
      [A2_WARN_B_SIMPLIFIED],
    );
    // B-varianten av forenklingsformel-åtvaringa er nær-dup → borte.
    expect(chips).toHaveLength(2);
  });

  it("behaldar distinkte B-advarsler som ikkje liknar nokon A-advarsel", () => {
    const chips = warningChips(
      [A2_WARN_A_SIMPLIFIED],
      ["Vindlast er ikkje inkludert i denne oppgåva og må vurderast separat."],
    );
    expect(chips).toHaveLength(2);
  });

  it("verbatim-identiske A/B-advarsler blir vist berre éin gong", () => {
    const chips = warningChips([A2_WARN_A_SIMPLIFIED], [A2_WARN_A_SIMPLIFIED]);
    expect(chips).toHaveLength(1);
  });

  it("nær-dedup gjeld berre kryss A↔B, ikkje to liknande frå same konstruktør", () => {
    // Begge nær-duplikat-variantane ligg hos B → fuzzy-dedup skal IKKJE slå
    // til; begge skal stå att (berre verbatim-dedup innan ein konstruktør).
    const chips = warningChips([], [A2_WARN_A_SIMPLIFIED, A2_WARN_B_SIMPLIFIED]);
    expect(chips).toHaveLength(2);
  });
});