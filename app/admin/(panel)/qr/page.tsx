import QRCode from "qrcode";
import { NEIGHBORHOODS } from "@/lib/constants";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function QrPage() {
  const codes = await Promise.all(
    NEIGHBORHOODS.map(async (n) => {
      const url = `${env.siteUrl}/${n.slug}`;
      const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#3a2e35", light: "#ffffff" } });
      return { ...n, url, dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` };
    }),
  );
  return (
    <div>
      <h1 className="text-3xl font-semibold">QR codes</h1>
      <p className="mt-2 text-sm text-ink-soft">
        One per neighborhood. Each opens the class finder already filtered to that area. Right-click (or long-press) a code to
        save it, or print this page. Codes use <strong>{env.siteUrl}</strong>, so set NEXT_PUBLIC_SITE_URL to your real domain
        first.
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {codes.map((c) => (
          <li key={c.slug} className="rounded-2xl border border-line bg-white p-4 text-center text-[#3a2e35]">
            {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI, nothing to optimise */}
            <img src={c.dataUri} alt={`QR code for ${c.url}`} className="mx-auto aspect-square w-full max-w-48" />
            <p className="mt-2 font-display text-lg font-semibold">{c.name}</p>
            <p className="break-all text-xs">{c.url.replace(/^https?:\/\//, "")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
