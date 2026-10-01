"use client";

import { useRouter } from "next/navigation";
import type { Filters } from "@/lib/data/listings";

/** Neighborhood picker. A plain GET form, upgraded to navigate on change. */
export function HoodSelect({
  base,
  filters,
  neighborhoods,
}: {
  base: string;
  filters: Filters;
  neighborhoods: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const { hood, ...rest } = filters;

  return (
    <form action={base} method="get" className="flex flex-1 items-center gap-2">
      {Object.entries(rest).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label htmlFor="hood" className="sr-only">
        Neighborhood
      </label>
      <select
        id="hood"
        name="hood"
        defaultValue={hood ?? ""}
        onChange={(e) => {
          const params = new URLSearchParams(Object.entries(rest as Record<string, string | undefined>).filter((x): x is [string, string] => !!x[1]));
          if (e.target.value) params.set("hood", e.target.value);
          const qs = params.toString();
          router.push(qs ? `${base}?${qs}` : base, { scroll: false });
        }}
        className="min-h-11 w-full max-w-xs rounded-full border border-line bg-surface px-4 text-[0.95rem] font-bold text-ink"
      >
        <option value="">All of San Francisco</option>
        {neighborhoods.map((n) => (
          <option key={n.slug} value={n.slug}>
            {n.name}
          </option>
        ))}
      </select>
      <noscript>
        <button className="min-h-11 rounded-full bg-button px-4 font-bold text-button-ink">Go</button>
      </noscript>
    </form>
  );
}
