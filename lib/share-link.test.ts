import { describe, it, expect } from "vitest";
import { appendShareToken, SHARE_PARAM } from "./share-link";

describe("appendShareToken", () => {
  it("appends ?share=<token> to a URL with no query", () => {
    expect(appendShareToken("/rapport/run-1/pipeline", "tok123")).toBe(
      "/rapport/run-1/pipeline?share=tok123",
    );
  });

  it("appends &share=<token> when the URL already has a query", () => {
    expect(appendShareToken("/rapport/run-1/beregning?locale=nb", "tok123")).toBe(
      "/rapport/run-1/beregning?locale=nb&share=tok123",
    );
  });

  it("preserves absolute URLs (origin kept)", () => {
    expect(appendShareToken("https://app.example/rapport/run-1", "tok")).toBe(
      "https://app.example/rapport/run-1?share=tok",
    );
  });

  it("returns the URL unchanged when there is no token (naked stays naked)", () => {
    expect(appendShareToken("/rapport/run-1", null)).toBe("/rapport/run-1");
    expect(appendShareToken("/rapport/run-1", undefined)).toBe("/rapport/run-1");
    expect(appendShareToken("/rapport/run-1", "")).toBe("/rapport/run-1");
  });

  it("URL-encodes token characters (no raw injection into the query string)", () => {
    expect(appendShareToken("/x", "a b/c+d=e&f")).toBe(
      "/x?share=a%20b%2Fc%2Bd%3De%26f",
    );
  });

  it("uses the canonical share param name", () => {
    expect(SHARE_PARAM).toBe("share");
    expect(appendShareToken("/x", "t")).toContain(`${SHARE_PARAM}=`);
  });
});
