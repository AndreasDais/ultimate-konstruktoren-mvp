import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { renderMathKey } from "./formula-extract";

function htmlFor(key: string): string {
  return renderToStaticMarkup(
    React.createElement(React.Fragment, null, renderMathKey(key)),
  );
}

function expectMathKey(
  key: string,
  expectedHead: string,
  expectedSubscript?: string,
): void {
  const html = htmlFor(key);
  if (!expectedSubscript) {
    expect(html).toBe(expectedHead);
    expect(html).not.toContain("<sub");
    return;
  }

  expect(html).toContain(`${expectedHead}<sub`);
  expect(html).toContain(`>${expectedSubscript}</sub>`);
}

describe("renderMathKey", () => {
  it("preserves exact Greek and ordinary underscore rendering", () => {
    expectMathKey("alpha", "\u03b1");
    expectMathKey("psi_0", "\u03c8", "0");
    expectMathKey("M_Ed", "M", "Ed");
    expectMathKey("Sk_snow", "Sk", "snow");
  });

  it("renders glued Greek heads with suffixes as subscripts", () => {
    expectMathKey("gammaG", "\u03b3", "G");
    expectMathKey("gammaQ", "\u03b3", "Q");
    expectMathKey("psi0_snow", "\u03c8", "0,snow");
    expectMathKey("gammaG_6.10a", "\u03b3", "G,6.10a");
    expectMathKey("phiM_n", "\u03c6", "M,n");
  });

  it("does not split normal words that merely start with a Greek prefix", () => {
    expectMathKey("pipe", "pipe");
  });
});
