import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { filterListings, sortListings, type Filters } from "@/lib/data/listings";
import { getHiCounts, getMyHis, getPublicListings, getViewer, getVisibleNames } from "@/lib/data/site";
import { hiKey } from "@/lib/types";
import { FilterBar } from "./filters";
import { ListingCard } from "./listing-card";
import { LiveRefresh } from "./live-refresh";

export async function Finder({ base, filters, lockedHood }: { base: string; filters: Filters; lockedHood?: boolean }) {
  const viewer = await getViewer();
  const all = await getPublicListings();
  const list = sortListings(filterListings(all, filters));
  const [counts, mine] = await Promise.all([getHiCounts(list.map((l) => l.id)), getMyHis(viewer)]);
  const names = await getVisibleNames(viewer, mine);
  const preview = !isSupabaseConfigured();
  const qs = new URLSearchParams(Object.entries(filters).filter((e): e is [string, string] => !!e[1])).toString();
  const returnPath = qs ? `${base}?${qs}` : base;

  const scheduled = list.filter((l) => l.nextDate);
  const checkTimes = list.filter((l) => !l.nextDate);
  const card = (l: (typeof list)[number]) => {
    const key = l.nextDate ? hiKey(l.id, l.nextDate) : "";
    const my = mine.find((m) => m.listingId === l.id && m.date === l.nextDate);
    return (
      <li key={l.id}>
        <ListingCard
          // Remount when the server's numbers change, so refreshed counts show.
          key={`${counts[key] ?? 0}|${my ? 1 : 0}|${my?.showingName ?? ""}|${(names[key] ?? []).map((n) => n.id).join()}`}
          listing={l}
          signedIn={!!viewer}
          preview={preview}
          returnPath={returnPath}
          hi={{ ok: true, on: !!my, count: counts[key] ?? 0, showingName: my?.showingName ?? null, names: names[key] ?? [] }}
        />
      </li>
    );
  };

  return (
    <div>
      <LiveRefresh />
      <FilterBar base={base} filters={filters} lockedHood={lockedHood} />

      <p className="mt-6 text-sm font-semibold text-ink-soft" aria-live="polite">
        {list.length === 0
          ? "Nothing matches those filters yet."
          : `${scheduled.length} with confirmed times${checkTimes.length ? `, ${checkTimes.length} to check with the provider` : ""}`}
      </p>

      {list.length === 0 && (
        <div className="mt-4 rounded-[var(--radius-card)] border border-dashed border-line p-6 text-ink-soft">
          <p>
            Try another baby age or day, or{" "}
            <Link href={base} className="font-bold text-rose-ink underline underline-offset-4">
              clear the filters
            </Link>
            . We're adding classes across the city every week.
          </p>
        </div>
      )}

      {scheduled.length > 0 && (
        <section aria-labelledby="confirmed">
          <h2 id="confirmed" className="sr-only">
            Classes with confirmed times
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">{scheduled.map(card)}</ul>
        </section>
      )}

      {checkTimes.length > 0 && (
        <section aria-labelledby="check-times" className="mt-10">
          <h2 id="check-times" className="text-xl font-semibold">
            Times to check
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            We haven't confirmed these recently, so we don't show times. Tap through to the provider.
          </p>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">{checkTimes.map(card)}</ul>
        </section>
      )}
    </div>
  );
}
