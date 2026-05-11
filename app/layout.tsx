import type { Metadata } from "next";
import "./globals.css";
import "./tokens.css";
import "katex/dist/katex.min.css";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "Pilar — AI-konstruksjonsassistent",
  description: "AI-basert konstruksjonsassistent for norsk byggfagleg praksis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb" className="h-full antialiased">
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