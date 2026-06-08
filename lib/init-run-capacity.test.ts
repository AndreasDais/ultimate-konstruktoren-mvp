import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isActiveCalculationCapReached,
  maxActiveCalculationsFromEnv,
} from "@/app/api/init-run/route";

function readSource(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("init-run launch capacity guard", () => {
  it("uses MAX_ACTIVE_CALCULATIONS with default 10", () => {
    expect(maxActiveCalculationsFromEnv(undefined)).toBe(10);
    expect(maxActiveCalculationsFromEnv("")).toBe(10);
    expect(maxActiveCalculationsFromEnv("0")).toBe(10);
    expect(maxActiveCalculationsFromEnv("12")).toBe(12);
    expect(maxActiveCalculationsFromEnv("12.8")).toBe(12);
  });

  it("allows runs under cap and blocks at cap", () => {
    expect(isActiveCalculationCapReached(9, 10)).toBe(false);
    expect(isActiveCalculationCapReached(10, 10)).toBe(true);
    expect(isActiveCalculationCapReached(11, 10)).toBe(true);
  });

  it("checks active running calculations before inserting a new run", () => {
    const source = readSource("app/api/init-run/route.ts");
    const middleware = readSource("middleware.ts");

    expect(middleware).toContain("checkGlobalDailyCap");
    expect(middleware.indexOf("checkGlobalDailyCap")).toBeLessThan(
      middleware.indexOf("checkRateLimit(request)"),
    );
    expect(source).not.toContain("checkGlobalDailyCap");
    expect(source).toContain("MAX_ACTIVE_CALCULATIONS");
    expect(source).toContain("PILAR is busy. Try again in a few minutes.");
    expect(source).toContain('.select("id", { count: "exact", head: true })');
    expect(source).toContain('.eq("run_status", "running")');
    expect(source.indexOf("const activeCapacityResponse")).toBeLessThan(
      source.indexOf(".insert(insertPayload)"),
    );
    expect(source).not.toMatch(/Anthropic|anthropic\.messages|streamAgent/);
  });

  it("keeps client-visible init-run errors bounded", () => {
    const source = readSource("app/api/init-run/route.ts");

    expect(source).not.toContain("err.message");
    expect(source).not.toContain("errorMessage");
    expect(source).not.toContain("Response.json({ error: err");
  });
});
