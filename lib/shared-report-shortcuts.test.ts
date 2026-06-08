import { describe, expect, it } from "vitest";
import {
  buildSharedReportShortcut,
  parseSharedReportShortcuts,
} from "./shared-report-shortcuts";

describe("shared report shortcuts", () => {
  it("builds an internal report href with the real encoded share token", () => {
    const row = buildSharedReportShortcut({
      runId: "run-1",
      shareToken: "token with/slashes",
      title: "Beam report",
      date: "2026-06-08T00:00:00.000Z",
      documentId: "PILAR-RUN1",
      savedAt: "2026-06-08T01:00:00.000Z",
    });

    expect(row).toEqual({
      runId: "run-1",
      title: "Beam report",
      date: "2026-06-08T00:00:00.000Z",
      documentId: "PILAR-RUN1",
      href: "/rapport/run-1?share=token%20with%2Fslashes",
      savedAt: "2026-06-08T01:00:00.000Z",
    });
  });

  it("rejects empty run ids or empty tokens", () => {
    expect(buildSharedReportShortcut({ runId: "", shareToken: "tok", title: "x" })).toBeNull();
    expect(buildSharedReportShortcut({ runId: "run-1", shareToken: "", title: "x" })).toBeNull();
  });

  it("parses only real tokenized report shortcuts", () => {
    const raw = JSON.stringify([
      {
        runId: "run-1",
        title: "Valid",
        date: null,
        documentId: null,
        href: "/rapport/run-1?share=tok",
        savedAt: "2026-06-08T01:00:00.000Z",
      },
      {
        runId: "run-2",
        title: "Naked",
        date: null,
        documentId: null,
        href: "/rapport/run-2",
        savedAt: "2026-06-08T01:00:00.000Z",
      },
      {
        runId: "run-3",
        title: "Fake",
        date: null,
        documentId: null,
        href: "/rapport/run-3?share=secure-link",
        savedAt: "2026-06-08T01:00:00.000Z",
      },
    ]);

    expect(parseSharedReportShortcuts(raw)).toEqual([
      {
        runId: "run-1",
        title: "Valid",
        date: null,
        documentId: null,
        href: "/rapport/run-1?share=tok",
        savedAt: "2026-06-08T01:00:00.000Z",
      },
    ]);
  });
});
