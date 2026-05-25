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
// Engineerane returnerer results-keys som "M_Ed", "epsilon_cu3", "psi_0_B"
// — vi gjer dei lesonly ved å:
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

// Ord som dukkar opp i underscore-segmenter som er KONTEKST, ikkje del av
// matematisk subscript. Filtrerast vekk frå rendringa.
//
// Døme: psi_1_kategori_B → ψ_1,B (ikkje ψ_1,kategori,B)
//
// "kategori" er agent-konstruktørens måte å namnespace ψ-faktorar per
// lastkategori. Fagleg ser ein notasjonen som ψ_{1,B} der B er kategori-suffiks;
// "kategori"-ordet er overflødig metadata.
//
// Liste-formal: vi kan utvide ved behov utan å bryte eksisterande keys.
const META_SUBSCRIPT_WORDS = new Set<string>([
  "kategori",
  "klasse",
  "type",
]);

export function renderMathKey(key: string): React.ReactNode {
  const parts = key.split("_");
  if (parts.length === 0 || !parts[0]) return key;

  // Første del: Greek-symbol om matchande, elles ordet uendra
  const head = GREEK_LETTERS[parts[0]] ?? parts[0];

  // Ingen underscore → only hovudsymbol
  if (parts.length === 1) return head;

  // Resten: subscript, komma-separert om fleire delar.
  // Filtrer META_SUBSCRIPT_WORDS (kategori, klasse, type) som er kontekst,
  // ikkje matematisk subscript-innhald.
  const subscriptParts = parts.slice(1).filter((p) => !META_SUBSCRIPT_WORDS.has(p));

  // Om alle subscript-delar blei filtrert (rar edge case), vis only head.
  if (subscriptParts.length === 0) return head;

  const subscript = subscriptParts.join(",");
  return (
    <>
      {head}
      <sub style={{ fontSize: "0.72em", verticalAlign: "sub", marginLeft: "0.5px" }}>
        {subscript}
      </sub>
    </>
  );
}

// === Formel-stacking på toppnivå "=" ========================================
// KaTeX i \displaystyle-modus bryt ikkje lange formlar automatisk. Resultatet
// blir horisontal overflow når ein berekning har fleire likeverds-segment:
//     M(L/2) = R · L/2 − q·(L/2)²/2 = 20,0·2,5 − 8,0·2,5²/2 = 50,0 kNm
// Løysing: splitt på toppnivå "=" og rendre kvar segment som eigen formel
// i ein vertikal kolonne (klassisk numerisk-dokumentasjon "aligned"-stil).
//
// Brace-counting unngår at vi splitter inni \frac{a=b}{c}, \sqrt{=}, osb.
// Backslash-escape (\=) blir behandla som vanleg "=" — det er ikkje vanleg
// LaTeX-syntax og risikoen er forsvinnande liten.

/**
 * Splittar ein LaTeX-streng på alle "=" som ligg på brace-depth 0.
 *
 * Returnerer ein array der første segment har ingen "="-prefiks, og kvar
 * påfølgjande startar med "= ". T.d:
 *
 *   "M = R · L/2 − \\frac{q·L²}{8} = 50"
 *
 * blir splitta til
 *
 *   ["M", "= R · L/2 − \\frac{q·L²}{8}", "= 50"]
 *
 * "=" inni `\frac{a=b}{c}` blir IKKJE splitta — brace-counting passar på.
 * Tomme/whitespace-segmenter blir filtrert vekk.
 */
export function splitOnTopLevelEquals(latex: string): string[] {
  if (!latex) return [];
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < latex.length; i++) {
    const ch = latex[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth = Math.max(0, depth - 1);
    if (ch === "=" && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "= ";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}
// === Aligned-environment-parsing =============================================
// Engineer-agentane produserer ofte fleirlinjes-utrekningar pakka i
// \begin{aligned}...\end{aligned} med "\\" som linjebrot og "&" som
// align-anker. KaTeX rendrar slike i displayMode som éin brei blokk som
// IKKJE bryt — han stikk ut av arket når han er for brei.
//
// Løysing: pakk opp aligned-blokken til individuelle linjer, så kan
// FormulaStack rendre kvar linje som eige segment (vertikal stabling).

/**
 * Detekterer om ein latex-streng inneheld eit aligned/align*-environment.
 */
export function hasAlignedEnvironment(latex: string): boolean {
  return /\\begin\{(aligned|align\*?|alignat\*?|gather\*?)\}/.test(latex);
}

/**
 * Fjernar LaTeX line-break-spacing-argument frå starten av ein streng.
 *
 * I LaTeX kan "\\" følgjast av eit optional spacing-argument: "\\[6pt]"
 * tyder "linjebrot + 6pt ekstra vertikal-mellomrom". Når vi splittar på
 * "\\" for å stable formel-linjer, blir "[6pt]" liggande igjen på starten
 * av neste segment — KaTeX rendrar det då bokstavleg som teksten "[6pt]".
 *
 * Denne funksjonen strippar leiande "[<lengd>]"-mønster:
 *   "[6pt]\\lambda = ..."  →  "\\lambda = ..."
 *   "[8pt]\\Phi_y = ..."   →  "\\Phi_y = ..."
 *   " [4pt] = 5"           →  "= 5"
 *
 * Toler leiande whitespace. Strippar only EITT slikt argument (LaTeX
 * tillet ikkje fleire på rad).
 */
export function stripLineBreakSpacing(s: string): string {
  // Mønster: valfri whitespace, så "[", tal + valfri eining, "]"
  return s.replace(/^\s*\[\s*[\d.]+\s*[a-z]*\s*\]\s*/i, "").trim();
}

/**
 * Pakkar opp eit aligned-environment til individuelle linje-strenger.
 *
 * Tek "\begin{aligned} a &= b \\ &= c \\ &= d \end{aligned}" og returnerer
 * ["a &= b", "&= c", "&= d"] — kvar klar til å rendrast separat.
 *
 * Handsaming:
 *   - Fjernar \begin{...} og \end{...}-wrapper
 *   - Splittar på "\\" (linjebrot) på toppnivå (ikkje inni nøsta {})
 *   - "&"-align-ankeret blir verande — det er harmlaust når linja
 *     rendrast åleine (KaTeX i displayMode toler eit enkelt "&" som
 *     ein tom kolonne-separator; vi fjernar det for reinheit)
 *   - Tomme linjer filtrerast vekk
 *
 * Returnerer tom array om ingen aligned-blokk finst.
 */
export function unwrapAlignedEnvironment(latex: string): string[] {
  if (!latex) return [];

  // Hent innhaldet mellom \begin{aligned} og \end{aligned}.
  const m = latex.match(
    /\\begin\{(?:aligned|align\*?|alignat\*?|gather\*?)\}([\s\S]*?)\\end\{(?:aligned|align\*?|alignat\*?|gather\*?)\}/,
  );
  if (!m) return [];

  const body = m[1];

  // Splitt på "\\" (linjebrot) — men ikkje inni nøsta braces.
  // Brace-counting fordi "\\" kan teoretisk dukke opp i nøsta strukturar
  // (sjeldan, men forsvar). Etter "\\" kan det følgje eit optional
  // spacing-argument "[6pt]" — det handsamast av stripLineBreakSpacing
  // på kvar ferdig linje under.
  const lines: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth = Math.max(0, depth - 1);

    // Sjekk for "\\" på depth 0
    if (ch === "\\" && body[i + 1] === "\\" && depth === 0) {
      lines.push(current);
      current = "";
      i++; // hopp over andre backslash
      continue;
    }
    current += ch;
  }
  if (current.trim()) lines.push(current);

  // Reins kvar linje:
  //   - strip leiande "[6pt]"-spacing-argument (frå "\\[6pt]")
  //   - fjern "&"-align-anker
  //   - trim
  // "&" åleine i ei displayMode-linje er harmlaust, men vi fjernar det
  // for at "= ..."-linjer skal sjå reine ut og stacke som forventa.
  return lines
    .map((l) => stripLineBreakSpacing(l.replace(/&/g, "")).trim())
    .filter((l) => l.length > 0);
}