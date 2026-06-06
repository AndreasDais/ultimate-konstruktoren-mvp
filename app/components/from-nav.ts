// Safe internal "back to where you came from" navigation for the public/footer
// info pages. The originating page is carried in a `from` query param and
// validated before use, so "Back to Pilar" can only ever return to an internal
// path (never an external/unsafe URL).

export const FROM_PARAM = "from";

// Footer/info pages that should PRESERVE an inbound `from` rather than overwrite
// it — so navigating between info pages keeps pointing back at the original
// source page instead of looping through each other.
export const INFO_ROUTES = new Set<string>([
  "/about",
  "/guide",
  "/safety",
  "/roadmap",
  "/privacy",
  "/contact",
  "/terms",
  "/vilkar",
]);

/**
 * Validate a `from` value as a safe internal path. Rejects external URLs,
 * protocol-relative ("//host"), admin paths, and anything with unexpected
 * characters. Returns the clean path, or null when unsafe/absent.
 */
export function sanitizeFrom(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value: string;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (value.startsWith("//")) return null;
  if (!/^\/[A-Za-z0-9\-/_]*$/.test(value)) return null;
  if (value === "/admin" || value.startsWith("/admin/")) return null;
  return value;
}

/** Append ?from=<path> to an internal href when `from` is a valid path. */
export function withFrom(href: string, from: string | null): string {
  return from ? `${href}?${FROM_PARAM}=${encodeURIComponent(from)}` : href;
}

/**
 * The origin path to attach to footer/nav links rendered on `pathname`:
 * preserve an inbound `from` on info pages; otherwise treat the current
 * (source) page as the origin.
 */
export function originFor(
  pathname: string,
  inboundFrom: string | null,
): string | null {
  if (inboundFrom) return inboundFrom;
  return INFO_ROUTES.has(pathname) ? null : pathname;
}
