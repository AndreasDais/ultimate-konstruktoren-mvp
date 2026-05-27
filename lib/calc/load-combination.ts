/**
 * Deterministisk STR-lastkombinasjon etter EC0 (NS-EN 1990 + norsk NA).
 *
 * Reknar 6.10a og 6.10b og finn den dimensjonerande (største) verdien.
 * Rein, sideeffektfri funksjon — same rolle for lastkombinasjon som
 * na-basis.ts har for NDP-verdiar: éitt rett svar, rekna i kode, ikkje
 * gjetta av ein språkmodell.
 *
 * Brukt av:
 *  - Controller (agent_d) — uavhengig re-rekning som fangar
 *    kombinasjonsstruktur-feil (A2-klassen: ekv. 6.10 utkledd som «6.10a»).
 *  - seinare: test-agent og live skugge-sjekk.
 *
 * Partialfaktorane (gamma_G, gamma_Q, psi0) kjem frå EC0 i na-basis.ts —
 * den autoritative kjelda. Dei blir ALDRI redefinerte her.
 *
 * STR-kombinasjon, tabell NA.A1.2(B):
 *   6.10a:  1,35·SG + S(1,5·psi0,i·Q_i)            — alle variable laster psi0-reduserte
 *   6.10b:  1,20·SG + 1,5·Q_1 + S(1,5·psi0,i·Q_i)  — leiande last Q_1 uredusert, resten psi0
 *   Dimensjonerande = max(6.10a ; alle 6.10b-variantar)
 *
 * Ekv. 6.10 (1,35·SG + 1,5·SQ) er ei konservativ FORENKLING, ikkje
 * NA-kombinasjonen, og blir med vilje ikkje rekna her.
 *
 * Einingar: funksjonen er einings-agnostisk. Kallaren gjev konsistente
 * talverdiar (alle i kN, eller alle i kN/m, osv.) og får svaret i same eining.
 */

import { EC0 } from "@/lib/profiles/na-basis";
import type { StructuralFactorSet } from "@/lib/profiles/standards-basis";

/** Lastkategori — styrer psi0-verdien etter EC0/NA. */
export type LoadCategory = "imposed_A_D" | "imposed_E" | "snow" | "wind";

/** Permanent (varig) last G_k — karakteristisk verdi. */
export type PermanentLoad = {
  /** Valfritt namn for sporing/visning, t.d. "eigenvekt". */
  name?: string;
  /** Karakteristisk verdi G_k. Må vere eit endeleg tal >= 0. */
  value: number;
};

/** Variabel last Q_k (nyttelast / sno / vind) — karakteristisk verdi. */
export type VariableLoad = {
  /** Valfritt namn. Manglar det, blir "Q1", "Q2", ... brukt. */
  name?: string;
  /** Karakteristisk verdi Q_k. Må vere eit endeleg tal >= 0. */
  value: number;
  /** Lastkategori — bestemmer psi0. */
  category: LoadCategory;
};

export type CombinationInput = {
  permanent: PermanentLoad[];
  variable: VariableLoad[];
};

/** Eitt utrekna kombinasjonsledd. */
export type CombinationTerm = {
  equation: "6.10a" | "6.10b";
  /** Leiande variabel-last for 6.10b. null for 6.10a (alle er psi0-reduserte). */
  leadingLoad: string | null;
  /** Utrekna verdi for dette leddet. */
  value: number;
};

export type CombinationResult = {
  /** 6.10a + eitt 6.10b-ledd per val av leiande last. */
  terms: CombinationTerm[];
  /** Det dimensjonerande (største) leddet. */
  governing: CombinationTerm;
  /** = governing.value. Den dimensjonerande lastverknaden. */
  designValue: number;
};

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  "imposed_A_D",
  "imposed_E",
  "snow",
  "wind",
]);

/** psi0 frå EC0/NA for ein gitt kategori. */
function psi0For(
  category: LoadCategory,
  factors?: StructuralFactorSet,
): number {
  const psi0 = factors?.psi0 ?? EC0.psi0;
  switch (category) {
    case "imposed_A_D":
      return psi0.imposed_A_D;
    case "imposed_E":
      return psi0.imposed_E;
    case "snow":
      return psi0.snow;
    case "wind":
      return psi0.wind;
    default: {
      const exhaustive: never = category;
      throw new Error(`Ukjend lastkategori: ${String(exhaustive)}`);
    }
  }
}

function assertFiniteNonNegative(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label}: forventa eit endeleg tal, fekk ${String(value)}.`);
  }
  if (value < 0) {
    throw new Error(
      `${label}: negativ verdi (${value}). Denne modulen dekkjer ugunstig ` +
        `STR-kombinasjon; gunstige laster må handterast separat.`,
    );
  }
}

function labelFor(load: VariableLoad, index: number): string {
  return load.name && load.name.trim() ? load.name.trim() : `Q${index + 1}`;
}

/**
 * Reknar STR-lastkombinasjonen og returnerer 6.10a, alle 6.10b-variantar,
 * og den dimensjonerande verdien.
 *
 * Kastar ved ugyldig input — modulen gjettar aldri.
 */
export function computeStrCombination(
  input: CombinationInput,
  factors?: StructuralFactorSet,
): CombinationResult {
  if (!input || !Array.isArray(input.permanent) || !Array.isArray(input.variable)) {
    throw new Error(
      "computeStrCombination: input må ha `permanent` og `variable` som array.",
    );
  }
  const { permanent, variable } = input;

  if (permanent.length === 0 && variable.length === 0) {
    throw new Error(
      "computeStrCombination: ingen laster oppgitt — kan ikkje kombinere.",
    );
  }

  permanent.forEach((g, i) => {
    if (!g || typeof g !== "object") {
      throw new Error(`Permanent last #${i + 1}: ugyldig oppføring.`);
    }
    assertFiniteNonNegative(g.value, `Permanent last #${i + 1} (${g.name ?? "unamngitt"})`);
  });

  variable.forEach((q, i) => {
    if (!q || typeof q !== "object") {
      throw new Error(`Variabel last #${i + 1}: ugyldig oppføring.`);
    }
    assertFiniteNonNegative(q.value, `Variabel last #${i + 1} (${q.name ?? "unamngitt"})`);
    if (!VALID_CATEGORIES.has(q.category)) {
      throw new Error(
        `Variabel last #${i + 1} (${q.name ?? "unamngitt"}): ukjend lastkategori ` +
          `"${String(q.category)}". Gyldige: imposed_A_D, imposed_E, snow, wind.`,
      );
    }
  });

  const sumG = permanent.reduce((acc, g) => acc + g.value, 0);
  const gammaG_610a = factors?.gammaG_610a ?? EC0.gammaG.unfav_610a;
  const gammaG_610b = factors?.gammaG_610b ?? EC0.gammaG.unfav_610b;
  const gammaQ = factors?.gammaQ_unfav ?? EC0.gammaQ.unfav;

  // ── 6.10a: alle variable laster psi0-reduserte.
  const a610Value =
    gammaG_610a * sumG +
    variable.reduce((acc, q) => acc + gammaQ * psi0For(q.category, factors) * q.value, 0);

  const terms: CombinationTerm[] = [
    { equation: "6.10a", leadingLoad: null, value: a610Value },
  ];

  // ── 6.10b: eitt ledd per val av leiande last. Leiande får full 1,5,
  //    resten psi0-reduserte. Utan variable laster: only 1,20·SG.
  if (variable.length === 0) {
    terms.push({
      equation: "6.10b",
      leadingLoad: null,
      value: gammaG_610b * sumG,
    });
  } else {
    variable.forEach((leading, leadIdx) => {
      const value =
        gammaG_610b * sumG +
        variable.reduce((acc, q, i) => {
          if (i === leadIdx) return acc + gammaQ * q.value;
          return acc + gammaQ * psi0For(q.category, factors) * q.value;
        }, 0);
      terms.push({
        equation: "6.10b",
        leadingLoad: labelFor(leading, leadIdx),
        value,
      });
    });
  }

  // ── Dimensjonerande = største ledd. Stabilt val ved likskap (fyrste vinn).
  let governing = terms[0];
  for (const term of terms) {
    if (term.value > governing.value) governing = term;
  }

  return { terms, governing, designValue: governing.value };
}