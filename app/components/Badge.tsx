"use client";

/**
 * Badge — status-pille brukt på tvers av Pilar-fasane.
 *
 * Renderar ein liten farga pille basert på Tone (info/warn/error/success/neutral).
 * Klassane (.uk-badge, .uk-badge--info osv.) er definert i tokens.css.
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 4.
 */

import type { ReactNode } from "react";
import type { Tone } from "@/lib/format";

export function Badge({
  status,
  children,
}: {
  status: Tone;
  children: ReactNode;
}) {
  const variant = status === "neutral" ? "" : `uk-badge--${status}`;
  const fullClass = ["uk-badge", variant].filter(Boolean).join(" ");
  return <span className={fullClass}>{children}</span>;
}