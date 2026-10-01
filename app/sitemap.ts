import type { MetadataRoute } from "next";
import { NEIGHBORHOODS } from "@/lib/constants";
import { env } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.siteUrl;
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/classes`, changeFrequency: "daily", priority: 0.9 },
    ...NEIGHBORHOODS.map((n) => ({ url: `${base}/${n.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
