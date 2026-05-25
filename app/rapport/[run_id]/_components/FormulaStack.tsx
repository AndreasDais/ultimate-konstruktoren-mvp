"use client";

import Formula from "@/app/components/Formula";
import {
  splitOnTopLevelEquals,
  hasAlignedEnvironment,
  unwrapAlignedEnvironment,
  stripLineBreakSpacing,
} from "@/lib/result/formula-extract";

/**
 * FormulaStack — kompakt, gruppert rendering av berekningssteg.
 *
 * KaTeX bryt ikkje lange `\displaystyle`-formlar; dei stikk ut av arket.
 * Vi hentar difor ut ei segment-liste (aligned-blokker, `\\`/`\n`-linjebrot,
 * toppnivå-`=`) og set ho saman att til `\begin{aligned}`-uttrykk.
 *
 * VIKTIG — gruppering per storleik:
 *   Eit agent-"steg" inneheld ofte FLEIRE storleikar (t.d. ε, så c/t_f, så
 *   h_w/t_w i ein tverrsnittsklasse-sjekk). Å stable alt i éin aligned-grid
 *   gjev ein uleseleg blokk der nakne symbol flyt i `=`-kolonnen.
 *   Difor: kvart segment UTAN leiande `=` startar ei ny under-utrekning.
 *   Kvar gruppe blir sitt eige tette aligned-blokk; `.rapport-formula-stack`
 *   sitt gap gjev tydeleg luft mellom storleikane. Innan ei storleik er
 *   rytmen tett (LaTeX-jot); mellom storleikar er det eit klart skilje.
 *
 * Breidde: eit aligned-blokk er only så breitt som den breiaste RADA, så
 * horisontal overflyt er sjeldan. `.rapport-formula-scroll` scrollar éin
 * blokk horisontalt om ei rad likevel skulle bli for brei (sikkerheitsnett).
 *
 * Få ledd (< stackThreshold) → formelen rendrast urørt.
 */

type Props = {
  latex: string;
  fallbackText: string;
  /** Minimum tal på segment før vi grupperer/alignar. Default 3. */
  stackThreshold?: number;
};

/**
 * Hentar ei flat segment-liste ut av ein formel-streng. Handterer:
 *   1. `\begin{aligned}` ... `\end{aligned}`  → pakkast opp til linjer
 *   2. fleire linjer skilde av `\\` eller rått `\n`
 *   3. éi linje med fleire toppnivå-`=`
 */
function extractSegments(latex: string): string[] {
  if (hasAlignedEnvironment(latex)) {
    const lines = unwrapAlignedEnvironment(latex);
    if (lines.length > 0) {
      return lines.flatMap((line) => {
        const eq = splitOnTopLevelEquals(line);
        return eq.length > 0 ? eq : [line];
      });
    }
    // Unwrapping feila — fall gjennom til rå handsaming.
  }

  const rawLines = latex
    .split(/\\\\|\n/)
    .map((s) => stripLineBreakSpacing(s))
    .filter(Boolean);

  if (rawLines.length > 1) {
    return rawLines.flatMap((line) => {
      const eq = splitOnTopLevelEquals(line);
      return eq.length > 0 ? eq : [line];
    });
  }
  return splitOnTopLevelEquals(latex);
}

/** Reinsar eit segment for teikn som ville bryte aligned-gridet. */
function cleanSegment(seg: string): string {
  return seg.replace(/\\\\/g, " ").replace(/&/g, " ").trim();
}

/**
 * Grupperer segment per storleik. Eit segment utan leiande "=" startar
 * ei ny gruppe (ny storleik); "="-ledd høyrer til storleiken over.
 *
 *   ["ε", "= √(235/fy)", "= 0,8136", "c/t_f", "= 95,5/15", "= 6,37"]
 *     → [["ε", "= √(235/fy)", "= 0,8136"], ["c/t_f", "= 95,5/15", "= 6,37"]]
 */
function groupSegments(segments: string[]): string[][] {
  const groups: string[][] = [];
  for (const seg of segments) {
    if (groups.length === 0 || !seg.startsWith("=")) {
      groups.push([seg]);
    } else {
      groups[groups.length - 1].push(seg);
    }
  }
  return groups;
}

/**
 * Set ei segment-gruppe saman til eitt `\begin{aligned}`-uttrykk.
 *
 * Symbol-segmentet (utan leiande "=") slåast saman med første "="-ledd på
 * rad 1: "λ_1" + "= π√(...)" → "λ_1 &= π√(...)". Resten av "="-ledda får
 * kvar si rad, venstrejustert mot "="-kolonnen via "&".
 */
function buildAligned(group: string[]): string {
  const rows: string[] = [];
  let rest = group;

  if (!group[0].startsWith("=")) {
    rows.push(group[1] ? `${group[0]} &${group[1]}` : `${group[0]} &`);
    rest = group.slice(2);
  }
  for (const s of rest) {
    rows.push(`&${s}`);
  }

  return `\\begin{aligned}${rows.join(" \\\\ ")}\\end{aligned}`;
}

export function FormulaStack({ latex, fallbackText, stackThreshold = 3 }: Props) {
  const segments = extractSegments(latex).map(cleanSegment).filter(Boolean);

  // Få ledd → rendr formelen urørt.
  if (segments.length < stackThreshold) {
    return <Formula latex={latex} fallbackText={fallbackText} />;
  }

  // Grupper per storleik; kvar gruppe blir eit eige tett aligned-blokk.
  const groups = groupSegments(segments);
  return (
    <div className="rapport-formula-stack" role="math" aria-label={fallbackText}>
      {groups.map((group, i) => (
        <Formula
          key={i}
          latex={buildAligned(group)}
          fallbackText={i === 0 ? fallbackText : group.join(" ")}
        />
      ))}
    </div>
  );
}