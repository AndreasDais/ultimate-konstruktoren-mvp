"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

import type { HeaderUiMode } from "./Header";
import {
  EN_FOOTER_LINKS,
  NO_FOOTER_LINKS,
  FOOTER_NOTE,
} from "./public-footer-links";
import { FROM_PARAM, originFor, sanitizeFrom, withFrom } from "./from-nav";
import FooterIssueFeedback from "./FooterIssueFeedback";

/**
 * Global public footer, analogous to ConditionalAppHeader. Rendered once in the
 * root layout, it appears on every user-facing route EXCEPT the admin console.
 * API routes never reach the layout. Locale: English on the fixed-English
 * routes, Norwegian on /heim and /vilkar, otherwise follows the pilar-ui-mode
 * cookie (uiMode).
 */
const EN_FORCE_ROUTES = new Set([
  "/home",
  "/international",
  "/privacy",
  "/about",
  "/roadmap",
  "/guide",
  "/safety",
  "/contact",
  "/terms",
]);
const NO_FORCE_ROUTES = new Set(["/heim", "/vilkar"]);

function isFooterless(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

export default function ConditionalAppFooter({
  uiMode,
}: {
  uiMode: HeaderUiMode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (isFooterless(pathname)) return null;

  // Carry the originating page so "Back to Pilar" can return there. Preserve an
  // inbound from on info pages; use the current page as origin otherwise.
  const origin = pathname.startsWith("/rapport")
    ? null
    : originFor(pathname, sanitizeFrom(searchParams.get(FROM_PARAM)));

  const variant: "en" | "no" = EN_FORCE_ROUTES.has(pathname)
    ? "en"
    : NO_FORCE_ROUTES.has(pathname)
      ? "no"
      : uiMode === "intl"
        ? "en"
        : "no";

  const links = variant === "en" ? EN_FOOTER_LINKS : NO_FOOTER_LINKS;

  return (
    <footer
      className="border-t print:hidden"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="uk-public-footer mx-auto max-w-2xl px-4 py-8 flex flex-col gap-4">
        <div className="uk-public-footer__top">
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
            {links.map((link) => (
              <Link
                key={link.href}
                href={withFrom(link.href, origin)}
                className="uk-footer-link text-sm hover:underline"
                style={{ color: "var(--fg-muted)" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <FooterIssueFeedback variant={variant} />
        </div>
        <p className="text-xs" style={{ color: "var(--fg-faint)" }}>
          {FOOTER_NOTE[variant]}
        </p>
      </div>
    </footer>
  );
}
