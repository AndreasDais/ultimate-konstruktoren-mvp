import type { EngineeringStandardFamily } from "@/lib/engineering-context/types";
import {
  yieldStrength,
  type SteelGrade,
} from "@/lib/profiles/na-basis";
import {
  resolveFactorSet,
  type StructuralFactorSet,
} from "@/lib/profiles/standards-basis";
import {
  findProfile,
  type SteelProfile,
} from "@/lib/profiles/steel-profiles";

export type Ec3SteelBeamProfile = Pick<
  SteelProfile,
  "name" | "family" | "Wpl_y" | "Av_z" | "tf"
>;

export type Ec3SteelBeamCapacityInput = {
  qEdKnPerM: number;
  spanM: number;
  profileName?: string | null;
  /**
   * Use only for an already verified profile record, or tests. Normal runtime
   * callers should pass profileName and let the helper read the verified table.
   */
  profile?: Ec3SteelBeamProfile | null;
  grade: SteelGrade | string;
  standardFamily?: EngineeringStandardFamily;
};

export type Ec3CapacityGuardReason =
  | "invalid_input"
  | "profile_not_found"
  | "unsupported_profile_family"
  | "missing_required_property"
  | "unsupported_grade"
  | "unsupported_standard_factor_set";

export type Ec3CapacityWarning =
  | "preliminary_capacity_screening_only"
  | "professional_review_required"
  | "ltb_excluded"
  | "section_classification_excluded"
  | "shear_buckling_excluded"
  | "web_crippling_bearing_excluded"
  | "moment_shear_interaction_not_checked"
  | "deflection_sls_excluded"
  | "connections_torsion_fatigue_excluded"
  | "no_final_code_compliance"
  | "no_aisc_adequacy";

export type Ec3SteelBeamCapacityValues = {
  MEdKnm: number;
  VEdKn: number;
  MplRdKnm: number;
  VplRdKn: number;
  etaM: number;
  etaV: number;
  governingEta: number;
};

type Ec3CapacityBase = {
  scope: "ec3_preliminary_cross_section_screening";
  standardFamily: EngineeringStandardFamily | "eurocode_norway_default";
  warnings: Ec3CapacityWarning[];
  professionalReviewRequired: true;
  finalCodeCompliance: false;
  wording: "preliminary_capacity_screening_requires_professional_review";
};

export type Ec3SteelBeamCapacityResult =
  | (Ec3CapacityBase & {
      computable: true;
      profileName: string;
      grade: SteelGrade;
      gammaM0: number;
      fyNPerMm2: number;
      inputs: {
        qEdKnPerM: number;
        spanM: number;
        WplYcm3: number;
        AvZcm2: number;
      };
      values: Ec3SteelBeamCapacityValues;
      formulas: {
        MEd: "qEd * L^2 / 8";
        VEd: "qEd * L / 2";
        MplRd: "Wpl_y * fy / gammaM0";
        VplRd: "Av_z * fy / (sqrt(3) * gammaM0)";
      };
    })
  | (Ec3CapacityBase & {
      computable: false;
      reason: Ec3CapacityGuardReason;
      missing: string[];
    });

const SUPPORTED_PROFILE_FAMILIES: ReadonlySet<SteelProfile["family"]> = new Set([
  "IPE",
  "HEA",
  "HEB",
]);

const STEEL_GRADES: ReadonlySet<string> = new Set([
  "S235",
  "S275",
  "S355",
  "S420",
  "S460",
]);

const EXCLUDED_CHECK_WARNINGS: Ec3CapacityWarning[] = [
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
];

function base(
  standardFamily: EngineeringStandardFamily | undefined,
): Ec3CapacityBase {
  return {
    scope: "ec3_preliminary_cross_section_screening",
    standardFamily: standardFamily ?? "eurocode_norway_default",
    warnings: EXCLUDED_CHECK_WARNINGS,
    professionalReviewRequired: true,
    finalCodeCompliance: false,
    wording: "preliminary_capacity_screening_requires_professional_review",
  };
}

function guarded(
  input: Ec3SteelBeamCapacityInput,
  reason: Ec3CapacityGuardReason,
  missing: string[],
): Ec3SteelBeamCapacityResult {
  return {
    ...base(input.standardFamily),
    computable: false,
    reason,
    missing,
  };
}

function finitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function parseSteelGrade(value: string): SteelGrade | null {
  const normalized = value.trim().toUpperCase();
  return STEEL_GRADES.has(normalized) ? (normalized as SteelGrade) : null;
}

function resolveProfile(input: Ec3SteelBeamCapacityInput): Ec3SteelBeamProfile | null {
  if (input.profile) return input.profile;
  if (!input.profileName?.trim()) return null;
  return findProfile(input.profileName);
}

function resolveGammaM0(
  family: EngineeringStandardFamily | undefined,
): number | null {
  const factorSet: StructuralFactorSet | null = resolveFactorSet(family);
  return finitePositive(factorSet?.gammaM0) ? factorSet.gammaM0 : null;
}

function requiredPropertyGaps(profile: Ec3SteelBeamProfile): string[] {
  const missing: string[] = [];
  if (!finitePositive(profile.Wpl_y)) missing.push("Wpl_y");
  if (!finitePositive(profile.Av_z)) missing.push("Av_z");
  if (!finitePositive(profile.tf)) missing.push("tf");
  return missing;
}

export function screenEc3SteelBeamCapacity(
  input: Ec3SteelBeamCapacityInput,
): Ec3SteelBeamCapacityResult {
  const invalidInputs: string[] = [];
  if (!finitePositive(input.qEdKnPerM)) invalidInputs.push("qEdKnPerM");
  if (!finitePositive(input.spanM)) invalidInputs.push("spanM");
  if (invalidInputs.length > 0) {
    return guarded(input, "invalid_input", invalidInputs);
  }

  const profile = resolveProfile(input);
  if (!profile) {
    return guarded(input, "profile_not_found", ["profileName"]);
  }
  if (!SUPPORTED_PROFILE_FAMILIES.has(profile.family)) {
    return guarded(input, "unsupported_profile_family", ["profile.family"]);
  }

  const propertyGaps = requiredPropertyGaps(profile);
  if (propertyGaps.length > 0) {
    return guarded(input, "missing_required_property", propertyGaps);
  }

  const grade = parseSteelGrade(input.grade);
  if (!grade) {
    return guarded(input, "unsupported_grade", ["grade"]);
  }

  const gammaM0 = resolveGammaM0(input.standardFamily);
  if (!gammaM0) {
    return guarded(input, "unsupported_standard_factor_set", ["gammaM0"]);
  }

  let fyNPerMm2: number;
  try {
    fyNPerMm2 = yieldStrength(grade, profile.tf);
  } catch {
    return guarded(input, "missing_required_property", ["fy"]);
  }

  const MEdKnm = (input.qEdKnPerM * input.spanM ** 2) / 8;
  const VEdKn = (input.qEdKnPerM * input.spanM) / 2;
  const MplRdKnm = (profile.Wpl_y * 1000 * fyNPerMm2) / gammaM0 / 1_000_000;
  const VplRdKn = (profile.Av_z * 100 * fyNPerMm2) / (Math.sqrt(3) * gammaM0) / 1000;
  const etaM = MEdKnm / MplRdKnm;
  const etaV = VEdKn / VplRdKn;

  return {
    ...base(input.standardFamily),
    computable: true,
    profileName: profile.name,
    grade,
    gammaM0,
    fyNPerMm2,
    inputs: {
      qEdKnPerM: input.qEdKnPerM,
      spanM: input.spanM,
      WplYcm3: profile.Wpl_y,
      AvZcm2: profile.Av_z,
    },
    values: {
      MEdKnm,
      VEdKn,
      MplRdKnm,
      VplRdKn,
      etaM,
      etaV,
      governingEta: Math.max(etaM, etaV),
    },
    formulas: {
      MEd: "qEd * L^2 / 8",
      VEd: "qEd * L / 2",
      MplRd: "Wpl_y * fy / gammaM0",
      VplRd: "Av_z * fy / (sqrt(3) * gammaM0)",
    },
  };
}
