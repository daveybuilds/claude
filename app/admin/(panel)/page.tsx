import Link from "next/link";
import { approveAction, archiveAction, rejectAction, verifyAction } from "@/app/admin/actions";
import { ActionButton, formatValue, whenText } from "@/components/admin/bits";
import { countSubscribers, listListings, listReports, listSources } from "@/lib/data/admin";
import { sourcesNeedingAttention } from "@/lib/pipeline/digest";
import type { Listing, ListingFields } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReviewQueue() {
  const [listings, sources, reports, subscribers] = await Promise.all([listListings(), listSources(), listReports(), countSubscribers()]);
  const fresh = listings.filter((l) => l.status === "pending");
  const changed = listings.filter((l) => l.status === "approved" && l.pending_changes);
  const missing = listings.filter((l) => l.status === "approved" && l.missing_since && !l.pending_changes);
  const attention = sourcesNeedingAttention(sources);
  const openReports = reports.filter((r) => r.status === "open");
  const sourceName = (id: string | null) => sources.find((s) => s.id === id)?.name ?? "Manual";

  return (
    <div className="space-y-10">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="New to review" value={fresh.length} href="#new" />
        <Stat label="Changes to review" value={changed.length} href="#changed" />
        <Stat label="Reported names" value={openReports.length} href="/admin/reports" />
        <Stat label="Sources needing attention" value={attention.length} href="/admin/sources" />
      </div>
      <p className="text-sm text-ink-soft">{subscribers} on the Friday list.</p>

      {attention.length > 0 && (
        <section aria-labelledby="attn">
          <h2 id="attn" className="text-2xl font-semibold">Sources needing attention</h2>
          <ul className="mt-3 space-y-2">
            {attention.map(({ source, reason }) => (
              <li key={source.id} className="rounded-2xl border border-rose bg-surface p-4 text-sm">
                <Link href={`/admin/sources/${source.id}`} className="font-bold hover:underline">{source.name}</Link>
                <span className="text-ink-soft"> — {reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="new">
        <h2 id="new" className="text-2xl font-semibold">New listings</h2>
        {fresh.length === 0 ? <Empty /> : (
          <ul className="mt-3 space-y-3">
            {fresh.map((l) => (
              <li key={l.id} className="rounded-2xl border border-line bg-surface p-4">
                <ListingSummary l={l} source={sourceName(l.source_id)} />
                {l.review_note && <p className="mt-1 text-xs text-ink-faint">{l.review_note}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton action={approveAction.bind(null, l.id)} tone="good">Approve</ActionButton>
                  <Link href={`/admin/listings/${l.id}`} className="inline-flex min-h-9 items-center rounded-full border border-line px-3 text-sm font-bold">Edit</Link>
                  <ActionButton action={rejectAction.bind(null, l.id)} tone="bad">Reject</ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="changed">
        <h2 id="changed" className="text-2xl font-semibold">Changes the collectors saw</h2>
        <p className="mt-1 text-sm text-ink-soft">The live listing keeps its current details until you approve.</p>
        {changed.length === 0 ? <Empty /> : (
          <ul className="mt-3 space-y-3">
            {changed.map((l) => (
              <li key={l.id} className="rounded-2xl border border-line bg-surface p-4">
                <ListingSummary l={l} source={sourceName(l.source_id)} />
                <Diff l={l} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton action={approveAction.bind(null, l.id)} tone="good">Accept changes</ActionButton>
                  <Link href={`/admin/listings/${l.id}`} className="inline-flex min-h-9 items-center rounded-full border border-line px-3 text-sm font-bold">Edit</Link>
                  <ActionButton action={rejectAction.bind(null, l.id)} tone="bad">Keep current</ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="missing">
        <h2 id="missing" className="text-2xl font-semibold">No longer on the source</h2>
        <p className="mt-1 text-sm text-ink-soft">These disappeared from the provider's page. Check whether they've ended.</p>
        {missing.length === 0 ? <Empty /> : (
          <ul className="mt-3 space-y-3">
            {missing.map((l) => (
              <li key={l.id} className="rounded-2xl border border-line bg-surface p-4">
                <ListingSummary l={l} source={sourceName(l.source_id)} />
                <p className="mt-1 text-xs text-ink-faint">Missing since {l.missing_since?.slice(0, 10)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton action={verifyAction.bind(null, l.id)}>Still running</ActionButton>
                  <ActionButton action={archiveAction.bind(null, l.id)} tone="bad">Archive</ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <a href={href} className="rounded-2xl border border-line bg-surface p-4 hover:border-ink-faint">
      <span className="block font-display text-3xl font-semibold">{value}</span>
      <span className="text-sm font-bold text-ink-soft">{label}</span>
    </a>
  );
}

const Empty = () => <p className="mt-3 text-sm text-ink-faint">Nothing here. 🌿</p>;

function ListingSummary({ l, source }: { l: Listing; source: string }) {
  return (
    <div>
      <p className="font-bold">{l.name}</p>
      <p className="text-sm text-ink-soft">
        {whenText(l)} · {l.location_name ?? "no place"} · {l.price ?? "price unknown"}
      </p>
      <p className="text-xs text-ink-faint">
        {source}
        {l.url && (
          <>
            {" · "}
            <a href={l.url} target="_blank" rel="noopener noreferrer" className="underline">source page ↗</a>
          </>
        )}
      </p>
    </div>
  );
}

function Diff({ l }: { l: Listing }) {
  const changes = l.pending_changes ?? {};
  return (
    <table className="mt-3 w-full text-left text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-ink-faint">
          <th className="py-1 pr-3">Field</th>
          <th className="py-1 pr-3">Now</th>
          <th className="py-1">Proposed</th>
        </tr>
      </thead>
      <tbody>
        {(Object.keys(changes) as (keyof ListingFields)[]).map((k) => (
          <tr key={k} className="border-t border-line align-top">
            <td className="py-1.5 pr-3 font-bold">{k}</td>
            <td className="py-1.5 pr-3 text-ink-soft line-through decoration-rose">{formatValue(l[k])}</td>
            <td className="py-1.5 font-semibold">{formatValue(changes[k])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
