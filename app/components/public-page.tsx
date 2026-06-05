import type { ReactNode } from "react";
import Link from "next/link";

// Public-launch footer navigation. Kept in one place so every public page
// exposes the same set of routes.
export const PUBLIC_FOOTER_LINKS: { href: string; label: string }[] = [
  { href: "/about", label: "About" },
  { href: "/guide", label: "Guide" },
  { href: "/safety", label: "Safety" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/contact", label: "Contact" },
];

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
 * Renders a titled article plus the public footer navigation. The standing
 * review requirement is always visible in the footer.
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
    <>
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
      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto max-w-2xl px-4 py-8 flex flex-col gap-4">
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Footer">
            {PUBLIC_FOOTER_LINKS.map((link) => (
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
            PILAR is an AI-generated assistant in pilot. Results are preliminary
            and must be reviewed by a qualified engineer before use in real
            projects.
          </p>
        </div>
      </footer>
    </>
  );
}
