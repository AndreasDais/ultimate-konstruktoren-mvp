"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useLocale } from "@/lib/locale-context";
import type { HeaderUiMode } from "@/app/components/Header";

type LabelMap = { nb: string; nn: string; en: string };

const LOGIN_LABELS: Record<string, LabelMap> = {
  // Heading + intro
  loggInn: { nb: "Logg inn på Pilar", nn: "Logg inn på Pilar", en: "Log in to Pilar" },
  introTekst: {
    nb: "Skriv inn e-postadressen din — vi sender deg en engangslenke for å logge inn. Ingen passord.",
    nn: "Skriv inn e-postadressa di — vi sender deg ei eingongs-lenke for å logge inn. Ingen passord.",
    en: "Enter your email — we'll send you a one-time link to sign in. No password.",
  },

  // Suksess
  sjekkEposten: { nb: "Sjekk e-posten din", nn: "Sjekk e-posten din", en: "Check your email" },
  viSendePre: {
    nb: "Vi sendte en innloggings-lenke til ",
    nn: "Vi sende ein innloggings-lenke til ",
    en: "We sent a sign-in link to ",
  },
  viSendePost: {
    nb: ". Lenken går ut etter 1 time.",
    nn: ". Lenka går ut etter 1 time.",
    en: ". The link expires in 1 hour.",
  },
  brukAnnaEpost: {
    nb: "Bruk en annen e-postadresse",
    nn: "Bruk ei anna e-postadresse",
    en: "Use a different email",
  },

  // Form
  epostLabel: { nb: "E-post", nn: "E-post", en: "Email" },
  epostPlaceholder: { nb: "navn@ntnu.no", nn: "namn@ntnu.no", en: "name@example.com" },
  noeFeilPre: { nb: "Noe gikk galt: ", nn: "Noko gjekk gale: ", en: "Something went wrong: " },
  senderLenke: { nb: "Sender lenke...", nn: "Sender lenke...", en: "Sending link..." },
  sendLenke: { nb: "Send innloggings-lenke", nn: "Send innloggings-lenke", en: "Send sign-in link" },

  // Footer
  footer: {
    nb: "Pilar er en AI-assistent for norsk byggfaglig praksis i pilot-fase.",
    nn: "Pilar er ein AI-assistent for norsk byggfagleg praksis i pilot-fase.",
    en: "Pilar is an AI assistant for structural engineering practice, in pilot.",
  },
};

export default function LoginForm({ uiMode }: { uiMode: HeaderUiMode }) {
  const { locale } = useLocale();
  // Match the shell's language: English chrome (uiMode "intl") -> English copy,
  // otherwise the Norwegian variant for the active locale (nb/nn).
  const t = (map: LabelMap): string => (uiMode === "intl" ? map.en : map[locale]);

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
            {t(LOGIN_LABELS.loggInn)}
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
            {t(LOGIN_LABELS.introTekst)}
          </p>

          {status === "sent" ? (
            <div
              role="status"
              className="rounded-md border p-4"
              style={{ background: "var(--ok-bg)", borderColor: "var(--ok-border)" }}
            >
              <h2 className="font-medium mb-1" style={{ color: "var(--ok)" }}>{t(LOGIN_LABELS.sjekkEposten)}</h2>
              <p className="text-sm" style={{ color: "var(--ok)" }}>
                {t(LOGIN_LABELS.viSendePre)}<strong>{email}</strong>{t(LOGIN_LABELS.viSendePost)}
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
                {t(LOGIN_LABELS.brukAnnaEpost)}
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
                  {t(LOGIN_LABELS.epostLabel)}
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
                  placeholder={t(LOGIN_LABELS.epostPlaceholder)}
                />
              </div>

              {status === "error" && errorMessage && (
                <div
                  role="alert"
                  className="rounded-md border p-3"
                  style={{ background: "var(--bad-bg)", borderColor: "var(--bad-border)" }}
                >
                  <p className="text-sm" style={{ color: "var(--bad)" }}>
                    {t(LOGIN_LABELS.noeFeilPre)}{errorMessage}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending" || !email.trim()}
                className="uk-btn uk-btn--primary w-full justify-center"
              >
                {status === "sending" ? t(LOGIN_LABELS.senderLenke) : t(LOGIN_LABELS.sendLenke)}
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-center mt-4" style={{ color: "var(--fg-muted)" }}>
          {t(LOGIN_LABELS.footer)}
        </p>
      </div>
    </main>
  );
}
