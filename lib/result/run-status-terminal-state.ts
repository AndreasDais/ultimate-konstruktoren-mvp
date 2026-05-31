export const RUN_COMPLETION_REQUIRED_CURRENT_STATUS = "running" as const;

export const TERMINAL_RUN_STATUSES = [
  "completed",
  "failed",
  "blocked",
  "cancelled",
  "canceled",
] as const;

export type TerminalRunStatus = (typeof TERMINAL_RUN_STATUSES)[number];

function normalizedStatus(status: unknown): string | null {
  return typeof status === "string" && status.trim().length > 0
    ? status.trim().toLowerCase()
    : null;
}

export function isTerminalRunStatus(
  status: unknown,
): status is TerminalRunStatus {
  const normalized = normalizedStatus(status);
  return (
    normalized !== null &&
    (TERMINAL_RUN_STATUSES as readonly string[]).includes(normalized)
  );
}

export function canMarkRunCompleted(currentStatus: unknown): boolean {
  return normalizedStatus(currentStatus) === RUN_COMPLETION_REQUIRED_CURRENT_STATUS;
}
