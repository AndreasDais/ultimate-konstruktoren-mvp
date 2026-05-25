import { describe, it, expect } from "vitest";
import { getDimensjonerandeKeys } from "@/lib/result/tile-heuristics";

// FIKS 4: getDimensjonerandeKeys skal bruke konstruktøren si eksplisitte
// result_roles-tagging når ho finst, og elles falle tilbake til den
// regelbaserte heuristikken.

describe("getDimensjonerandeKeys — rolle-tagging (FIKS 4)", () => {
  const results = {
    g_k: "6,0 kN/m",
    gamma_G: "1,35",
    Ed_dim: "22,88 kN/m",
    F_Ed_6_10a: "20,18 kN/m",
  };

  it("use eksplisitt rolle: only 'dimensjonerande'-nøklar blir tiles", () => {
    const roles = {
      g_k: "input",
      gamma_G: "intermediate value",
      Ed_dim: "dimensjonerande",
      F_Ed_6_10a: "intermediate value",
    };
    expect(getDimensjonerandeKeys(results, "lastkombinasjon", roles)).toEqual([
      "Ed_dim",
    ]);
  });

  it("rolle-tagging med fleire design values", () => {
    const roles = {
      g_k: "input",
      gamma_G: "intermediate value",
      Ed_dim: "dimensjonerande",
      F_Ed_6_10a: "dimensjonerande",
    };
    const keys = getDimensjonerandeKeys(results, "lastkombinasjon", roles);
    expect(keys).toContain("Ed_dim");
    expect(keys).toContain("F_Ed_6_10a");
    expect(keys).not.toContain("g_k");
    expect(keys).not.toContain("gamma_G");
  });

  it("fell tilbake til heuristikk når roles manglar heilt", () => {
    // Utan roles skal funksjonen oppføre seg som før (regelbasert).
    const keys = getDimensjonerandeKeys(results, "lastkombinasjon");
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBeGreaterThan(0);
  });

  it("fell tilbake når roles finst men ingen er 'dimensjonerande'", () => {
    const rolesUtanDim = {
      g_k: "input",
      gamma_G: "intermediate value",
      Ed_dim: "intermediate value",
      F_Ed_6_10a: "intermediate value",
    };
    const medRoles = getDimensjonerandeKeys(results, "lastkombinasjon", rolesUtanDim);
    const utanRoles = getDimensjonerandeKeys(results, "lastkombinasjon");
    expect(medRoles).toEqual(utanRoles);
  });

  it("degraderer trygt på feilforma roles (ikkje objekt)", () => {
    // @ts-expect-error — testar runtime-vern mot ugyldig roles-verdi
    const keys = getDimensjonerandeKeys(results, "lastkombinasjon", "tull");
    expect(Array.isArray(keys)).toBe(true);
    expect(keys.length).toBeGreaterThan(0);
  });

  it("tomt results gir tom liste, uavhengig av roles", () => {
    expect(getDimensjonerandeKeys({}, "lastkombinasjon", { x: "dimensjonerande" })).toEqual([]);
  });
});