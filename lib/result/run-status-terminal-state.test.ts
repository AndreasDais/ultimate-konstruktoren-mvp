import { describe, expect, it } from "vitest";

import {
  RUN_COMPLETION_REQUIRED_CURRENT_STATUS,
  TERMINAL_RUN_STATUSES,
  canMarkRunCompleted,
  isTerminalRunStatus,
} from "./run-status-terminal-state";

describe("run status terminal-state invariant", () => {
  it("allows completion writes only while the run is still running", () => {
    expect(RUN_COMPLETION_REQUIRED_CURRENT_STATUS).toBe("running");
    expect(canMarkRunCompleted("running")).toBe(true);

    for (const status of TERMINAL_RUN_STATUSES) {
      expect(canMarkRunCompleted(status)).toBe(false);
    }
  });

  it("treats completed, failed, blocked, and cancelled statuses as terminal", () => {
    for (const status of TERMINAL_RUN_STATUSES) {
      expect(isTerminalRunStatus(status)).toBe(true);
    }

    expect(isTerminalRunStatus("running")).toBe(false);
    expect(isTerminalRunStatus("queued")).toBe(false);
    expect(isTerminalRunStatus(null)).toBe(false);
  });
});
