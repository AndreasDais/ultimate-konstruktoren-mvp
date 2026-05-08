import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Berekningsnotat — Ultimate Konstruktøren",
};

export default function RapportLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      data-palette="stone"
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