import { describe, it, expect } from "vitest";
import {
  isRealIssue,
  normalizeConsistencyIssues,
} from "@/lib/compare/consistency-issues";

describe("isRealIssue", () => {
  it("godtek ei reell inkonsistens", () => {
    expect(
      isRealIssue({ issue: "short_conclusion 25,0 stemmer ikkje med results 22,9" }),
    ).toBe(true);
  });

  it("avviser placeholder: 'ingen inkonsistensar funne'", () => {
    expect(isRealIssue({ issue: "Ingen inkonsistensar funne." })).toBe(false);
  });

  it("avviser placeholder: bokmål 'Ingen inkonsistenser funnet'", () => {
    expect(isRealIssue({ issue: "Ingen inkonsistenser funnet" })).toBe(false);
  });

  it("avviser placeholder: 'ingen avvik'", () => {
    expect(isRealIssue({ issue: "Ingen avvik mellom stega." })).toBe(false);
  });

  it("avviser tomt issue-felt", () => {
    expect(isRealIssue({ issue: "" })).toBe(false);
    expect(isRealIssue({ issue: "   " })).toBe(false);
  });

  it("avviser oppføring utan issue-felt eller feil type", () => {
    expect(isRealIssue({})).toBe(false);
    expect(isRealIssue(null)).toBe(false);
    expect(isRealIssue("ingen")).toBe(false);
  });

  it("godtek reell inkonsistens sjølv om ordet 'ingen' finst i annan kontekst", () => {
    // "ingen einingar oppgitt" er ein reell mangel, ikkje ein 'ingen funne'-placeholder
    expect(isRealIssue({ issue: "Steg 3 har ingen einingar oppgitt" })).toBe(true);
  });
});

describe("normalizeConsistencyIssues", () => {
  it("F3: éin placeholder per liste -> begge listene tomme (0, ikkje 2)", () => {
    const raw = {
      agent_a: [{ issue: "Ingen inkonsistensar funne", severity: "low" }],
      agent_b: [{ issue: "Ingen inkonsistensar funne", severity: "low" }],
    };
    const out = normalizeConsistencyIssues(raw);
    expect(out.agent_a).toHaveLength(0);
    expect(out.agent_b).toHaveLength(0);
  });

  it("behaldar reelle inkonsistensar", () => {
    const raw = {
      agent_a: [{ issue: "M_Ed i steg 4 matchar ikkje results", severity: "high" }],
      agent_b: [],
    };
    const out = normalizeConsistencyIssues(raw);
    expect(out.agent_a).toHaveLength(1);
    expect(out.agent_b).toHaveLength(0);
  });

  it("blandar: dropper placeholder, behaldar reell", () => {
    const raw = {
      agent_a: [
        { issue: "Ingen inkonsistensar funne", severity: "low" },
        { issue: "Avrunding sprikar mellom steg 2 og 5", severity: "medium" },
      ],
      agent_b: [],
    };
    expect(normalizeConsistencyIssues(raw).agent_a).toHaveLength(1);
  });

  it("degraderer trygt på manglande/feilforma input", () => {
    expect(normalizeConsistencyIssues(null)).toEqual({ agent_a: [], agent_b: [] });
    expect(normalizeConsistencyIssues({})).toEqual({ agent_a: [], agent_b: [] });
    expect(normalizeConsistencyIssues({ agent_a: "tull" })).toEqual({
      agent_a: [],
      agent_b: [],
    });
  });
});