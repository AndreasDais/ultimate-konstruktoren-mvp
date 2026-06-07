// Share-link helpers shared by the report and pipeline-review pages.
//
// Pure string utilities only — safe to import into client components. The
// signed share token itself is minted server-side (see lib/pipeline-share-token
// and app/api/runs/[id]/share); this module only carries an already-issued
// token across internal navigation so that report ↔ pipeline ↔ sheet links keep
// the shared-access context. Never log the token; it is a bearer credential.

export const SHARE_PARAM = "share" as const;

/**
 * Append `?share=<token>` (or `&share=<token>` when the URL already has a query)
 * to an internal URL. Returns the URL unchanged when there is no token, so a
 * naked /rapport/<id> stays naked (sanitized public snapshot). The token is
 * URL-encoded.
 */
export function appendShareToken(url: string, token: string | null | undefined): string {
  if (!token) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${SHARE_PARAM}=${encodeURIComponent(token)}`;
}
