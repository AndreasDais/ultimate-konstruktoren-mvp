"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
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
            Logg inn på Pilar
          </h1>
          <p className="text-sm text-neutral-600 mb-6">
            Skriv inn e-postadressa di — vi sender deg ei eingongs-lenke for å logge inn.
            Ingen passord.
          </p>

          {status === "sent" ? (
            <div
              role="status"
              className="rounded-md bg-emerald-50 border border-emerald-200 p-4"
            >
              <h2 className="font-medium text-emerald-900 mb-1">Sjekk e-posten din</h2>
              <p className="text-sm text-emerald-800">
                Vi sende ein innloggings-lenke til <strong>{email}</strong>.
                Lenka går ut etter 1 time.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setEmail("");
                }}
                className="mt-3 text-sm text-emerald-700 underline hover:text-emerald-900"
              >
                Bruk ei anna e-postadresse
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  E-post
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
                  placeholder="namn@ntnu.no"
                />
              </div>

              {status === "error" && errorMessage && (
                <div
                  role="alert"
                  className="rounded-md bg-red-50 border border-red-200 p-3"
                >
                  <p className="text-sm text-red-800">
                    Noko gjekk gale: {errorMessage}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending" || !email.trim()}
                className="w-full rounded-md bg-neutral-900 text-white text-sm font-medium py-2.5 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === "sending" ? "Sender lenke..." : "Send innloggings-lenke"}
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-neutral-500 text-center mt-4">
          Pilar er ein AI-assistent for norsk byggfagleg praksis i pilot-fase.
        </p>
      </div>
    </main>
  );
}