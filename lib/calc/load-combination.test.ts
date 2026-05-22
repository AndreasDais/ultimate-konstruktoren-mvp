import { describe, it, expect } from "vitest";
import { computeStrCombination } from "@/lib/calc/load-combination";

describe("computeStrCombination — STR-lastkombinasjon EC0/NA", () => {
  it("A1: éin permanent + éin variabel last — 6.10b styrer (Rev. C = 9,3)", () => {
    const r = computeStrCombination({
      permanent: [{ name: "g", value: 4.0 }],
      variable: [{ name: "q", value: 3.0, category: "imposed_A_D" }],
    });
    const a = r.terms.find((t) => t.equation === "6.10a")!;
    const b = r.terms.find((t) => t.equation === "6.10b")!;
    expect(a.value).toBeCloseTo(8.55, 4); // 1,35·4 + 1,5·0,7·3
    expect(b.value).toBeCloseTo(9.3, 4); // 1,20·4 + 1,5·3
    expect(r.governing.equation).toBe("6.10b");
    expect(r.designValue).toBeCloseTo(9.3, 4);
  });

  it("A2: to variable laster — 6.10b med q leiande styrer (Rev. C = 22,9)", () => {
    const r = computeStrCombination({
      permanent: [{ name: "g", value: 6.0 }],
      variable: [
        { name: "q", value: 8.0, category: "imposed_A_D" },
        { name: "s", value: 3.5, category: "snow" },
      ],
    });
    const a = r.terms.find((t) => t.equation === "6.10a")!;
    expect(a.value).toBeCloseTo(20.175, 3); // 1,35·6 + 1,5·0,7·8 + 1,5·0,7·3,5
    const b610 = r.terms.filter((t) => t.equation === "6.10b");
    expect(b610).toHaveLength(2);
    expect(b610.find((t) => t.leadingLoad === "q")!.value).toBeCloseTo(22.875, 3);
    expect(b610.find((t) => t.leadingLoad === "s")!.value).toBeCloseTo(20.85, 3);
    expect(r.governing.equation).toBe("6.10b");
    expect(r.governing.leadingLoad).toBe("q");
    expect(r.designValue).toBeCloseTo(22.875, 3);
  });

  it("A2-kontrast: ekv. 6.10-feilen (23,775) er IKKJE det modulen gjev", () => {
    // Pilar sin A2-feil var 1,35·6 + 1,5·8 + 1,5·0,7·3,5 = 23,775, kalla «6.10a».
    // Modulen gjev korrekt 22,875 — avviket er det FIKS 2 fangar.
    const r = computeStrCombination({
      permanent: [{ value: 6.0 }],
      variable: [
        { value: 8.0, category: "imposed_A_D" },
        { value: 3.5, category: "snow" },
      ],
    });
    expect(r.designValue).toBeCloseTo(22.875, 3);
    expect(Math.abs(r.designValue - 23.775)).toBeGreaterThan(0.5);
  });

  it("berre permanente laster: 6.10a styrer (1,35 > 1,20)", () => {
    const r = computeStrCombination({ permanent: [{ value: 10.0 }], variable: [] });
    expect(r.governing.equation).toBe("6.10a");
    expect(r.designValue).toBeCloseTo(13.5, 4);
  });

  it("fleire permanente laster blir summerte", () => {
    const r = computeStrCombination({
      permanent: [{ value: 4.0 }, { value: 2.0 }],
      variable: [{ value: 3.0, category: "imposed_A_D" }],
    });
    expect(r.designValue).toBeCloseTo(11.7, 4); // SG=6 → 6.10b = 1,20·6 + 1,5·3
  });

  it("vind-kategori brukar psi0 = 0,6", () => {
    const r = computeStrCombination({
      permanent: [{ value: 0 }],
      variable: [
        { name: "hovud", value: 10, category: "imposed_A_D" },
        { name: "vind", value: 5, category: "wind" },
      ],
    });
    const a = r.terms.find((t) => t.equation === "6.10a")!;
    expect(a.value).toBeCloseTo(15.0, 4); // 1,5·0,7·10 + 1,5·0,6·5
  });

  it("imposed_E (lager) brukar psi0 = 1,0", () => {
    const r = computeStrCombination({
      permanent: [{ value: 0 }],
      variable: [{ value: 10, category: "imposed_E" }],
    });
    const a = r.terms.find((t) => t.equation === "6.10a")!;
    expect(a.value).toBeCloseTo(15.0, 4); // 1,5·1,0·10
  });

  it("kastar ved negativ lastverdi", () => {
    expect(() =>
      computeStrCombination({
        permanent: [{ value: -1 }],
        variable: [{ value: 3, category: "snow" }],
      }),
    ).toThrow();
  });

  it("kastar ved ikkje-endeleg verdi", () => {
    expect(() =>
      computeStrCombination({ permanent: [{ value: NaN }], variable: [] }),
    ).toThrow();
  });

  it("kastar ved ukjend lastkategori", () => {
    expect(() =>
      computeStrCombination({
        permanent: [{ value: 4 }],
        // @ts-expect-error — testar runtime-vern mot ugyldig kategori frå JSON
        variable: [{ value: 3, category: "jordskjelv" }],
      }),
    ).toThrow();
  });

  it("kastar når ingen laster er oppgitt", () => {
    expect(() => computeStrCombination({ permanent: [], variable: [] })).toThrow();
  });
});