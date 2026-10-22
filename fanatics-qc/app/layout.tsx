import type { Metadata, Viewport } from "next";
import { Barlow, Inter, Montserrat } from "next/font/google";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const brand = Montserrat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-brand", display: "swap" });
const display = Barlow({ subsets: ["latin"], weight: ["600", "700", "800", "900"], style: ["normal", "italic"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Fanatics QC Lab", template: "%s · Fanatics QC Lab" },
  description: "Fabric decoration-readiness portal: quality protocols, lab evidence and supplier performance.",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "QC Lab", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#0C2340", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = getI18n();
  return (
    <html lang={locale} className={`${inter.variable} ${display.variable} ${brand.variable}`}>
      <body className="min-h-screen font-sans">
        <I18nProvider locale={locale} t={t}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
