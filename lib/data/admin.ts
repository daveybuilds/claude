import "server-only";
import { randomUUID } from "node:crypto";
import { isSupabaseConfigured } from "../env";
import { memoryDb } from "../memory-db";
import { createCollectContext, createPipelineStore } from "../pipeline/context";
import { dedupeKey, normalizeExtracted } from "../pipeline/normalize";
import { runSource, type RunSummary } from "../pipeline/run";
import { fromDb } from "../pipeline/store";
import { parseListingsCsv } from "../pipeline/adapters/manual";
import { supabaseService } from "../supabase";
import type { HistoryEntry, Listing, ListingFields, Report, Source } from "../types";

// Admin reads and writes. Callers must check requireAdmin() first; this
// module uses the service role (or the preview store) and bypasses RLS.

const mem = () => (isSupabaseConfigured() ? null : memoryDb());
const sb = () => supabaseService();

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function listListings(): Promise<Listing[]> {
  const db = mem();
  if (db) return db.listings.map((l) => ({ ...l }));
  return (check(await sb().from("listings").select("*").order("updated_at", { ascending: false })) ?? []).map((r) => fromDb(r as Listing));
}

export async function getListing(id: string): Promise<Listing | null> {
  const db = mem();
  if (db) return db.listings.find((l) => l.id === id) ?? null;
  const row = check(await sb().from("listings").select("*").eq("id", id).maybeSingle());
  return row ? fromDb(row as Listing) : null;
}

export async function getHistory(listingId: string): Promise<HistoryEntry[]> {
  const db = mem();
  if (db) return db.history.filter((h) => h.listing_id === listingId).reverse();
  return check(
    await sb().from("listing_history").select("*").eq("listing_id", listingId).order("created_at", { ascending: false }).limit(50),
  ) as HistoryEntry[];
}

async function patchListing(id: string, patch: Partial<Listing>): Promise<void> {
  const db = mem();
  if (db) {
    const l = db.listings.find((x) => x.id === id);
    if (l) Object.assign(l, patch, { updated_at: new Date().toISOString() });
    return;
  }
  check(await sb().from("listings").update(patch).eq("id", id));
}

async function addHistory(listing_id: string, action: string, before: Partial<ListingFields> | null, after: Partial<ListingFields> | null) {
  const db = mem();
  const entry = { listing_id, action, actor: "admin", before, after };
  if (db) db.history.push({ ...entry, id: randomUUID(), created_at: new Date().toISOString() });
  else check(await sb().from("listing_history").insert(entry));
}

/** Recompute the de-duplication key after a rename or time change, if it's free. */
async function freshKey(l: Listing, fields: ListingFields): Promise<string> {
  const key = dedupeKey(l.provider, fields);
  if (key === l.dedupe_key) return key;
  const all = await listListings();
  return all.some((x) => x.dedupe_key === key && x.id !== l.id) ? l.dedupe_key : key;
}

const FIELD_KEYS = [
  "name", "type", "day_of_week", "date", "start_time", "end_time", "series_start", "series_end",
  "location_name", "address", "neighborhood", "ages_text", "age_min_months", "age_max_months",
  "is_free", "price", "price_details", "availability", "description", "url",
] as const;

const fieldsOf = (l: Listing): ListingFields => Object.fromEntries(FIELD_KEYS.map((k) => [k, l[k]])) as unknown as ListingFields;

/** Approve a new listing, or accept the collector's proposed changes. */
export async function approveListing(id: string): Promise<void> {
  const l = await getListing(id);
  if (!l) return;
  const merged = { ...fieldsOf(l), ...(l.pending_changes ?? {}) };
  await patchListing(id, {
    ...merged,
    dedupe_key: await freshKey(l, merged),
    status: "approved",
    pending_changes: null,
    review_note: null,
    last_verified_at: new Date().toISOString(),
  });
  await addHistory(id, "approved", l.pending_changes ? fieldsOf(l) : null, l.pending_changes ?? merged);
}

/** Reject a new listing, or throw away proposed changes (keeping what's live). */
export async function rejectListing(id: string): Promise<void> {
  const l = await getListing(id);
  if (!l) return;
  if (l.pending_changes && l.status === "approved") {
    await patchListing(id, { pending_changes: null, review_note: null });
    await addHistory(id, "changes_rejected", null, l.pending_changes);
  } else {
    await patchListing(id, { status: "rejected", review_note: null });
    await addHistory(id, "rejected", null, null);
  }
}

export async function archiveListing(id: string): Promise<void> {
  await patchListing(id, { status: "archived" });
  await addHistory(id, "archived", null, null);
}

export async function markVerified(id: string): Promise<void> {
  await patchListing(id, { last_verified_at: new Date().toISOString(), missing_since: null });
  await addHistory(id, "verified", null, null);
}

export async function saveListing(id: string | null, fields: ListingFields, opts: { sourceId: string | null; provider: string; verify: boolean; approve: boolean }): Promise<string> {
  const now = new Date().toISOString();
  if (id) {
    const l = await getListing(id);
    if (!l) throw new Error("Listing not found");
    await patchListing(id, {
      ...fields,
      dedupe_key: await freshKey(l, fields),
      ...(opts.approve ? { status: "approved" as const, pending_changes: null, review_note: null } : {}),
      ...(opts.verify ? { last_verified_at: now, missing_since: null } : {}),
    });
    await addHistory(id, "edited", fieldsOf(l), fields);
    return id;
  }
  const row = {
    ...fields,
    source_id: opts.sourceId,
    provider: opts.provider,
    dedupe_key: dedupeKey(opts.provider, fields),
    status: "approved" as const,
    review_note: null,
    last_verified_at: opts.verify ? now : null,
    last_seen_at: now,
  };
  const all = await listListings();
  if (all.some((x) => x.dedupe_key === row.dedupe_key)) throw new Error("A listing with this provider, name, day and time already exists.");
  const db = mem();
  let newId: string;
  if (db) {
    newId = randomUUID();
    db.listings.push({ ...row, id: newId, pending_changes: null, missing_since: null, created_at: now, updated_at: now });
  } else {
    newId = (check(await sb().from("listings").insert(row).select("id").single()) as { id: string }).id;
  }
  await addHistory(newId, "created", null, fields);
  return newId;
}

// ---------------------------------------------------------------------------
// CSV import for manual sources
// ---------------------------------------------------------------------------

export async function importCsv(csv: string, defaultSourceSlug: string | null): Promise<{ created: number; updated: number; errors: string[] }> {
  const { rows, errors } = parseListingsCsv(csv);
  const sources = await listSources();
  let created = 0;
  let updated = 0;
  const all = await listListings();
  for (const [i, r] of rows.entries()) {
    const slug = r.source ?? defaultSourceSlug;
    const source = sources.find((s) => s.slug === slug);
    if (!source) {
      errors.push(`Row ${i + 2}: unknown source "${slug ?? ""}"`);
      continue;
    }
    const fields = normalizeExtracted(r.item, source);
    if (!fields) continue;
    const key = dedupeKey(source.provider, fields);
    const existing = all.find((l) => l.dedupe_key === key);
    if (existing) {
      await saveListing(existing.id, fields, { sourceId: source.id, provider: source.provider, verify: true, approve: true });
      updated++;
    } else {
      await saveListing(null, fields, { sourceId: source.id, provider: source.provider, verify: true, approve: true });
      created++;
    }
  }
  return { created, updated, errors };
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export async function listSources(): Promise<Source[]> {
  const db = mem();
  if (db) return [...db.sources].sort((a, b) => a.name.localeCompare(b.name));
  return check(await sb().from("sources").select("*").order("name")) as Source[];
}

export async function saveSource(id: string | null, s: Omit<Source, "id" | "created_at" | "last_run_at" | "last_success_at" | "last_error" | "last_count" | "needs_attention">): Promise<void> {
  const db = mem();
  if (db) {
    if (id) Object.assign(db.sources.find((x) => x.id === id) ?? {}, s);
    else {
      if (db.sources.some((x) => x.slug === s.slug)) throw new Error("That slug is taken");
      db.sources.push({ ...s, id: randomUUID(), created_at: new Date().toISOString(), last_run_at: null, last_success_at: null, last_error: null, last_count: null, needs_attention: false });
    }
    return;
  }
  if (id) check(await sb().from("sources").update(s).eq("id", id));
  else check(await sb().from("sources").insert(s));
}

export async function clearSourceFlag(id: string): Promise<void> {
  const db = mem();
  if (db) Object.assign(db.sources.find((x) => x.id === id) ?? {}, { needs_attention: false });
  else check(await sb().from("sources").update({ needs_attention: false }).eq("id", id));
}

export async function runSourceNow(slug: string): Promise<RunSummary> {
  const { store } = createPipelineStore();
  const source = await store.getSource(slug);
  if (!source) throw new Error("Source not found");
  return runSource(source, store, createCollectContext(() => {}));
}

// ---------------------------------------------------------------------------
// Reported names
// ---------------------------------------------------------------------------

export async function listReports(): Promise<Report[]> {
  const db = mem();
  if (db) return [...db.reports].reverse();
  const rows = check(
    await sb()
      .from("reports")
      .select("id, name_id, listing_id, occurrence_date, first_name, reason, status, created_at, listings(name)")
      .order("created_at", { ascending: false })
      .limit(200),
  ) as unknown as (Omit<Report, "listing_name"> & { listings: { name: string } | null })[];
  return rows.map(({ listings, ...r }) => ({ ...r, listing_name: listings?.name ?? null }));
}

/** "remove": delete the name for good. "restore": show it again. */
export async function resolveReport(id: string, action: "remove" | "restore"): Promise<void> {
  const db = mem();
  if (db) {
    const r = db.reports.find((x) => x.id === id);
    if (!r) return;
    if (action === "remove") db.names = db.names.filter((n) => n.say_hi_id !== r.name_id);
    else Object.assign(db.names.find((n) => n.say_hi_id === r.name_id) ?? {}, { hidden: false });
    for (const other of db.reports) if (other.name_id === r.name_id) other.status = action === "remove" ? "removed" : "restored";
    return;
  }
  const r = check(await sb().from("reports").select("name_id").eq("id", id).maybeSingle()) as { name_id: string | null } | null;
  if (!r) return;
  if (r.name_id) {
    // Update the reports first: deleting the name sets their name_id to null.
    check(await sb().from("reports").update({ status: action === "remove" ? "removed" : "restored" }).eq("name_id", r.name_id).eq("status", "open"));
    if (action === "remove") check(await sb().from("say_hi_names").delete().eq("say_hi_id", r.name_id));
    else check(await sb().from("say_hi_names").update({ hidden: false }).eq("say_hi_id", r.name_id));
  } else {
    check(await sb().from("reports").update({ status: "removed" }).eq("id", id));
  }
}

export async function countSubscribers(): Promise<number> {
  const db = mem();
  if (db) return db.subscribers.length;
  const res = await sb().from("subscribers").select("id", { count: "exact", head: true });
  return res.count ?? 0;
}
