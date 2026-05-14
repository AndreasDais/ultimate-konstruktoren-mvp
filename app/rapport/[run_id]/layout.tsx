import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Berekningsnotat — Pilar",
};

export default function RapportLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--bg)",
        color: "var(--fg)",
        minHeight: "100%",
      }}
    >
      {children}
    </div>
  );
}