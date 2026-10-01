import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryDB, type MemoryDB } from "@/lib/memory-db";
import * as adapters from "@/lib/pipeline/adapters";
import { isDue, runSource } from "@/lib/pipeline/run";
import { emptyExtracted, type ExtractedListing } from "@/lib/pipeline/schema";
import { MemoryPipelineStore } from "@/lib/pipeline/store";
import type { Source } from "@/lib/types";
import { fixtureFetcher, makeCtx, makeSource } from "./helpers";

const NOW = new Date("2026-10-02T10:00:00Z");

function item(name: string, extra: Partial<ExtractedListing> = {}): ExtractedListing {
  return { ...emptyExtracted(name), day_of_week: 2, start_time: "10:30", end_time: "11:00", location: "Marina Branch Library", ...extra };
}

let db: MemoryDB;
let store: MemoryPipelineStore;
const ctx = makeCtx(fixtureFetcher({}).fetcher);

function setup(source: Partial<Source>) {
  db = createMemoryDB({ seed: false });
  const s = makeSource(source);
  db.sources.push(s);
  store = new MemoryPipelineStore(db);
  return s;
}

function stubAdapter(method: Source["method"], items: ExtractedListing[], structured = true) {
  vi.spyOn(adapters.ADAPTERS[method], "collect").mockResolvedValue({ items, structured, notes: [] });
}

beforeEach(() => vi.restoreAllMocks());

describe("runSource", () => {
  it("sends new listings from an untrusted source to review", async () => {
    const s = setup({ method: "html" });
    stubAdapter("html", [item("Family Storytime"), item("Baby Rhyme Time", { day_of_week: 4 })], false);
    const r = await runSource(s, store, ctx, { now: NOW });
    expect(r).toMatchObject({ ok: true, found: 2, created: 2, autoApproved: 0 });
    expect(db.listings.every((l) => l.status === "pending")).toBe(true);
    expect(db.history.map((h) => h.action)).toEqual(["created", "created"]);
    expect(db.sources[0]).toMatchObject({ last_count: 2, needs_attention: false });
  });

  it("auto-approves complete listings from a trusted ICS feed", async () => {
    const s = setup({ method: "ics", trusted: true });
    stubAdapter("ics", [item("Family Storytime"), item("No time yet", { start_time: null })]);
    const r = await runSource(s, store, ctx, { now: NOW });
    expect(r.autoApproved).toBe(1);
    expect(db.listings.find((l) => l.name === "Family Storytime")!.status).toBe("approved");
    expect(db.listings.find((l) => l.name === "No time yet")!.status).toBe("pending");
  });

  it("de-duplicates on provider + name + day + time", async () => {
    const s = setup({ method: "html" });
    stubAdapter("html", [item("Family Storytime"), item("Family  storytime ")], false);
    expect((await runSource(s, store, ctx, { now: NOW })).found).toBe(1);
  });

  it("re-verifies unchanged listings and queues real changes without touching the live data", async () => {
    const s = setup({ method: "html" });
    stubAdapter("html", [item("Family Storytime", { price: "Free" })], false);
    await runSource(s, store, ctx, { now: NOW });
    db.listings[0].status = "approved";

    // Same data next day: verified again.
    const later = new Date("2026-10-03T10:00:00Z");
    await runSource({ ...s, last_count: 1 }, store, ctx, { now: later });
    expect(db.listings[0].last_verified_at).toBe(later.toISOString());

    // Time changed: proposed, live time kept, not re-verified.
    vi.restoreAllMocks();
    stubAdapter("html", [item("Family Storytime", { price: "Free", start_time: "10:30", end_time: "11:15" })], false);
    const r = await runSource({ ...s, last_count: 1 }, store, ctx, { now: new Date("2026-10-04T10:00:00Z") });
    expect(r.proposed).toBe(1);
    expect(db.listings[0]).toMatchObject({ end_time: "11:00", pending_changes: { end_time: "11:15" }, last_verified_at: later.toISOString() });
    expect(db.history.at(-1)!.action).toBe("change_proposed");
  });

  it("lets a trusted feed apply harmless changes itself", async () => {
    const s = setup({ method: "api", trusted: true });
    stubAdapter("api", [item("Family Storytime", { availability: "open" })]);
    await runSource(s, store, ctx, { now: NOW });
    vi.restoreAllMocks();
    stubAdapter("api", [item("Family Storytime", { availability: "waitlist" })]);
    const r = await runSource({ ...s, last_count: 1 }, store, ctx, { now: NOW });
    expect(r.updated).toBe(1);
    expect(db.listings[0]).toMatchObject({ availability: "waitlist", pending_changes: null });
  });

  it("matches a renamed class at the same time instead of duplicating it", async () => {
    const s = setup({ method: "html" });
    stubAdapter("html", [item("Family Storytime")], false);
    await runSource(s, store, ctx, { now: NOW });
    db.listings[0].status = "approved";
    vi.restoreAllMocks();
    stubAdapter("html", [item("Storytime: For Families", { location: "Marina Branch" })], false);
    const r = await runSource({ ...s, last_count: 1 }, store, ctx, { now: NOW });
    expect(r).toMatchObject({ created: 0, proposed: 1 });
    expect(db.listings).toHaveLength(1);
    expect(db.listings[0].pending_changes).toMatchObject({ name: "Storytime: For Families" });
  });

  it("keeps old data and flags the source when far fewer listings come back", async () => {
    const s = setup({ method: "html", last_count: 10 });
    stubAdapter("html", [item("Only one")], false);
    const r = await runSource(s, store, ctx, { now: NOW });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/only 1 listings.*last good run found 10/i);
    expect(db.listings).toHaveLength(0);
    expect(db.sources[0]).toMatchObject({ needs_attention: true, last_success_at: null });
  });

  it("flags the source when the collector throws", async () => {
    const s = setup({ method: "html" });
    vi.spyOn(adapters.ADAPTERS.html, "collect").mockRejectedValue(new Error("HTTP 500"));
    const r = await runSource(s, store, ctx, { now: NOW });
    expect(r).toMatchObject({ ok: false, error: "HTTP 500" });
    expect(db.sources[0].needs_attention).toBe(true);
  });

  it("marks approved listings that vanished from the source", async () => {
    const s = setup({ method: "html" });
    stubAdapter("html", [item("A"), item("B", { day_of_week: 3 })], false);
    await runSource(s, store, ctx, { now: NOW });
    db.listings.forEach((l) => (l.status = "approved"));
    vi.restoreAllMocks();
    stubAdapter("html", [item("A")], false);
    const r = await runSource({ ...s, last_count: 2 }, store, ctx, { now: NOW });
    expect(r.missing).toBe(1);
    expect(db.listings.find((l) => l.name === "B")!.missing_since).toBe(NOW.toISOString());
  });

  it("dry runs save nothing", async () => {
    const s = setup({ method: "html" });
    stubAdapter("html", [item("A")], false);
    const r = await runSource(s, store, ctx, { now: NOW, dryRun: true });
    expect(r.preview).toHaveLength(1);
    expect(db.listings).toHaveLength(0);
    expect(db.sources[0].last_run_at).toBeNull();
  });
});

describe("isDue", () => {
  it("respects frequency and active flag", () => {
    const now = new Date("2026-10-08T10:00:00Z");
    expect(isDue(makeSource({ last_run_at: null }), now)).toBe(true);
    expect(isDue(makeSource({ last_run_at: "2026-10-07T10:00:00Z" }), now)).toBe(true);
    expect(isDue(makeSource({ check_frequency: "weekly", last_run_at: "2026-10-05T10:00:00Z" }), now)).toBe(false);
    expect(isDue(makeSource({ active: false }), now)).toBe(false);
  });
});
