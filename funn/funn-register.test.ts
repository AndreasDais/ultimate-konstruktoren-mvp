import { describe, it, expect } from "vitest";
import {
  FINDINGS,
  findingById,
  validateFunnRegister,
  type Finding,
} from "@/funn/funn-register";
import { DETECTOR_NAMES } from "@/funn/detectors";

describe("funn-register", () => {
  it("er strukturelt gyldig og i takt med detectors.ts", () => {
    expect(() => validateFunnRegister(FINDINGS, DETECTOR_NAMES)).not.toThrow();
  });

  it("har unike funn-id-ar", () => {
    const ids = FINDINGS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("kvart funn med ein detektor peikar paa eit realisert detektor-namn", () => {
    for (const f of FINDINGS) {
      if (f.detector !== null) {
        expect(DETECTOR_NAMES).toContain(f.detector);
      }
    }
  });

  it("dei fire realiserte detektorane er kopla til funn", () => {
    const kopla = FINDINGS.filter((f) => f.detector !== null).map(
      (f) => f.detector,
    );
    expect(kopla.sort()).toEqual(["detectF1", "detectF10", "detectF16", "detectF9"]);
  });

  it("F11 er merkt fiksa (Port 2 — FIKS 2 + 12)", () => {
    expect(findingById("F11")?.status).toBe("fiksa");
    expect(findingById("F11")?.severity).toBe("blokker");
  });

  it("avdekkjer ein detektor-referanse som ikkje finst", () => {
    const broken: Finding[] = [
      { ...FINDINGS[0], detector: "detectF999" },
    ];
    expect(() => validateFunnRegister(broken, DETECTOR_NAMES)).toThrow(
      /ukjend detektor/,
    );
  });
});
