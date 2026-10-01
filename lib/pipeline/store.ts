import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryDB } from "../memory-db";
import type { HistoryEntry, Listing, ListingFields, Source } from "../types";

/** The storage the collectors need. Implemented for Supabase and in memory. */
export interface PipelineStore {
  listSources(opts?: { activeOnly?: boolean }): Promise<Source[]>;
  getSource(slugOrId: string): Promise<Source | null>;
  updateSource(id: string, patch: Partial<Source>): Promise<void>;
  listingsForSource(sourceId: string): Promise<Listing[]>;
  insertListing(row: NewListing): Promise<Listing>;
  updateListing(id: string, patch: Partial<Listing>): Promise<void>;
  addHistory(entry: Omit<HistoryEntry, "id" | "created_at">): Promise<void>;
  countPending(): Promise<{ listings: number; reports: number }>;
}

export type NewListing = ListingFields &
  Pick<
    Listing,
    "source_id" | "provider" | "dedupe_key" | "status" | "review_note" | "last_verified_at" | "last_seen_at"
  >;

export class MemoryPipelineStore implements PipelineStore {
  constructor(private db: MemoryDB) {}

  async listSources(opts: { activeOnly?: boolean } = {}) {
    return this.db.sources.filter((s) => !opts.activeOnly || s.active).map((s) => ({ ...s }));
  }
  async getSource(slugOrId: string) {
    const s = this.db.sources.find((x) => x.slug === slugOrId || x.id === slugOrId);
    return s ? { ...s } : null;
  }
  async updateSource(id: string, patch: Partial<Source>) {
    const s = this.db.sources.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
  }
  async listingsForSource(sourceId: string) {
    return this.db.listings.filter((l) => l.source_id === sourceId).map((l) => ({ ...l }));
  }
  async insertListing(row: NewListing) {
    if (this.db.listings.some((l) => l.dedupe_key === row.dedupe_key))
      throw new Error(`duplicate dedupe_key ${row.dedupe_key}`);
    const now = new Date().toISOString();
    const listing: Listing = {
      ...row,
      id: randomUUID(),
      pending_changes: null,
      missing_since: null,
      created_at: now,
      updated_at: now,
    };
    this.db.listings.push(listing);
    return { ...listing };
  }
  async updateListing(id: string, patch: Partial<Listing>) {
    const l = this.db.listings.find((x) => x.id === id);
    if (l) Object.assign(l, patch, { updated_at: new Date().toISOString() });
  }
  async addHistory(entry: Omit<HistoryEntry, "id" | "created_at">) {
    this.db.history.push({ ...entry, id: randomUUID(), created_at: new Date().toISOString() });
  }
  async countPending() {
    return {
      listings: this.db.listings.filter((l) => l.status === "pending" || l.pending_changes).length,
      reports: this.db.reports.filter((r) => r.status === "open").length,
    };
  }
}

export class SupabasePipelineStore implements PipelineStore {
  constructor(private sb: SupabaseClient) {}

  private check<T>(res: { data: T; error: { message: string } | null }): T {
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }

  async listSources(opts: { activeOnly?: boolean } = {}) {
    let q = this.sb.from("sources").select("*").order("name");
    if (opts.activeOnly) q = q.eq("active", true);
    return this.check(await q) as Source[];
  }
  async getSource(slugOrId: string) {
    const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
    const res = await this.sb
      .from("sources")
      .select("*")
      .eq(isUuid ? "id" : "slug", slugOrId)
      .maybeSingle();
    return this.check(res) as Source | null;
  }
  async updateSource(id: string, patch: Partial<Source>) {
    this.check(await this.sb.from("sources").update(patch).eq("id", id));
  }
  async listingsForSource(sourceId: string) {
    return (this.check(await this.sb.from("listings").select("*").eq("source_id", sourceId)) ?? []).map((r) => fromDb(r as Listing));
  }
  async insertListing(row: NewListing) {
    return fromDb(this.check(await this.sb.from("listings").insert(row).select("*").single()));
  }
  async updateListing(id: string, patch: Partial<Listing>) {
    this.check(await this.sb.from("listings").update(patch).eq("id", id));
  }
  async addHistory(entry: Omit<HistoryEntry, "id" | "created_at">) {
    this.check(await this.sb.from("listing_history").insert(entry));
  }
  async countPending() {
    const a = await this.sb
      .from("listings")
      .select("id", { count: "exact", head: true })
      .or("status.eq.pending,pending_changes.not.is.null");
    const b = await this.sb.from("reports").select("id", { count: "exact", head: true }).eq("status", "open");
    return { listings: a.count ?? 0, reports: b.count ?? 0 };
  }
}

/** Postgres returns times as "10:30:00"; the app uses "10:30". */
export function fromDb<T extends Partial<Listing>>(row: T): T {
  const trim = (t: string | null | undefined) => (t ? t.slice(0, 5) : (t ?? null));
  return { ...row, start_time: trim(row.start_time), end_time: trim(row.end_time) };
}
