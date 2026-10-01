// In-memory database used in preview mode (no Supabase configured) and in
// tests. It mirrors the Postgres rules in supabase/migrations so the site
// behaves the same way, but everything resets when the server restarts.

import { randomUUID } from "node:crypto";
import { SEED_LISTINGS, SEED_SOURCES, seedDedupeKey } from "./seed";
import type { HistoryEntry, Listing, Report, Source } from "./types";

export interface MemTap {
  id: string;
  user_id: string;
  listing_id: string;
  occurrence_date: string;
}
export interface MemName {
  say_hi_id: string;
  listing_id: string;
  occurrence_date: string;
  first_name: string;
  hidden: boolean;
}
export interface MemSubscriber {
  email: string;
  neighborhoods: string[];
  age_bands: string[];
}

export interface MemoryDB {
  sources: Source[];
  listings: Listing[];
  history: HistoryEntry[];
  taps: MemTap[];
  names: MemName[];
  reports: (Report & { reporter_id: string })[];
  subscribers: MemSubscriber[];
  users: { id: string; email: string }[];
}

export function createMemoryDB(opts: { seed?: boolean } = {}): MemoryDB {
  const db: MemoryDB = {
    sources: [],
    listings: [],
    history: [],
    taps: [],
    names: [],
    reports: [],
    subscribers: [],
    users: [],
  };
  if (opts.seed === false) return db;
  const now = new Date().toISOString();
  const sourceIds = new Map<string, string>();
  for (const s of SEED_SOURCES) {
    const id = randomUUID();
    sourceIds.set(s.slug, id);
    db.sources.push({
      ...s,
      id,
      created_at: now,
      last_run_at: null,
      last_success_at: null,
      last_error: null,
      last_count: null,
      needs_attention: false,
    });
  }
  for (const seed of SEED_LISTINGS) {
    const { source_slug, last_verified_at, provider, status, review_note, ...fields } = seed;
    db.listings.push({
      ...fields,
      id: randomUUID(),
      source_id: sourceIds.get(source_slug) ?? null,
      provider,
      dedupe_key: seedDedupeKey(seed),
      status: status ?? "approved",
      pending_changes: null,
      review_note: review_note ?? null,
      last_verified_at,
      last_seen_at: last_verified_at,
      missing_since: null,
      created_at: now,
      updated_at: now,
    });
  }
  return db;
}

const g = globalThis as unknown as { __littleSfMemoryDb?: MemoryDB };

/** Shared preview-mode database (survives hot reloads in dev). */
export function memoryDb(): MemoryDB {
  g.__littleSfMemoryDb ??= createMemoryDB();
  return g.__littleSfMemoryDb;
}
