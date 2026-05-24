"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { Locale } from "@/lib/locale";
import { useLocale } from "@/lib/locale-context";


const LOGIN_LABELS: Record<string, Record<Locale, string>> = {
  // Heading + intro
  loggInn: { nb: "Logg inn på Pilar", nn: "Logg inn på Pilar" },
  introTekst: {
    nb: "Skriv inn e-postadressen din — vi sender deg en engangslenke for å logge inn. Ingen passord.",
    nn: "Skriv inn e-postadressa di — vi sender deg ei eingongs-lenke for å logge inn. Ingen passord.",
  },

  // Suksess
  sjekkEposten: { nb: "Sjekk e-posten din", nn: "Sjekk e-posten din" },
  viSendePre: { nb: "Vi sendte en innloggings-lenke til ", nn: "Vi sende ein innloggings-lenke til " },
  viSendePost: { nb: ". Lenken går ut etter 1 time.", nn: ". Lenka går ut etter 1 time." },
  brukAnnaEpost: { nb: "Bruk en annen e-postadresse", nn: "Bruk ei anna e-postadresse" },

  // Form
  epostLabel: { nb: "E-post", nn: "E-post" },
  epostPlaceholder: { nb: "navn@ntnu.no", nn: "namn@ntnu.no" },
  noeFeilPre: { nb: "Noe gikk galt: ", nn: "Noko gjekk gale: " },
  senderLenke: { nb: "Sender lenke...", nn: "Sender lenke..." },
  sendLenke: { nb: "Send innloggings-lenke", nn: "Send innloggings-lenke" },

  // Footer
  footer: {
    nb: "Pilar er en AI-assistent for norsk byggfaglig praksis i pilot-fase.",
    nn: "Pilar er ein AI-assistent for norsk byggfagleg praksis i pilot-fase.",
  },
};

export default function LoginPage() {
  const { locale } = useLocale();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setErrorMessage("");

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="uk-card shadow-sm p-8">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--fg)" }}>
            {LOGIN_LABELS.loggInn[locale]}
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
            {LOGIN_LABELS.introTekst[locale]}
          </p>

          {status === "sent" ? (
            <div
              role="status"
              className="rounded-md border p-4"
              style={{ background: "var(--ok-bg)", borderColor: "var(--ok-border)" }}
            >
              <h2 className="font-medium mb-1" style={{ color: "var(--ok)" }}>{LOGIN_LABELS.sjekkEposten[locale]}</h2>
              <p className="text-sm" style={{ color: "var(--ok)" }}>
                {LOGIN_LABELS.viSendePre[locale]}<strong>{email}</strong>{LOGIN_LABELS.viSendePost[locale]}
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setEmail("");
                }}
                className="mt-3 text-sm underline"
                style={{ color: "var(--ok)" }}
              >
                {LOGIN_LABELS.brukAnnaEpost[locale]}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--fg-2)" }}
                >
                  {LOGIN_LABELS.epostLabel[locale]}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "sending"}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--fg)" }}
                  placeholder={LOGIN_LABELS.epostPlaceholder[locale]}
                />
              </div>

              {status === "error" && errorMessage && (
                <div
                  role="alert"
                  className="rounded-md border p-3"
                  style={{ background: "var(--bad-bg)", borderColor: "var(--bad-border)" }}
                >
                  <p className="text-sm" style={{ color: "var(--bad)" }}>
                    {LOGIN_LABELS.noeFeilPre[locale]}{errorMessage}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending" || !email.trim()}
                className="uk-btn uk-btn--primary w-full justify-center"
              >
                {status === "sending" ? LOGIN_LABELS.senderLenke[locale] : LOGIN_LABELS.sendLenke[locale]}
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-center mt-4" style={{ color: "var(--fg-muted)" }}>
          {LOGIN_LABELS.footer[locale]}
        </p>
      </div>
    </main>
  );
}