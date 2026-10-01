import type { Listing, ListingFields, Source } from "../types";
import { ADAPTERS, type CollectContext } from "./adapters";
import { dedupeKey, normalizeExtracted } from "./normalize";
import type { PipelineStore } from "./store";

/** Changes a trusted feed may make without review. */
const BENIGN_FIELDS: (keyof ListingFields)[] = ["description", "availability", "series_start", "series_end", "url", "ages_text"];
/** Changes that mean the old times/prices can't be trusted until reviewed. */
const SCHEDULE_FIELDS: (keyof ListingFields)[] = ["day_of_week", "date", "start_time", "end_time", "price", "is_free", "location_name", "address"];

const FIELD_KEYS: (keyof ListingFields)[] = [
  "name", "type", "day_of_week", "date", "start_time", "end_time", "series_start", "series_end",
  "location_name", "address", "neighborhood", "ages_text", "age_min_months", "age_max_months",
  "is_free", "price", "price_details", "availability", "description", "url",
];

export interface RunSummary {
  source: string;
  ok: boolean;
  skipped?: boolean;
  dryRun?: boolean;
  found: number;
  created: number;
  autoApproved: number;
  updated: number;
  proposed: number;
  unchanged: number;
  missing: number;
  error?: string;
  notes: string[];
  /** Dry runs only: what would be saved. */
  preview?: ListingFields[];
}

/** Fields whose value differs (only fields the collector actually knows). */
export function diffFields(current: ListingFields, incoming: ListingFields): Partial<ListingFields> {
  const out: Partial<ListingFields> = {};
  for (const k of FIELD_KEYS) {
    const next = incoming[k];
    if (next === null || next === undefined) continue; // unknown never overwrites known
    if (current[k] !== next) (out as Record<string, unknown>)[k] = next;
  }
  return out;
}

function pickFields(l: Listing): ListingFields {
  return Object.fromEntries(FIELD_KEYS.map((k) => [k, l[k]])) as unknown as ListingFields;
}

export interface RunOptions {
  dryRun?: boolean;
  now?: Date;
}

/**
 * Collect one source and merge the results:
 *  - new listings → pending review (or approved straight away when a trusted
 *    ICS/API feed returned complete data and the run looks normal)
 *  - unchanged listings → "last verified" bumped
 *  - changed listings → proposed changes queued for review, public data kept;
 *    trusted feeds may apply harmless changes (description, availability…)
 *  - failures or suspiciously small results → old data kept, source flagged
 */
export async function runSource(source: Source, store: PipelineStore, ctx: CollectContext, opts: RunOptions = {}): Promise<RunSummary> {
  const now = (opts.now ?? new Date()).toISOString();
  const summary: RunSummary = {
    source: source.slug, ok: false, found: 0, created: 0, autoApproved: 0, updated: 0, proposed: 0, unchanged: 0, missing: 0, notes: [],
  };
  const actor = `collector:${source.slug}`;
  const flag = async (error: string) => {
    summary.error = error;
    if (!opts.dryRun) await store.updateSource(source.id, { last_run_at: now, last_error: error, needs_attention: true });
    return summary;
  };

  let result;
  try {
    result = await ADAPTERS[source.method].collect(source, ctx);
  } catch (e) {
    return flag(e instanceof Error ? e.message : String(e));
  }
  summary.notes.push(...result.notes);
  if (result.skipped) {
    summary.ok = true;
    summary.skipped = true;
    if (!opts.dryRun) await store.updateSource(source.id, { last_run_at: now });
    return summary;
  }

  // Normalise and de-duplicate within this run.
  const incoming = new Map<string, ListingFields>();
  for (const item of result.items) {
    const fields = normalizeExtracted(item, source);
    if (fields) incoming.set(dedupeKey(source.provider, fields), fields);
  }
  summary.found = incoming.size;

  const prev = source.last_count ?? 0;
  if (incoming.size === 0 && prev > 0) return flag(`Found no listings (last good run found ${prev}). Kept the old data.`);
  if (prev >= 3 && incoming.size < prev * 0.5)
    return flag(`Found only ${incoming.size} listings (last good run found ${prev}). Kept the old data.`);
  const unusual = prev >= 3 && incoming.size > prev * 2;
  if (unusual) summary.notes.push(`Found ${incoming.size} listings vs ${prev} last time — sent new ones to review.`);

  const structuredFeed = (source.method === "ics" || source.method === "api") && result.structured;
  const canAutoApprove = source.trusted && structuredFeed && !unusual;
  const existing = await store.listingsForSource(source.id);
  const byKey = new Map(existing.map((l) => [l.dedupe_key, l]));
  const seen = new Set<string>();

  if (opts.dryRun) {
    summary.ok = true;
    summary.dryRun = true;
    summary.preview = [...incoming.values()];
    for (const [key] of incoming) {
      if (byKey.has(key)) summary.unchanged++;
      else summary.created++;
    }
    return summary;
  }

  for (const [key, fields] of incoming) {
    // Exact match, or the same class renamed (same day/date and start time).
    let match = byKey.get(key);
    if (!match && fields.start_time) {
      match = existing.find(
        (l) =>
          !seen.has(l.id) && l.status !== "rejected" && l.start_time === fields.start_time &&
          l.day_of_week === fields.day_of_week && l.date === fields.date && samePlace(l.location_name, fields.location_name),
      );
    }

    if (!match) {
      const complete = !!fields.start_time && (fields.day_of_week !== null || !!fields.date);
      const approve = canAutoApprove && complete;
      const row = await store.insertListing({
        ...fields,
        source_id: source.id,
        provider: source.provider,
        dedupe_key: key,
        status: approve ? "approved" : "pending",
        review_note: approve ? null : "New listing from collector",
        last_verified_at: now,
        last_seen_at: now,
      });
      await store.addHistory({ listing_id: row.id, action: approve ? "created_auto_approved" : "created", actor, before: null, after: fields });
      summary.created++;
      if (approve) summary.autoApproved++;
      continue;
    }

    seen.add(match.id);
    const changes = diffFields(pickFields(match), fields);
    const changedKeys = Object.keys(changes) as (keyof ListingFields)[];

    if (changedKeys.length === 0) {
      await store.updateListing(match.id, { last_verified_at: now, last_seen_at: now, missing_since: null, pending_changes: null });
      summary.unchanged++;
      continue;
    }

    if (match.status === "pending") {
      // Not public yet: just refresh what's waiting for review.
      await store.updateListing(match.id, { ...changes, last_verified_at: now, last_seen_at: now, missing_since: null });
      await store.addHistory({ listing_id: match.id, action: "updated", actor, before: pickFields(match), after: changes });
      summary.updated++;
      continue;
    }

    const benign = changedKeys.every((k) => BENIGN_FIELDS.includes(k));
    if (canAutoApprove && benign && match.status === "approved") {
      await store.updateListing(match.id, { ...changes, last_verified_at: now, last_seen_at: now, missing_since: null });
      await store.addHistory({ listing_id: match.id, action: "auto_updated", actor, before: pick(match, changedKeys), after: changes });
      summary.updated++;
      continue;
    }

    // Keep the public version; queue the change. If times or prices changed,
    // don't re-verify the old ones — they age into "Check times" if unreviewed.
    const touchesSchedule = changedKeys.some((k) => SCHEDULE_FIELDS.includes(k));
    await store.updateListing(match.id, {
      pending_changes: changes,
      review_note: `Collector saw changes to: ${changedKeys.join(", ")}`,
      last_seen_at: now,
      missing_since: null,
      ...(touchesSchedule ? {} : { last_verified_at: now }),
    });
    await store.addHistory({ listing_id: match.id, action: "change_proposed", actor, before: pick(match, changedKeys), after: changes });
    summary.proposed++;
  }

  // Approved listings the source no longer shows: flag, don't delete.
  for (const l of existing) {
    if (l.status === "approved" && !seen.has(l.id) && !incoming.has(l.dedupe_key) && !l.missing_since) {
      await store.updateListing(l.id, { missing_since: now });
      summary.missing++;
    }
  }

  await store.updateSource(source.id, {
    last_run_at: now,
    last_success_at: now,
    last_count: incoming.size,
    last_error: summary.notes.length ? summary.notes.join(" · ").slice(0, 1000) : null,
    needs_attention: false,
  });
  summary.ok = true;
  return summary;
}

/** Loose venue comparison: "Marina Branch" ≈ "Marina Branch Library"; unknown matches anything. */
export function samePlace(a: string | null, b: string | null): boolean {
  if (!a || !b) return true;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const x = norm(a);
  const y = norm(b);
  return x.includes(y) || y.includes(x);
}

function pick(l: Listing, keys: (keyof ListingFields)[]): Partial<ListingFields> {
  return Object.fromEntries(keys.map((k) => [k, l[k]]));
}

const FREQUENCY_DAYS = { daily: 1, weekly: 7, monthly: 30 } as const;

/** Is this source due for a run? (Runs a little early so nightly jobs don't drift.) */
export function isDue(source: Source, now: Date = new Date()): boolean {
  if (!source.active) return false;
  if (!source.last_run_at) return true;
  const days = FREQUENCY_DAYS[source.check_frequency] ?? 1;
  return now.getTime() - Date.parse(source.last_run_at) >= days * 86_400_000 - 2 * 3_600_000;
}

/** Run every due source, stopping early if the time budget runs out. */
export async function runDueSources(
  store: PipelineStore,
  ctx: CollectContext,
  opts: { methods?: string[]; budgetMs?: number; force?: boolean } = {},
): Promise<RunSummary[]> {
  const started = Date.now();
  const sources = (await store.listSources({ activeOnly: true }))
    .filter((s) => !opts.methods || opts.methods.includes(s.method))
    .filter((s) => opts.force || isDue(s))
    .sort((a, b) => (a.last_run_at ?? "").localeCompare(b.last_run_at ?? ""));
  const results: RunSummary[] = [];
  for (const s of sources) {
    if (opts.budgetMs && Date.now() - started > opts.budgetMs) {
      ctx.log(`Time budget used up; ${sources.length - results.length} sources left for next run`);
      break;
    }
    ctx.log(`Collecting ${s.slug} (${s.method})…`);
    const r = await runSource(s, store, ctx);
    ctx.log(`  ${r.ok ? "ok" : "FAILED"}: ${r.error ?? `${r.found} found, ${r.created} new, ${r.proposed} changes to review`}`);
    results.push(r);
  }
  return results;
}
