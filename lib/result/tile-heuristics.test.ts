import { describe, it, expect } from "vitest";
import {
  EC3_CAPACITY_SCREENING_DISCLAIMER,
  getDimensjonerandeKeys,
  tileDescription,
  tileLabel,
} from "@/lib/result/tile-heuristics";

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

describe("EC3 capacity screening tile labels", () => {
  const ec3Keys = ["M_Ed", "V_Ed", "Mpl_Rd", "Vpl_Rd", "eta_M", "eta_V"];
  const unsafeLabelWords = /approved|compliant|pass|fail|godkjent|bestått|\bOK\b/i;

  it("has explicit nb, nn and en labels for EC3 screening keys", () => {
    for (const key of ec3Keys) {
      for (const language of ["nb", "nn", "en"] as const) {
        const label = tileLabel(key, language);

        expect(label).toBeTruthy();
        expect(label).not.toMatch(unsafeLabelWords);
      }
    }

    expect(tileLabel("eta_M", "nb")).toBe("UTNYTTING · ηM");
    expect(tileLabel("eta_V", "nn")).toBe("UTNYTTING · ηV");
    expect(tileLabel("eta_M", "en")).toBe("UTILIZATION · ηM");
    expect(tileLabel("eta_V", "en")).toBe("UTILIZATION · ηV");
    expect(tileLabel("Mpl_Rd", "en")).toBe("MOMENT · Mpl,Rd");
    expect(tileLabel("Vpl_Rd", "en")).toBe("SHEAR · Vpl,Rd");
  });

  it("does not fall back to ugly uppercase splitting for EC3 screening keys", () => {
    expect(tileLabel("eta_M", "en")).not.toBe("ETA · M");
    expect(tileLabel("eta_V", "en")).not.toBe("ETA · V");
    expect(tileLabel("Mpl_Rd", "en")).not.toBe("MPL · RD");
    expect(tileLabel("Vpl_Rd", "en")).not.toBe("VPL · RD");
  });

  it("describes EC3 screening as preliminary and requiring professional review", () => {
    expect(EC3_CAPACITY_SCREENING_DISCLAIMER).toMatchObject({
      nb: expect.stringContaining("Foreløpig EC3-tverrsnittsscreening"),
      nn: expect.stringContaining("Førebels EC3-tverrsnittsscreening"),
      en: expect.stringContaining("Preliminary EC3 cross-section screening"),
    });

    for (const key of ["Mpl_Rd", "Vpl_Rd", "eta_M", "eta_V"]) {
      for (const language of ["nb", "nn", "en"] as const) {
        const description = tileDescription(key, language);

        expect(description).toBeTruthy();
        expect(description).toContain(
          EC3_CAPACITY_SCREENING_DISCLAIMER[language],
        );
        expect(description).toMatch(/professional review|fagpersonvurdering/i);
      }
    }
  });

  it("keeps eta utilization visible for EC3 capacity grouping", () => {
    const keys = getDimensjonerandeKeys(
      {
        M_Ed: "81,0 kNm",
        V_Ed: "54,0 kN",
        Mpl_Rd: "212,5 kNm",
        Vpl_Rd: "501,3 kN",
        eta_M: "0,381",
        eta_V: "0,108",
      },
      "stalkapasitet",
    );

    expect(keys[0]).toBe("eta_M");
    expect(keys).toEqual(
      expect.arrayContaining(["eta_M", "eta_V", "Mpl_Rd", "Vpl_Rd"]),
    );
  });
});
