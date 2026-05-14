import type { Metadata } from "next";
import "./globals.css";
import "./tokens.css";
import "katex/dist/katex.min.css";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "Pilar — AI-konstruksjonsassistent",
  description: "AI-basert konstruksjonsassistent for norsk byggfagleg praksis",
};

// Inline-skript som køyrer FØR React hydrerer, slik at vi unngår
// "flash of wrong theme" på første frame. Les preferanse frå localStorage
// og set data-palette på <html> umiddelbart.
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
      </head>
      <body
        className="min-h-full flex flex-col uk-app"
        suppressHydrationWarning
      >
        <Header />
        {children}
      </body>
    </html>
  );
}