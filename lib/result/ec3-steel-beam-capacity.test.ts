import { describe, expect, it } from "vitest";

import { screenEc3SteelBeamCapacity } from "./ec3-steel-beam-capacity";
import type { Ec3SteelBeamProfile } from "./ec3-steel-beam-capacity";

function expectComputable(result: ReturnType<typeof screenEc3SteelBeamCapacity>) {
  expect(result.computable).toBe(true);
  if (!result.computable) throw new Error("Expected computable result");
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
});
