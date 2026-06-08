export const SHARED_REPORT_SHORTCUTS_KEY = "pilar-shared-report-shortcuts-v1";

export type SharedReportShortcut = {
  runId: string;
  title: string;
  date: string | null;
  documentId: string | null;
  href: string;
  savedAt: string;
};

type SharedReportShortcutInput = {
  runId: string;
  shareToken: string;
  title: string | null | undefined;
  date?: string | null;
  documentId?: string | null;
  savedAt?: string;
};

const MAX_SHARED_SHORTCUTS = 30;

function boundedText(value: unknown, fallback: string, max = 140): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return fallback;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function isPlainShortcut(value: unknown): value is SharedReportShortcut {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.runId === "string" &&
    typeof row.title === "string" &&
    (typeof row.date === "string" || row.date === null) &&
    (typeof row.documentId === "string" || row.documentId === null) &&
    typeof row.href === "string" &&
    typeof row.savedAt === "string" &&
    row.href.startsWith(`/rapport/${row.runId}`) &&
    /[?&]share=/.test(row.href) &&
    !/[?&]share=secure-link(?:&|$)/.test(row.href)
  );
}

export function buildSharedReportShortcut(input: SharedReportShortcutInput): SharedReportShortcut | null {
  const runId = input.runId.trim();
  const shareToken = input.shareToken.trim();
  if (!runId || !shareToken) return null;

  const href = `/rapport/${encodeURIComponent(runId)}?share=${encodeURIComponent(shareToken)}`;
  return {
    runId,
    title: boundedText(input.title, input.documentId ?? "Shared report"),
    date: input.date ?? null,
    documentId: input.documentId ? boundedText(input.documentId, "", 64) : null,
    href,
    savedAt: input.savedAt ?? new Date().toISOString(),
  };
}

export function parseSharedReportShortcuts(raw: string | null): SharedReportShortcut[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPlainShortcut).slice(0, MAX_SHARED_SHORTCUTS);
  } catch {
    return [];
  }
}

export function loadSharedReportShortcuts(): SharedReportShortcut[] {
  if (typeof window === "undefined") return [];
  return parseSharedReportShortcuts(window.localStorage.getItem(SHARED_REPORT_SHORTCUTS_KEY));
}

export function rememberSharedReportShortcut(input: SharedReportShortcutInput): void {
  if (typeof window === "undefined") return;
  const next = buildSharedReportShortcut(input);
  if (!next) return;

  const existing = loadSharedReportShortcuts();
  const rows = [
    next,
    ...existing.filter((row) => row.runId !== next.runId),
  ].slice(0, MAX_SHARED_SHORTCUTS);
  window.localStorage.setItem(SHARED_REPORT_SHORTCUTS_KEY, JSON.stringify(rows));
}
