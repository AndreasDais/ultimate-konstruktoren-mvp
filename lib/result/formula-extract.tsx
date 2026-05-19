/**
 * Formel-ekstraksjon + matematisk notasjon-rendering for Resultat-sida.
 *
 * Inneheld:
 * - extractFormulaLines: pluk ut formel-linjer + sluttresultat-linje frå
 *   fritekst-blokk (for "Bare formlene"-modus i Stegvis-utrekninga)
 * - GREEK_LETTERS: mapping ord → unicode-bokstav (alpha → α osv.)
 * - renderMathKey: gjer "psi_0_kategori_B" → ψ med "0,kategori,B" som subscript
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 2.
 */

import React from "react";

// Hentar formel-linjer ut frå step.text. Heuristikk:
//   1. Pluk første linje med symbolsk uttrykk (bokstav før =).
//   2. Pluss siste linje med "=" (resultatet) — om den er ulik formelen.
//   3. Returner som array av strenger; tom array betyr "ingen formel funnen".
export function extractFormulaLines(text: string): string[] {
  if (!text) return [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Linje med "=" og bokstav-symbol før =
  const isSymbolicFormula = (l: string) => /^[^=]*[a-zA-Zα-ωΑ-Ω][^=]*=/.test(l);
  // Linje med "=" og mest tal etter (sluttresultatet typisk)
  const hasEquals = (l: string) => l.includes("=");

  const formula = lines.find(isSymbolicFormula);
  const lastEq = [...lines].reverse().find(hasEquals);

  const out: string[] = [];
  if (formula) out.push(formula);
  if (lastEq && lastEq !== formula) out.push(lastEq);
  // Om ingen formel funne men det er ein "="-linje, vis den
  if (out.length === 0 && lastEq) out.push(lastEq);
  return out;
}

// === Matematisk symbol-rendering ============================================
// Konstruktørane returnerer results-keys som "M_Ed", "epsilon_cu3", "psi_0_B"
// — vi gjer dei lesbare ved å:
// - Bytte "epsilon"/"psi"/etc med ε/ψ (greske bokstavar)
// - Splitte på første underscore: alt etter blir subscript (<sub>)
// - For multi-underscore (psi_0_kategori_B) blir alt etter første "_"
//   join-a med komma: ψ med "0,kategori,B" som subscript
// MERK: I "M_Ed" er M hovudsymbol og Ed subscript. Vi har ikkje case-handsaming —
//   stoler på agentens underscore-plassering. Ed_ULS treff "Ed" som hovudsymbol.
// - Subscript med fleire delar slåast saman med komma: psi_0_kategori_B →
//   ψ med "0,kategori,B" som subscript.
export const GREEK_LETTERS: Record<string, string> = {
  // Små bokstavar — det vanlegaste i konstruksjonsfag
  alpha: "α", beta: "β", gamma: "γ", delta: "δ",
  epsilon: "ε", zeta: "ζ", eta: "η", theta: "θ",
  iota: "ι", kappa: "κ", lambda: "λ", mu: "μ",
  nu: "ν", xi: "ξ", omicron: "ο", pi: "π",
  rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ",
  phi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  // Store bokstavar (sjeldnare, men fagleg t.d. Φ, Δ, Σ)
  Alpha: "Α", Beta: "Β", Gamma: "Γ", Delta: "Δ",
  Epsilon: "Ε", Zeta: "Ζ", Eta: "Η", Theta: "Θ",
  Lambda: "Λ", Mu: "Μ", Nu: "Ν", Xi: "Ξ",
  Pi: "Π", Rho: "Ρ", Sigma: "Σ", Tau: "Τ",
  Phi: "Φ", Chi: "Χ", Psi: "Ψ", Omega: "Ω",
};

export function renderMathKey(key: string): React.ReactNode {
  const parts = key.split("_");
  if (parts.length === 0 || !parts[0]) return key;

  // Første del: Greek-symbol om matchande, elles ordet uendra
  const head = GREEK_LETTERS[parts[0]] ?? parts[0];

  // Ingen underscore → berre hovudsymbol
  if (parts.length === 1) return head;

  // Resten: subscript, komma-separert om fleire delar
  const subscript = parts.slice(1).join(",");
  return (
    <>
      {head}
      <sub style={{ fontSize: "0.72em", verticalAlign: "sub", marginLeft: "0.5px" }}>
        {subscript}
      </sub>
    </>
  );
}