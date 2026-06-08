import type { NextRequest } from "next/server";
import { appendShareToken } from "@/lib/share-link";

export type ExportShareToken = {
  source: "query" | "owner_minted" | "none";
  token: string;
};

export async function resolveExportShareToken(options: {
  request: NextRequest;
  runId: string;
  cookieHeader: string;
}): Promise<ExportShareToken> {
  const explicitToken = options.request.nextUrl.searchParams.get("share") ?? "";
  if (explicitToken) return { source: "query", token: explicitToken };
  if (!options.cookieHeader) return { source: "none", token: "" };

  try {
    const response = await fetch(
      `${options.request.nextUrl.origin}/api/runs/${options.runId}/share`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Cookie: options.cookieHeader,
        },
      },
    );
    if (!response.ok) return { source: "none", token: "" };
    const data = (await response.json()) as { token?: unknown };
    return typeof data.token === "string" && data.token
      ? { source: "owner_minted", token: data.token }
      : { source: "none", token: "" };
  } catch {
    return { source: "none", token: "" };
  }
}

export function reportUrlForExport(origin: string, runId: string, shareToken: string): string {
  return appendShareToken(`${origin}/rapport/${runId}`, shareToken);
}
