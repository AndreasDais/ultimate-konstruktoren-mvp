"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo =
    searchParams.get("redirectTo") ?? "/admin/error-reports";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam === "not_admin"
      ? "Innlogging vellukka, men brukaren har ikkje admin-tilgang. Du er logga ut."
      : errorParam === "lookup_failed"
      ? "Klarte ikkje verifisere admin-tilgang. Prøv igjen."
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

    // router.refresh() trigger ny middleware-kjøring slik at admin-sjekken
    // skjer med den nye sessionen
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
                  Admin-innlogging
                </div>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 600,
                    margin: 0,
                  }}
                >
                  Logg inn
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
                  <div
                    style={{
                      background: "var(--bad-bg)",
                      border: "1px solid var(--bad-border)",
                      borderLeft: "3px solid var(--bad)",
                      padding: "10px 12px",
                      fontSize: 12,
                      color: "var(--bad)",
                      borderRadius: "var(--r-sm)",
                      lineHeight: 1.5,
                    }}
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    className="uk-eyebrow"
                    style={{ marginBottom: 6, display: "block" }}
                  >
                    E-post
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: 13,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-sm)",
                      color: "var(--fg)",
                    }}
                  />
                </div>

                <div>
                  <label
                    className="uk-eyebrow"
                    style={{ marginBottom: 6, display: "block" }}
                  >
                    Passord
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: 13,
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--r-sm)",
                      color: "var(--fg)",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="uk-btn"
                  style={{
                    fontSize: 13,
                    padding: "10px 14px",
                    opacity: loading ? 0.5 : 1,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Loggar inn..." : "Logg inn"}
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