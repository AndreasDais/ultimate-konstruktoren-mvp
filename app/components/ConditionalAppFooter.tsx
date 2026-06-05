"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import type { HeaderUiMode } from "./Header";
import {
  EN_FOOTER_LINKS,
  NO_FOOTER_LINKS,
  FOOTER_NOTE,
} from "./public-footer-links";

/**
 * Global public footer, analogous to ConditionalAppHeader. Rendered once in the
 * root layout, it appears on every user-facing route EXCEPT the admin console
 * and the /rapport report/calculation-sheet surfaces (which carry their own
 * branded footer and are print/export pages). API routes never reach the
 * layout. Locale: English on the fixed-English routes, Norwegian on /heim and
 * /vilkar, otherwise follows the pilar-ui-mode cookie (uiMode).
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
  return pathname.startsWith("/admin") || pathname.startsWith("/rapport");
}

export default function ConditionalAppFooter({
  uiMode,
}: {
  uiMode: HeaderUiMode;
}) {
  const pathname = usePathname();
  if (isFooterless(pathname)) return null;

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
      <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-4">
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm hover:underline"
              style={{ color: "var(--fg-muted)" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs" style={{ color: "var(--fg-faint)" }}>
          {FOOTER_NOTE[variant]}
        </p>
      </div>
    </footer>
  );
}
