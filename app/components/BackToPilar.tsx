"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { FROM_PARAM, sanitizeFrom } from "./from-nav";

/**
 * "Back to Pilar" link. Returns the user to the validated internal `from` page
 * they arrived from, or to `fallback` when there is no valid `from` (e.g.
 * /home for English pages, /heim for Norwegian, / for the app/terms flow).
 */
export default function BackToPilar({
  fallback,
  label,
}: {
  fallback: string;
  label: string;
}) {
  const from = sanitizeFrom(useSearchParams().get(FROM_PARAM));
  return (
    <Link
      href={from ?? fallback}
      className="text-sm hover:underline"
      style={{ color: "var(--fg-muted)" }}
    >
      {label}
    </Link>
  );
}
