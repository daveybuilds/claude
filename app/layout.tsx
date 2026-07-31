import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const title =
  "MetricText — the numbers you need to run your business, texted to your phone";
const description =
  "Revenue, jobs booked, and what your ad spend is actually bringing in — pulled from the tools you already use. Built for service owners who are never at a desk. No dashboards. Just a text.";

export const metadata: Metadata = {
  metadataBase: new URL("https://metrictext.com"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "MetricText",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-ink">
        {children}
      </body>
    </html>
  );
}
