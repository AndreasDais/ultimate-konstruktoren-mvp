import type { ReactNode } from "react";
import Link from "next/link";

export function PublicSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold" style={{ color: "var(--fg)" }}>
        {title}
      </h2>
      <div
        className="text-sm leading-relaxed space-y-3"
        style={{ color: "var(--fg-2)" }}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Shared shell for the static public-launch pages (English canonical).
 * Renders a titled article. The shared public footer (links + standing review
 * requirement) is rendered globally by ConditionalAppFooter in the layout.
 */
export function PublicShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex-1 px-4 py-8 md:py-12">
      <article className="mx-auto max-w-2xl">
        <header className="mb-8">
          <p
            className="text-xs uppercase tracking-wider mb-1"
            style={{ color: "var(--fg-muted)" }}
          >
            Pilar v0.1
          </p>
          <h1 className="text-3xl font-semibold" style={{ color: "var(--fg)" }}>
            {title}
          </h1>
        </header>
        {intro ? (
          <p
            className="text-base leading-relaxed mb-6"
            style={{ color: "var(--fg-2)" }}
          >
            {intro}
          </p>
        ) : null}
        <div className="space-y-6">{children}</div>
        <div
          className="mt-12 pt-6 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <Link
            href="/home"
            className="text-sm hover:underline"
            style={{ color: "var(--fg-muted)" }}
          >
            ← Back to Pilar
          </Link>
        </div>
      </article>
    </main>
  );
}
