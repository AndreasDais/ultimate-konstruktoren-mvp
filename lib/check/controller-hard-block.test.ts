import { describe, it, expect } from "vitest";
import {
  applyControllerHardBlock,
  type ControllerDecision,
  type HardBlockCounts,
} from "@/lib/check/controller-hard-block";

// Ingen funn — ikkje noko hardt blokkeringsvilkår.
const NO_FUNN: HardBlockCounts = { naDeviations: 0, motstrid: 0, loadCombo: 0 };

const approved: ControllerDecision = {
  decision_status: "approved",
  risk_level: "low",
  controller_notes: "Both engineers samde, NA-verdiar korrekte.",
};

describe("applyControllerHardBlock", () => {
  it("clampar A2/F11: kombinasjonsavvik + approved -> uncertain", () => {
    const out = applyControllerHardBlock(approved, {
      ...NO_FUNN,
      loadCombo: 1,
    });
    expect(out.clamped).toBe(true);
    expect(out.original).toBe("approved");
    expect(out.decision.decision_status).toBe("uncertain");
    expect(out.decision.manual_review_required).toBe(true);
  });

  it("clampar approved_with_warnings", () => {
    const out = applyControllerHardBlock(
      { ...approved, decision_status: "approved_with_warnings" },
      { ...NO_FUNN, loadCombo: 1 },
    );
    expect(out.clamped).toBe(true);
    expect(out.original).toBe("approved_with_warnings");
    expect(out.decision.decision_status).toBe("uncertain");
  });

  it("clampar på NA-avvik", () => {
    const out = applyControllerHardBlock(approved, {
      ...NO_FUNN,
      naDeviations: 2,
    });
    expect(out.clamped).toBe(true);
  });

  it("clampar på Tolkar-motstrid", () => {
    const out = applyControllerHardBlock(approved, {
      ...NO_FUNN,
      motstrid: 1,
    });
    expect(out.clamped).toBe(true);
  });

  it("ingen hardblokk -> ingen clamp, same objekt-referanse", () => {
    const out = applyControllerHardBlock(approved, NO_FUNN);
    expect(out.clamped).toBe(false);
    expect(out.original).toBeNull();
    expect(out.decision).toBe(approved);
  });

  it("hardblokk men allereie uncertain -> ingen clamp", () => {
    const uncertain: ControllerDecision = { decision_status: "uncertain" };
    const out = applyControllerHardBlock(uncertain, { ...NO_FUNN, loadCombo: 1 });
    expect(out.clamped).toBe(false);
    expect(out.decision).toBe(uncertain);
  });

  it("hardblokk men rejected -> ingen clamp", () => {
    const rejected: ControllerDecision = { decision_status: "rejected" };
    const out = applyControllerHardBlock(rejected, { ...NO_FUNN, loadCombo: 1 });
    expect(out.clamped).toBe(false);
    expect(out.decision).toBe(rejected);
  });

  it("risk_level: low -> medium, men high blir verande", () => {
    const low = applyControllerHardBlock(
      { ...approved, risk_level: "low" },
      { ...NO_FUNN, loadCombo: 1 },
    );
    expect(low.decision.risk_level).toBe("medium");

    const high = applyControllerHardBlock(
      { ...approved, risk_level: "high" },
      { ...NO_FUNN, loadCombo: 1 },
    );
    expect(high.decision.risk_level).toBe("high");
  });

  it("muterer ikkje input-objektet (rein funksjon)", () => {
    const input: ControllerDecision = {
      decision_status: "approved",
      risk_level: "low",
      controller_notes: "original",
    };
    applyControllerHardBlock(input, { ...NO_FUNN, loadCombo: 1 });
    expect(input.decision_status).toBe("approved");
    expect(input.risk_level).toBe("low");
    expect(input.controller_notes).toBe("original");
  });

  it("controller_notes inneheld tellinga og opphavleg grunngiving", () => {
    const out = applyControllerHardBlock(approved, {
      naDeviations: 2,
      motstrid: 1,
      loadCombo: 3,
    });
    const notes = String(out.decision.controller_notes);
    expect(notes).toContain("[KODE-OVERSTYRING]");
    expect(notes).toContain("2 NA-avvik");
    expect(notes).toContain("1 motstrid");
    expect(notes).toContain("3 kombinasjonsstruktur-avvik");
    expect(notes).toContain("Both engineers samde");
  });

  it("controller_notes taklar manglande opphavleg grunngiving", () => {
    const out = applyControllerHardBlock(
      { decision_status: "approved" },
      { ...NO_FUNN, loadCombo: 1 },
    );
    expect(String(out.decision.controller_notes)).toContain("(ingen)");
  });

  it("ukjende felt passerer uendra gjennom clampen", () => {
    const out = applyControllerHardBlock(
      { ...approved, reason: "x", user_message: "y", blocked_outputs: ["z"] },
      { ...NO_FUNN, loadCombo: 1 },
    );
    expect(out.decision.reason).toBe("x");
    expect(out.decision.user_message).toBe("y");
    expect(out.decision.blocked_outputs).toEqual(["z"]);
  });
});