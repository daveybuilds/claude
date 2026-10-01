import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveAction, verifyAction } from "@/app/admin/actions";
import { ActionButton, formatValue, StatusPill } from "@/components/admin/bits";
import { ListingForm } from "@/components/admin/forms";
import { getHistory, getListing, listSources } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export default async function EditListing({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const sources = (await listSources()).map(({ id, name }) => ({ id, name }));
  const listing = id === "new" ? null : await getListing(id);
  if (id !== "new" && !listing) notFound();
  const history = listing ? await getHistory(listing.id) : [];

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div>
        <Link href="/admin/listings" className="text-sm font-bold text-ink-soft hover:text-ink">
          ← All listings
        </Link>
        <h1 className="mt-2 flex flex-wrap items-center gap-3 text-3xl font-semibold">
          {listing ? listing.name : "Add a listing"}
          {listing && <StatusPill status={listing.status} />}
        </h1>
        {saved && (
          <p role="status" className="mt-3 rounded-xl bg-sage-soft p-3 text-sm font-bold text-sage-ink">
            Saved.
          </p>
        )}
        {listing?.pending_changes && (
          <p className="mt-3 rounded-xl bg-butter-soft p-3 text-sm text-butter-ink">
            The collector proposed changes to {Object.keys(listing.pending_changes).join(", ")}. Review them on the{" "}
            <Link href="/admin#changed" className="font-bold underline">review page</Link>, or edit here and save (which clears them).
          </p>
        )}
        <div className="mt-6">
          <ListingForm listing={listing} sources={sources} />
        </div>
      </div>
      {listing && (
        <aside className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <ActionButton action={verifyAction.bind(null, listing.id)}>Mark verified today</ActionButton>
            {listing.status !== "archived" && (
              <ActionButton action={archiveAction.bind(null, listing.id)} tone="bad">
                Archive
              </ActionButton>
            )}
          </div>
          <dl className="space-y-1 text-sm text-ink-soft">
            <div>Last verified: {listing.last_verified_at?.slice(0, 16).replace("T", " ") ?? "never"}</div>
            <div>Last seen by collector: {listing.last_seen_at?.slice(0, 16).replace("T", " ") ?? "never"}</div>
            <div className="break-all">Key: {listing.dedupe_key}</div>
          </dl>
          <section>
            <h2 className="text-xl font-semibold">History</h2>
            <ol className="mt-2 space-y-3 text-sm">
              {history.map((h) => (
                <li key={h.id} className="rounded-xl border border-line bg-surface p-3">
                  <p className="font-bold">
                    {h.action} <span className="font-normal text-ink-faint">by {h.actor}</span>
                  </p>
                  <p className="text-xs text-ink-faint">{h.created_at.slice(0, 16).replace("T", " ")}</p>
                  {h.after && h.before && (
                    <ul className="mt-1 text-xs text-ink-soft">
                      {Object.keys(h.after)
                        .filter((k) => formatValue(h.before?.[k as keyof typeof h.before]) !== formatValue(h.after?.[k as keyof typeof h.after]))
                        .slice(0, 8)
                        .map((k) => (
                          <li key={k}>
                            {k}: {formatValue(h.before?.[k as keyof typeof h.before])} → {formatValue(h.after?.[k as keyof typeof h.after])}
                          </li>
                        ))}
                    </ul>
                  )}
                </li>
              ))}
              {history.length === 0 && <li className="text-ink-faint">No changes recorded yet.</li>}
            </ol>
          </section>
        </aside>
      )}
    </div>
  );
}
