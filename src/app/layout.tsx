import type { Metadata } from "next";
import { Inter, Outfit, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { siteConfig } from "@/config/site";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — Agenda tus citas, sin caos de WhatsApp`,
    description: siteConfig.description,
    url: siteConfig.url,
    locale: "es_MX",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — Agenda tus citas, sin caos de WhatsApp`,
    description: "La forma fácil de agendar citas para manicuristas, lashistas, barberos y estéticas. Prueba gratis 3 días.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: siteConfig.url },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es-MX" suppressHydrationWarning>
        <body className={`${inter.variable} ${outfit.variable} ${fraunces.variable} antialiased font-sans`}>
          <ThemeProvider>
            <AnalyticsProvider />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
