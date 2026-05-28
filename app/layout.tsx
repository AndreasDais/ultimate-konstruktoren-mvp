import type { Metadata } from "next";
import { cookies } from "next/headers";
import { type HeaderUiMode } from "./components/Header";
import ConditionalAppHeader from "./components/ConditionalAppHeader";
import { LocaleProvider } from "@/lib/locale-context";
import "./globals.css";
import "./tokens.css";
import "katex/dist/katex.min.css";

const UI_MODE_COOKIE = "pilar-ui-mode";

export const metadata: Metadata = {
  title: "Pilar — AI-konstruksjonsassistent",
  description: "AI-basert konstruksjonsassistent for norsk byggfagleg praksis",
};

// Inline-skript som køyrer FØR React hydrerer:
// 1. Set data-palette på <html> så vi unngår flash-of-wrong-theme
// 2. Set lang-attributt på <html> for tilgjengelegheit
const THEME_INIT_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem('pilar-theme');
    if (t !== 'slate' && t !== 'stone' && t !== 'graphite') t = 'slate';
    document.documentElement.dataset.palette = t;
  } catch (e) {
    document.documentElement.dataset.palette = 'slate';
  }
})();
`.trim();

const LOCALE_INIT_SCRIPT = `
(function() {
  try {
    var uiCookie = document.cookie.split('; ').find(function(c) {
      return c.indexOf('pilar-ui-mode=') === 0;
    });
    if (uiCookie && uiCookie.split('=')[1] === 'intl') {
      document.documentElement.lang = 'en';
      return;
    }
    var l = localStorage.getItem('pilar-locale');
    if (l !== 'nb' && l !== 'nn') l = 'nb';
    document.documentElement.lang = l;
  } catch (e) {
    document.documentElement.lang = 'nb';
  }
})();
`.trim();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const uiMode: HeaderUiMode =
    cookieStore.get(UI_MODE_COOKIE)?.value === "intl" ? "intl" : "no";

  return (
    <html
      lang={uiMode === "intl" ? "en" : "nb"}
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: LOCALE_INIT_SCRIPT }}
        />
      </head>
      <body
        className="min-h-full flex flex-col uk-app"
        suppressHydrationWarning
      >
        <LocaleProvider>
          <ConditionalAppHeader uiMode={uiMode} />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}