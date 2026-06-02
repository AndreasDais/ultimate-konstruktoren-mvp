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

export type Ec3CapacityExtractionGuardReason =
  | "missing_profile"
  | "ambiguous_profile"
  | "unsupported_profile"
  | "missing_grade"
  | "unsupported_grade"
  | "missing_design_load"
  | "ambiguous_or_characteristic_load"
  | "missing_span"
  | "unsupported_standard"
  | "missing_factor_set";

export type Ec3SteelBeamCapacityExtractionInput = {
  text?: string | null;
  structured?: unknown;
  standardFamily?: EngineeringStandardFamily;
};

export type Ec3SteelBeamCapacityExtractionResult =
  | {
      computable: true;
      profileName: string;
      grade: SteelGrade;
      qEdKnPerM: number;
      spanM: number;
      screeningInput: Ec3SteelBeamCapacityInput;
    }
  | {
      computable: false;
      reason: Ec3CapacityExtractionGuardReason;
      missing: string[];
    };

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

function extractionGuard(
  reason: Ec3CapacityExtractionGuardReason,
  missing: string[],
): Ec3SteelBeamCapacityExtractionResult {
  return {
    computable: false,
    reason,
    missing,
  };
}

function isSupportedEc3StandardFamily(
  family: EngineeringStandardFamily | undefined,
): boolean {
  return (
    family === undefined ||
    family === "eurocode_norway" ||
    family === "eurocode_general"
  );
}

type StructuredEntry = {
  path: string;
  key: string;
  value: unknown;
};

function collectStructuredEntries(
  value: unknown,
  path: string[] = [],
  depth = 0,
): StructuredEntry[] {
  if (value === null || value === undefined || depth > 8) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectStructuredEntries(item, [...path, String(index)], depth + 1),
    );
  }
  if (typeof value !== "object") {
    const key = path.at(-1) ?? "";
    return [{ path: path.join("."), key, value }];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
    collectStructuredEntries(item, [...path, key], depth + 1),
  );
}

function sourceTextForExtraction(input: Ec3SteelBeamCapacityExtractionInput): {
  text: string;
  entries: StructuredEntry[];
} {
  const entries = collectStructuredEntries(input.structured);
  const parts = [
    input.text ?? "",
    ...entries
      .filter(
        (entry) =>
          typeof entry.value === "string" ||
          typeof entry.value === "number" ||
          typeof entry.value === "boolean",
      )
      .map((entry) => `${entry.path}: ${String(entry.value)}`),
  ];
  return { text: parts.join("\n"), entries };
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  const parsed = Number(normalized);
  return finitePositive(parsed) ? parsed : null;
}

function numericValue(value: unknown): number | null {
  if (typeof value === "number") return finitePositive(value) ? value : null;
  if (typeof value === "string") {
    const match = value.match(/\d+(?:[.,]\d+)?/);
    return match ? parseDecimal(match[0]) : null;
  }
  return null;
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function uniqueNumbers(values: number[]): number[] {
  const unique: number[] = [];
  for (const value of values) {
    if (!unique.some((existing) => Math.abs(existing - value) < 1e-9)) {
      unique.push(value);
    }
  }
  return unique;
}

function extractProfileName(text: string): Ec3SteelBeamCapacityExtractionResult | {
  profileName: string;
} {
  const supportedNames = uniqueValues(
    [...text.matchAll(/\b(IPE|HEA|HEB)\s*-?\s*(\d{2,3})\b/gi)].map(
      (match) => `${match[1].toUpperCase()} ${match[2]}`,
    ),
  );
  const unsupportedProfileSeen =
    /\bW\s*\d{1,3}\s*[xX]\s*\d+\b/.test(text) ||
    /\b(?:UB|UC|SHS|RHS|CHS|HP)\s*\d{2,4}\b/i.test(text);

  if (supportedNames.length === 0) {
    return extractionGuard(
      unsupportedProfileSeen ? "unsupported_profile" : "missing_profile",
      ["profileName"],
    );
  }
  if (supportedNames.length > 1) {
    return extractionGuard("ambiguous_profile", supportedNames);
  }
  if (!findProfile(supportedNames[0])) {
    return extractionGuard("unsupported_profile", [supportedNames[0]]);
  }
  return { profileName: supportedNames[0] };
}

function extractGrade(text: string): Ec3SteelBeamCapacityExtractionResult | {
  grade: SteelGrade;
} {
  const gradeTokens = uniqueValues(
    [...text.matchAll(/\bS\s*(\d{3})\b/gi)].map((match) => `S${match[1]}`),
  );
  const supported = uniqueValues(
    gradeTokens
      .map((token) => parseSteelGrade(token))
      .filter((grade): grade is SteelGrade => grade !== null),
  );

  if (gradeTokens.length === 0) {
    return extractionGuard("missing_grade", ["grade"]);
  }
  if (supported.length !== 1 || supported.length !== gradeTokens.length) {
    return extractionGuard("unsupported_grade", gradeTokens);
  }
  return { grade: supported[0] };
}

function isDesignLoadKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return (
    normalized === "qed" ||
    normalized === "qd" ||
    normalized.includes("qedknperm") ||
    normalized.includes("qedknm") ||
    normalized.includes("qdknperm") ||
    normalized.includes("designload") ||
    normalized.includes("dimensjonerandelast") ||
    normalized.includes("dimensjonerendelast")
  );
}

function normalizeLoadUnitToKnPerM(value: number, unit: string): number | null {
  const normalized = unit.toLowerCase().replace(/\s+/g, "");
  if (normalized === "kn/m" || normalized === "knperm") return value;
  if (normalized === "n/mm") return value;
  return null;
}

function extractDesignLoadsFromText(text: string): number[] {
  const numberPattern = String.raw`(\d+(?:[.,]\d+)?)`;
  const signalPattern = String.raw`(?:\bq\s*[_-]?\s*ed\b|\bq\s*[_-]?\s*d\b|\bdimensjonerande\s+last\b|\bdimensjonerende\s+last\b|\bdesign\s+load\b)`;
  const unitPattern = String.raw`(kN\s*(?:/|per)\s*m|N\s*/\s*mm)`;
  const pattern = new RegExp(
    `${signalPattern}\\s*(?:=|:|er|is)?\\s*${numberPattern}\\s*${unitPattern}`,
    "gi",
  );
  return [...text.matchAll(pattern)]
    .map((match) => {
      const value = parseDecimal(match[1]);
      return value === null ? null : normalizeLoadUnitToKnPerM(value, match[2]);
    })
    .filter((value): value is number => value !== null);
}

function extractDesignLoadsFromStructured(entries: StructuredEntry[]): number[] {
  return entries
    .filter((entry) => isDesignLoadKey(entry.key) || isDesignLoadKey(entry.path))
    .map((entry) => numericValue(entry.value))
    .filter((value): value is number => value !== null);
}

function hasCharacteristicOrAmbiguousLoadSignal(text: string): boolean {
  return (
    /\bq\b\s*(?:=|:)\s*\d+(?:[.,]\d+)?/i.test(text) ||
    /\b(?:g|q)\s*[_-]?\s*k\b/i.test(text) ||
    /\bw\s*[_-]?\s*u\b/i.test(text) ||
    /\b(?:dead|live|characteristic)\s+load\b/i.test(text) ||
    /\bkarakteristisk(?:e)?\s+last(?:er)?\b/i.test(text)
  );
}

function extractQEdKnPerM(
  text: string,
  entries: StructuredEntry[],
): Ec3SteelBeamCapacityExtractionResult | { qEdKnPerM: number } {
  const candidates = uniqueNumbers([
    ...extractDesignLoadsFromStructured(entries),
    ...extractDesignLoadsFromText(text),
  ]);

  if (candidates.length === 1) {
    return { qEdKnPerM: candidates[0] };
  }
  if (candidates.length > 1 || hasCharacteristicOrAmbiguousLoadSignal(text)) {
    return extractionGuard("ambiguous_or_characteristic_load", ["qEdKnPerM"]);
  }
  return extractionGuard("missing_design_load", ["qEdKnPerM"]);
}

function isSpanKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return (
    normalized === "spanm" ||
    normalized === "spennviddem" ||
    normalized === "lm" ||
    normalized === "spanmm" ||
    normalized === "spennviddemm" ||
    normalized === "lmm"
  );
}

function normalizeSpanUnitToM(value: number, unit: string): number | null {
  const normalized = unit.toLowerCase();
  if (["m", "meter", "meters", "metre", "metres"].includes(normalized)) {
    return value;
  }
  if (normalized === "mm") return value / 1000;
  return null;
}

function extractSpansFromText(text: string): number[] {
  const numberPattern = String.raw`(\d+(?:[.,]\d+)?)`;
  const signalPattern = String.raw`(?:\bL\b|\bspan\b|\bspennvidde\b)`;
  const unitPattern = String.raw`(m|meter|meters|metre|metres|mm)`;
  const pattern = new RegExp(
    `${signalPattern}\\s*(?:=|:|er|is)?\\s*${numberPattern}\\s*${unitPattern}\\b`,
    "gi",
  );
  return [...text.matchAll(pattern)]
    .map((match) => {
      const value = parseDecimal(match[1]);
      return value === null ? null : normalizeSpanUnitToM(value, match[2]);
    })
    .filter((value): value is number => value !== null);
}

function extractSpansFromStructured(entries: StructuredEntry[]): number[] {
  return entries
    .filter((entry) => isSpanKey(entry.key) || isSpanKey(entry.path))
    .map((entry) => {
      const value = numericValue(entry.value);
      if (value === null) return null;
      const normalized = normalizeKey(entry.key);
      return normalized.endsWith("mm") ? value / 1000 : value;
    })
    .filter((value): value is number => value !== null);
}

function extractSpanM(
  text: string,
  entries: StructuredEntry[],
): Ec3SteelBeamCapacityExtractionResult | { spanM: number } {
  const candidates = uniqueNumbers([
    ...extractSpansFromStructured(entries),
    ...extractSpansFromText(text),
  ]);
  if (candidates.length === 1) {
    return { spanM: candidates[0] };
  }
  return extractionGuard("missing_span", ["spanM"]);
}

export function extractEc3SteelBeamCapacityInput(
  input: Ec3SteelBeamCapacityExtractionInput,
): Ec3SteelBeamCapacityExtractionResult {
  if (!isSupportedEc3StandardFamily(input.standardFamily)) {
    return extractionGuard("unsupported_standard", ["standardFamily"]);
  }

  const factorSet = resolveFactorSet(input.standardFamily);
  if (!finitePositive(factorSet?.gammaM0)) {
    return extractionGuard("missing_factor_set", ["gammaM0"]);
  }

  const { text, entries } = sourceTextForExtraction(input);

  const profile = extractProfileName(text);
  if ("computable" in profile) return profile;

  const grade = extractGrade(text);
  if ("computable" in grade) return grade;

  const qEd = extractQEdKnPerM(text, entries);
  if ("computable" in qEd) return qEd;

  const span = extractSpanM(text, entries);
  if ("computable" in span) return span;

  return {
    computable: true,
    profileName: profile.profileName,
    grade: grade.grade,
    qEdKnPerM: qEd.qEdKnPerM,
    spanM: span.spanM,
    screeningInput: {
      qEdKnPerM: qEd.qEdKnPerM,
      spanM: span.spanM,
      profileName: profile.profileName,
      grade: grade.grade,
      standardFamily: input.standardFamily,
    },
  };
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
