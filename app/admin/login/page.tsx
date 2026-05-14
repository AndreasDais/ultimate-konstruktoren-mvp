"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { Locale } from "@/lib/locale";
import { useLocale } from "@/lib/locale-context";


const ADMIN_LOGIN_LABELS: Record<string, Record<Locale, string>> = {
  errorNotAdmin: { nb: "Innlogging vellykket, men brukeren har ikke admin-tilgang. Du er logget ut.", nn: "Innlogging vellukka, men brukaren har ikkje admin-tilgang. Du er logga ut." },
  errorLookupFailed: { nb: "Klarte ikke verifisere admin-tilgang. Prøv igjen.", nn: "Klarte ikkje verifisere admin-tilgang. Prøv igjen." },
  adminInnlogging: { nb: "Admin-innlogging", nn: "Admin-innlogging" },
  loggInn: { nb: "Logg inn", nn: "Logg inn" },
  epost: { nb: "E-post", nn: "E-post" },
  passord: { nb: "Passord", nn: "Passord" },
  loggarInn: { nb: "Logger inn...", nn: "Loggar inn..." },
};

function LoginForm() {
  const { locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo =
    searchParams.get("redirectTo") ?? "/admin/error-reports";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam === "not_admin"
      ? ADMIN_LOGIN_LABELS.errorNotAdmin[locale]
      : errorParam === "lookup_failed"
      ? ADMIN_LOGIN_LABELS.errorLookupFailed[locale]
      : null
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="uk-shell">
      <main>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div className="uk-card" style={{ width: "100%", maxWidth: 400 }}>
            <div className="uk-card__hd">
              <div>
                <div className="uk-eyebrow" style={{ marginBottom: 4 }}>
                  {ADMIN_LOGIN_LABELS.adminInnlogging[locale]}
                </div>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  {ADMIN_LOGIN_LABELS.loggInn[locale]}
                </h1>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div
                className="uk-card__bd"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {error && (
                  <div className="uk-stripe uk-stripe--bad">{error}</div>
                )}

                <div>
                  <label htmlFor="email" className="uk-label">
                    {ADMIN_LOGIN_LABELS.epost[locale]}
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="uk-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="password" className="uk-label">
                    {ADMIN_LOGIN_LABELS.passord[locale]}
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="uk-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="uk-btn uk-btn--primary"
                >
                  {loading ? ADMIN_LOGIN_LABELS.loggarInn[locale] : ADMIN_LOGIN_LABELS.loggInn[locale]}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginForm />
    </Suspense>
  );
}