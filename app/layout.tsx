import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito } from "next/font/google";
import { env } from "@/lib/env";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

const title = "Little SF — baby classes in San Francisco, and moms who'll say hi";
const description =
  "Find baby-friendly classes across San Francisco this week, and quietly let other new moms know you'll say hi at the door afterwards.";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: title, template: "%s · Little SF" },
  description,
  openGraph: { title, description, url: "/", siteName: "Little SF", type: "website" },
  twitter: { card: "summary", title, description },
  appleWebApp: { title: "Little SF", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#1d191c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only rounded-full bg-button px-4 py-2 font-bold text-button-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
