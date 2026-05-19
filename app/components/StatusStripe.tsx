"use client";

/**
 * StatusStripe — statusvarsel-banner med farga venstrekant.
 *
 * Brukt for Kontrollør-avgjerds-kort, Sammenligner-banner, Advarsler-blokk
 * og andre tilfelle der vi treng å vise eit status-varsel med ein "stripe"-
 * indikator. Klassane (.uk-stripe, .uk-stripe--info osv.) er definert i
 * tokens.css.
 *
 * Splitta ut frå app/page.tsx i refaktor-fase 4.
 */

import type { ReactNode } from "react";
import type { Tone } from "@/lib/format";

export function StatusStripe({
  status,
  header,
  label,
  children,
  className,
}: {
  status: Tone;
  header?: ReactNode;
  label?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const variant = status === "neutral" ? "" : `uk-stripe--${status}`;
  const fullClass = ["uk-stripe", variant, className].filter(Boolean).join(" ");
  return (
    <section className={fullClass}>
      {label && <div className="uk-stripe__label">{label}</div>}
      {header}
      <div className="uk-stripe__body">{children}</div>
    </section>
  );
}