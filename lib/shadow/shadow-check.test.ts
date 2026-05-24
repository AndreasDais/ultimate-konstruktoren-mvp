import { describe, it, expect } from "vitest";
import {
  vurderShadowKandidat,
  type ShadowDeviation,
} from "@/lib/shadow/shadow-check";

const avvik: ShadowDeviation = { got: 23.78, expected: 22.88, agent: "A" };

describe("vurderShadowKandidat", () => {
  it("er FARLEG-FEIL-kandidat: avvik funne OG verdikt approved", () => {
    const v = vurderShadowKandidat([avvik], "approved");
    expect(v.deviationFound).toBe(true);
    expect(v.erFarlegFeilKandidat).toBe(true);
    expect(v.representativtAvvik).toEqual(avvik);
  });

  it("er kandidat òg ved approved_with_warnings", () => {
    expect(
      vurderShadowKandidat([avvik], "approved_with_warnings")
        .erFarlegFeilKandidat,
    ).toBe(true);
  });

  it("er IKKJE kandidat når verdiktet alt er uncertain (clampen verka)", () => {
    const v = vurderShadowKandidat([avvik], "uncertain");
    expect(v.deviationFound).toBe(true);
    expect(v.erFarlegFeilKandidat).toBe(false);
  });

  it("er IKKJE kandidat ved rejected", () => {
    expect(
      vurderShadowKandidat([avvik], "rejected").erFarlegFeilKandidat,
    ).toBe(false);
  });

  it("er IKKJE kandidat utan avvik, sjølv om verdikt er approved", () => {
    const v = vurderShadowKandidat([], "approved");
    expect(v.deviationFound).toBe(false);
    expect(v.erFarlegFeilKandidat).toBe(false);
    expect(v.representativtAvvik).toBeNull();
  });

  it("er IKKJE kandidat når verdikt er null", () => {
    expect(
      vurderShadowKandidat([avvik], null).erFarlegFeilKandidat,
    ).toBe(false);
  });

  it("plukkar fyrste avvik som representativt", () => {
    const a2: ShadowDeviation = { got: 25, expected: 24, agent: "B" };
    const v = vurderShadowKandidat([avvik, a2], "approved");
    expect(v.representativtAvvik).toEqual(avvik);
  });
});
