import type { Metadata } from "next";
import { Barlow } from "next/font/google";
import { Inter } from "next/font/google";
import "./globals.css";

/* DIN Alternate (brand heading font) — closest Google Fonts match */
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pruma IA",
  description: "Automatize seus processos com precisão.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${barlow.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
