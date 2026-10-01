import Link from "next/link";
import { StatusPill, whenText } from "@/components/admin/bits";
import { listListings, listSources } from "@/lib/data/admin";
import { isFresh } from "@/lib/time";
import type { ListingStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: (ListingStatus | "all")[] = ["approved", "pending", "rejected", "archived", "all"];

export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "approved" } = await searchParams;
  const [listings, sources] = await Promise.all([listListings(), listSources()]);
  const shown = listings
    .filter((l) => status === "all" || l.status === status)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Listings</h1>
        <Link href="/admin/listings/new" className="rounded-full bg-button px-4 py-2 font-extrabold text-button-ink">
          Add a listing
        </Link>
      </div>
      <nav aria-label="Filter by status" className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/listings?status=${s}`}
            aria-current={status === s ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 ${status === s ? "border-button bg-button text-button-ink" : "border-line bg-surface"}`}
          >
            {s}
          </Link>
        ))}
      </nav>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-ink-faint">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">When</th>
              <th className="p-3">Source</th>
              <th className="p-3">Verified</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((l) => (
              <tr key={l.id} className="border-t border-line">
                <td className="p-3">
                  <Link href={`/admin/listings/${l.id}`} className="font-bold hover:underline">
                    {l.name}
                  </Link>
                  {l.pending_changes && <span className="ml-2 text-xs font-bold text-butter-ink">changes waiting</span>}
                </td>
                <td className="p-3 text-ink-soft">{whenText(l)}</td>
                <td className="p-3 text-ink-soft">{sources.find((s) => s.id === l.source_id)?.slug ?? "manual"}</td>
                <td className={`p-3 ${isFresh(l.last_verified_at) ? "text-ink-soft" : "font-bold text-rose-ink"}`}>
                  {l.last_verified_at?.slice(0, 10) ?? "never"}
                </td>
                <td className="p-3">
                  <StatusPill status={l.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className="p-4 text-ink-faint">No listings with this status.</p>}
      </div>
      <p className="mt-3 text-xs text-ink-faint">Verified dates in red are older than 14 days: the site shows “Check times” instead.</p>
    </div>
  );
}
