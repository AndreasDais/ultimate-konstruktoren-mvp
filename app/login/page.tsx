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
        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            {LOGIN_LABELS.loggInn[locale]}
          </h1>
          <p className="text-sm text-neutral-600 mb-6">
            {LOGIN_LABELS.introTekst[locale]}
          </p>

          {status === "sent" ? (
            <div
              role="status"
              className="rounded-md bg-emerald-50 border border-emerald-200 p-4"
            >
              <h2 className="font-medium text-emerald-900 mb-1">{LOGIN_LABELS.sjekkEposten[locale]}</h2>
              <p className="text-sm text-emerald-800">
                {LOGIN_LABELS.viSendePre[locale]}<strong>{email}</strong>{LOGIN_LABELS.viSendePost[locale]}
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setEmail("");
                }}
                className="mt-3 text-sm text-emerald-700 underline hover:text-emerald-900"
              >
                {LOGIN_LABELS.brukAnnaEpost[locale]}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-neutral-700 mb-1"
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
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-500"
                  placeholder={LOGIN_LABELS.epostPlaceholder[locale]}
                />
              </div>

              {status === "error" && errorMessage && (
                <div
                  role="alert"
                  className="rounded-md bg-red-50 border border-red-200 p-3"
                >
                  <p className="text-sm text-red-800">
                    {LOGIN_LABELS.noeFeilPre[locale]}{errorMessage}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending" || !email.trim()}
                className="w-full rounded-md bg-neutral-900 text-white text-sm font-medium py-2.5 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === "sending" ? LOGIN_LABELS.senderLenke[locale] : LOGIN_LABELS.sendLenke[locale]}
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-neutral-500 text-center mt-4">
          {LOGIN_LABELS.footer[locale]}
        </p>
      </div>
    </main>
  );
}