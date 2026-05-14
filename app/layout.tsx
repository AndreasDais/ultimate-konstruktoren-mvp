import type { Metadata } from "next";
import "./globals.css";
import "./tokens.css";
import "katex/dist/katex.min.css";
import Header from "./components/Header";
import { LocaleProvider } from "@/lib/locale-context";

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
    if (t !== 'slate' && t !== 'stone') t = 'slate';
    document.documentElement.dataset.palette = t;
  } catch (e) {
    document.documentElement.dataset.palette = 'slate';
  }
})();
`.trim();

const LOCALE_INIT_SCRIPT = `
(function() {
  try {
    var l = localStorage.getItem('pilar-locale');
    if (l !== 'nb' && l !== 'nn') l = 'nb';
    document.documentElement.lang = l;
  } catch (e) {
    document.documentElement.lang = 'nb';
  }
})();
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nb"
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
          <Header />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}