import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AdFlux — AI-генерація рекламних креативів",
  description:
    "SaaS-платформа для генерації рекламних креативів на основі ШІ. Від посилання на товар до готового банеру за кілька хвилин.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`${jakarta.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
