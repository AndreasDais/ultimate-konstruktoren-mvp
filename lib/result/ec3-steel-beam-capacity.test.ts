import { describe, expect, it } from "vitest";

import {
  buildEc3SteelBeamCapacityReportArtifacts,
  extractEc3SteelBeamCapacityInput,
  screenEc3SteelBeamCapacity,
} from "./ec3-steel-beam-capacity";
import type { Ec3SteelBeamProfile } from "./ec3-steel-beam-capacity";

function expectComputable(result: ReturnType<typeof screenEc3SteelBeamCapacity>) {
  expect(result.computable).toBe(true);
  if (!result.computable) throw new Error("Expected computable result");
  return result;
}

function expectExtractionComputable(
  result: ReturnType<typeof extractEc3SteelBeamCapacityInput>,
) {
  expect(result.computable).toBe(true);
  if (!result.computable) throw new Error("Expected computable extraction");
  return result;
}

function expectExtractionGuard(
  result: ReturnType<typeof extractEc3SteelBeamCapacityInput>,
) {
  expect(result.computable).toBe(false);
  if (result.computable) throw new Error("Expected guarded extraction");
  return result;
}

describe("screenEc3SteelBeamCapacity", () => {
  it.each(["IPE 300", "HEA 200", "HEB 200"])(
    "computes preliminary EC3 screening for verified %s data",
    (profileName) => {
      const result = expectComputable(
        screenEc3SteelBeamCapacity({
          qEdKnPerM: 18,
          spanM: 6,
          profileName,
          grade: "S355",
        }),
      );

      expect(result.scope).toBe("ec3_preliminary_cross_section_screening");
      expect(result.profileName).toBe(profileName);
      expect(result.grade).toBe("S355");
      expect(result.professionalReviewRequired).toBe(true);
      expect(result.finalCodeCompliance).toBe(false);
      expect(result.values.MEdKnm).toBeCloseTo(81, 6);
      expect(result.values.VEdKn).toBeCloseTo(54, 6);
      expect(result.values.governingEta).toBe(
        Math.max(result.values.etaM, result.values.etaV),
      );
    },
  );

  it("uses table units consistently for moment and shear capacity", () => {
    const result = expectComputable(
      screenEc3SteelBeamCapacity({
        qEdKnPerM: 18,
        spanM: 6,
        profileName: "IPE 300",
        grade: "S355",
      }),
    );

    expect(result.inputs.WplYcm3).toBeCloseTo(628.4, 6);
    expect(result.inputs.AvZcm2).toBeCloseTo(25.68, 6);
    expect(result.fyNPerMm2).toBe(355);
    expect(result.gammaM0).toBeCloseTo(1.05, 6);
    expect(result.values.MplRdKnm).toBeCloseTo(212.459, 3);
    expect(result.values.VplRdKn).toBeCloseTo(501.272, 3);
    expect(result.values.etaM).toBeCloseTo(0.3812, 4);
    expect(result.values.etaV).toBeCloseTo(0.1077, 4);
    expect(result.values.governingEta).toBeCloseTo(result.values.etaM, 6);
  });

  it("returns a guard instead of inventing a missing profile", () => {
    const result = screenEc3SteelBeamCapacity({
      qEdKnPerM: 1.2,
      spanM: 20,
      profileName: "W12x26",
      grade: "S355",
    });

    expect(result.computable).toBe(false);
    if (result.computable) throw new Error("Expected guarded result");
    expect(result.reason).toBe("profile_not_found");
    expect(result.missing).toContain("profileName");
    expect(result.finalCodeCompliance).toBe(false);
    expect(result.warnings).toContain("no_aisc_adequacy");
  });

  it("returns a guard when required verified profile properties are missing", () => {
    const incompleteProfile = {
      name: "IPE TEST",
      family: "IPE",
      Wpl_y: 628.4,
      Av_z: Number.NaN,
      tf: 10.7,
    } as Ec3SteelBeamProfile;

    const result = screenEc3SteelBeamCapacity({
      qEdKnPerM: 18,
      spanM: 6,
      profile: incompleteProfile,
      grade: "S355",
    });

    expect(result.computable).toBe(false);
    if (result.computable) throw new Error("Expected guarded result");
    expect(result.reason).toBe("missing_required_property");
    expect(result.missing).toEqual(["Av_z"]);
  });

  it("returns a guard for unsupported steel grades", () => {
    const result = screenEc3SteelBeamCapacity({
      qEdKnPerM: 18,
      spanM: 6,
      profileName: "IPE 300",
      grade: "A992",
    });

    expect(result.computable).toBe(false);
    if (result.computable) throw new Error("Expected guarded result");
    expect(result.reason).toBe("unsupported_grade");
    expect(result.missing).toEqual(["grade"]);
  });

  it("does not run EC3 adequacy for unsupported standard families such as AISC", () => {
    const result = screenEc3SteelBeamCapacity({
      qEdKnPerM: 18,
      spanM: 6,
      profileName: "IPE 300",
      grade: "S355",
      standardFamily: "aisc_asce_aci",
    });

    expect(result.computable).toBe(false);
    if (result.computable) throw new Error("Expected guarded result");
    expect(result.reason).toBe("unsupported_standard_factor_set");
    expect(result.missing).toEqual(["gammaM0"]);
    expect(result.warnings).toContain("no_aisc_adequacy");
  });

  it("returns guardrails for excluded checks and professional review", () => {
    const result = expectComputable(
      screenEc3SteelBeamCapacity({
        qEdKnPerM: 18,
        spanM: 6,
        profileName: "IPE 300",
        grade: "S355",
      }),
    );

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        "preliminary_capacity_screening_only",
        "professional_review_required",
        "ltb_excluded",
        "section_classification_excluded",
        "shear_buckling_excluded",
        "web_crippling_bearing_excluded",
        "moment_shear_interaction_not_checked",
        "deflection_sls_excluded",
        "connections_torsion_fatigue_excluded",
        "no_final_code_compliance",
        "no_aisc_adequacy",
      ]),
    );
    expect(result.wording).toBe(
      "preliminary_capacity_screening_requires_professional_review",
    );
  });

  it("returns a guard for invalid demand inputs", () => {
    const result = screenEc3SteelBeamCapacity({
      qEdKnPerM: 0,
      spanM: 6,
      profileName: "IPE 300",
      grade: "S355",
    });

    expect(result.computable).toBe(false);
    if (result.computable) throw new Error("Expected guarded result");
    expect(result.reason).toBe("invalid_input");
    expect(result.missing).toEqual(["qEdKnPerM"]);
  });

  it("builds preliminary report artifacts without final compliance wording", () => {
    const result = expectComputable(
      screenEc3SteelBeamCapacity({
        qEdKnPerM: 18,
        spanM: 6,
        profileName: "IPE 300",
        grade: "S355",
      }),
    );
    const artifacts = buildEc3SteelBeamCapacityReportArtifacts(result, "en");

    expect(artifacts).not.toBeNull();
    expect(artifacts?.results).toMatchObject({
      M_Ed: "81.0 kNm",
      V_Ed: "54.0 kN",
      Mpl_Rd: "212.5 kNm",
      Vpl_Rd: "501.3 kN",
    });
    expect(artifacts?.results).toHaveProperty("eta_M");
    expect(artifacts?.results).toHaveProperty("eta_V");
    expect(artifacts?.calculationStep.text).toContain("Preliminary EC3");
    expect(artifacts?.calculationStep.text).toContain("not a professional sign-off");
    expect(artifacts?.calculationStep.text).toContain("qualified professional review is required");
    expect(artifacts?.calculationStep.text).not.toMatch(/\bapproved\b|\bcompliant\b/i);
    expect(artifacts?.calculationStep.latex_formula).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Mpl_Rd"),
        expect.stringContaining("eta_M"),
      ]),
    );
  });
});

describe("extractEc3SteelBeamCapacityInput", () => {
  const baseText = [
    "Bjelke IPE 300.",
    "Stalkvalitet S355.",
    "qEd = 18 kN/m.",
    "L = 6 m.",
  ].join(" ");

  it("extracts a strict EC3 happy path for IPE 300, S355, qEd and L", () => {
    const result = expectExtractionComputable(
      extractEc3SteelBeamCapacityInput({
        text: baseText,
        standardFamily: "eurocode_norway",
      }),
    );

    expect(result.profileName).toBe("IPE 300");
    expect(result.grade).toBe("S355");
    expect(result.qEdKnPerM).toBe(18);
    expect(result.spanM).toBe(6);
    expect(result.screeningInput).toMatchObject({
      profileName: "IPE 300",
      grade: "S355",
      qEdKnPerM: 18,
      spanM: 6,
      standardFamily: "eurocode_norway",
    });
  });

  it("guards when multiple supported profiles are present", () => {
    const result = expectExtractionGuard(
      extractEc3SteelBeamCapacityInput({
        text: `${baseText} Alternativt profil HEA 200.`,
      }),
    );

    expect(result.reason).toBe("ambiguous_profile");
    expect(result.missing).toEqual(["IPE 300", "HEA 200"]);
  });

  it("guards when no profile is present", () => {
    const result = expectExtractionGuard(
      extractEc3SteelBeamCapacityInput({
        text: "Stalkvalitet S355. qEd = 18 kN/m. L = 6 m.",
      }),
    );

    expect(result.reason).toBe("missing_profile");
    expect(result.missing).toEqual(["profileName"]);
  });

  it("guards unsupported AISC W-shapes instead of treating them as EC3 profiles", () => {
    const result = expectExtractionGuard(
      extractEc3SteelBeamCapacityInput({
        text: "W12x26, S355, qEd = 18 kN/m, L = 6 m.",
      }),
    );

    expect(result.reason).toBe("unsupported_profile");
    expect(result.missing).toEqual(["profileName"]);
  });

  it("guards unsupported steel grades such as S500", () => {
    const result = expectExtractionGuard(
      extractEc3SteelBeamCapacityInput({
        text: "IPE 300, S500, qEd = 18 kN/m, L = 6 m.",
      }),
    );

    expect(result.reason).toBe("unsupported_grade");
    expect(result.missing).toEqual(["S500"]);
  });

  it.each([
    "q = 18 kN/m",
    "gk = 12 kN/m",
    "qk = 6 kN/m",
    "dead load = 12 kN/m",
    "live load = 6 kN/m",
    "wu = 1.2 kip/ft",
  ])("guards non-design or characteristic load signal %s", (loadText) => {
    const result = expectExtractionGuard(
      extractEc3SteelBeamCapacityInput({
        text: `IPE 300, S355, ${loadText}, L = 6 m.`,
      }),
    );

    expect(result.reason).toBe("ambiguous_or_characteristic_load");
    expect(result.missing).toEqual(["qEdKnPerM"]);
  });

  it("guards explicit qEd when a generic q load is also present", () => {
    const result = expectExtractionGuard(
      extractEc3SteelBeamCapacityInput({
        text: "IPE 300, S355, qEd = 18 kN/m, q = 12 kN/m, L = 6 m.",
      }),
    );

    expect(result.reason).toBe("ambiguous_or_characteristic_load");
    expect(result.missing).toEqual(["qEdKnPerM"]);
  });

  it.each([
    "qEd = 18 kN/m",
    "q_Ed = 18 kN/m",
    "qd = 18 kN/m",
    "q_d = 18 kN/m",
    "dimensjonerande last = 18 kN/m",
    "design load = 18 kN/m",
  ])("accepts explicit design-load signal %s", (loadText) => {
    const result = expectExtractionComputable(
      extractEc3SteelBeamCapacityInput({
        text: `IPE 300, S355, ${loadText}, L = 6 m.`,
      }),
    );

    expect(result.qEdKnPerM).toBe(18);
  });

  it.each([
    ["L = 6 m", 6],
    ["span = 6 m", 6],
    ["spennvidde = 6 m", 6],
    ["L = 6000 mm", 6],
  ])("accepts explicit span signal %s", (spanText, expectedSpan) => {
    const result = expectExtractionComputable(
      extractEc3SteelBeamCapacityInput({
        text: `IPE 300, S355, qEd = 18 kN/m, ${spanText}.`,
      }),
    );

    expect(result.spanM).toBe(expectedSpan);
  });

  it("guards when span is missing", () => {
    const result = expectExtractionGuard(
      extractEc3SteelBeamCapacityInput({
        text: "IPE 300, S355, qEd = 18 kN/m.",
      }),
    );

    expect(result.reason).toBe("missing_span");
    expect(result.missing).toEqual(["spanM"]);
  });

  it("guards unsupported standard families before EC3 screening", () => {
    const result = expectExtractionGuard(
      extractEc3SteelBeamCapacityInput({
        text: baseText,
        standardFamily: "aisc_asce_aci",
      }),
    );

    expect(result.reason).toBe("unsupported_standard");
    expect(result.missing).toEqual(["standardFamily"]);
  });

  it("supports strict structured data without producing report rows", () => {
    const result = expectExtractionComputable(
      extractEc3SteelBeamCapacityInput({
        structured: {
          profileName: "IPE 300",
          grade: "S355",
          qEdKnPerM: 18,
          spanM: 6,
        },
      }),
    );

    expect(result.screeningInput).toMatchObject({
      profileName: "IPE 300",
      grade: "S355",
      qEdKnPerM: 18,
      spanM: 6,
    });
    expect(result).not.toHaveProperty("reportRows");
    expect(result).not.toHaveProperty("calculationRows");
  });
});
