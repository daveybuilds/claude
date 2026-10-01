import { describe, expect, it } from "vitest";
import { filterListings, toPublic } from "@/lib/data/listings";
import { checkFirstName } from "@/lib/moderation";
import { classifyType, dedupeKey, guessNeighborhood, normalizeTime, parseAges, parseIsFree } from "@/lib/pipeline/normalize";
import { parseRobots } from "@/lib/pipeline/robots";
import { SEED_LISTINGS } from "@/lib/seed";
import { formatTimeRange, isFresh, nextOccurrence } from "@/lib/time";

const at = (iso: string) => new Date(iso);

describe("nextOccurrence (San Francisco time)", () => {
  const tue = { day_of_week: 2, date: null, start_time: "10:30", end_time: "11:00", series_start: null, series_end: null };
  it("finds the next weekday", () => {
    expect(nextOccurrence(tue, at("2026-10-01T17:00:00Z"))).toBe("2026-10-06"); // Thu → Tue
  });
  it("counts today until the class ends", () => {
    expect(nextOccurrence(tue, at("2026-10-06T17:45:00Z"))).toBe("2026-10-06"); // 10:45am PT
    expect(nextOccurrence(tue, at("2026-10-06T18:05:00Z"))).toBe("2026-10-13"); // 11:05am PT
  });
  it("respects series dates", () => {
    const mt = { ...tue, day_of_week: 1, series_start: "2026-10-19", series_end: "2026-12-14" };
    expect(nextOccurrence(mt, at("2026-10-01T17:00:00Z"))).toBe("2026-10-19");
    expect(nextOccurrence(mt, at("2026-12-15T17:00:00Z"))).toBeNull();
  });
  it("uses the SF date late in the evening", () => {
    // 11pm Monday in SF is already Tuesday in UTC.
    expect(nextOccurrence(tue, at("2026-10-06T06:00:00Z"))).toBe("2026-10-06");
  });
});

describe("freshness", () => {
  it("hides times after 14 days without verification", () => {
    expect(isFresh("2026-10-01T17:00:00Z", at("2026-10-15T17:00:00Z"))).toBe(true);
    expect(isFresh("2026-10-01T17:00:00Z", at("2026-10-16T17:00:00Z"))).toBe(false);
    expect(isFresh(null)).toBe(false);
  });
  it("turns a stale listing into 'Check times' with no say-hi date", () => {
    const seed = SEED_LISTINGS.find((l) => l.name === "Family Storytime")!;
    const row = { ...seed, id: "x", provider: "SFPL" };
    expect(toPublic([row], at("2026-10-02T17:00:00Z"))[0]).toMatchObject({ showTimes: true, nextDate: "2026-10-06" });
    expect(toPublic([row], at("2026-10-20T17:00:00Z"))[0]).toMatchObject({ showTimes: false, nextDate: null });
  });
});

describe("filters", () => {
  // Only approved listings are ever public.
  const approved = SEED_LISTINGS.filter((l) => (l.status ?? "approved") === "approved");
  const list = toPublic(approved.map((l, i) => ({ ...l, id: String(i) })), at("2026-10-02T17:00:00Z"));
  it("filters by neighborhood, age, type, price and week", () => {
    expect(filterListings(list, { hood: "richmond" }).map((l) => l.name)).toEqual(["Storytime for Babies"]);
    expect(filterListings(list, { type: "yoga" }).map((l) => l.name)).toEqual(["Baby & Me Yoga"]);
    const free = filterListings(list, { price: "free" });
    expect(free.every((l) => l.is_free)).toBe(true);
    expect(filterListings(list, { age: "1-2y" }).map((l) => l.name)).not.toContain("Baby & Me Yoga");
    expect(filterListings(list, { age: "0-6m" }).map((l) => l.name)).not.toContain("Preschool Storytime");
    const week = filterListings(list, { when: "week" }, at("2026-10-02T17:00:00Z"));
    expect(week.map((l) => l.name)).not.toContain("Music Together — Fort Mason"); // starts Oct 19
  });
});

describe("normalisation", () => {
  it("normalises times", () => {
    expect(normalizeTime("10:30 AM")).toBe("10:30");
    expect(normalizeTime("3pm")).toBe("15:00");
    expect(normalizeTime("12:15 a.m.")).toBe("00:15");
    expect(normalizeTime("noon")).toBe("12:00");
    expect(normalizeTime("soon")).toBeNull();
    expect(formatTimeRange("10:30", "11:00")).toBe("10:30am–11am");
  });
  it("parses ages", () => {
    expect(parseAges("0-12 months")).toEqual({ min: 0, max: 12 });
    expect(parseAges("ages 1-2 years")).toEqual({ min: 12, max: 24 });
    expect(parseAges("6 weeks to pre-crawling")).toEqual({ min: 1, max: 8 });
    expect(parseAges("all welcome")).toEqual({ min: null, max: null });
  });
  it("only calls something free when it says so", () => {
    expect(parseIsFree("Free")).toBe(true);
    expect(parseIsFree("$180 per 6 weeks")).toBe(false);
    expect(parseIsFree("Donation")).toBeNull();
  });
  it("classifies and locates", () => {
    expect(classifyType("Baby & Me Yoga")).toBe("yoga");
    expect(classifyType("Mama + Babe group")).toBe("support");
    expect(guessNeighborhood("Anza Branch Library")).toBe("richmond");
    expect(guessNeighborhood("Mission Bay Library")).toBe("soma");
  });
  it("builds stable dedupe keys", () => {
    const a = dedupeKey("SFPL", { name: "Family Storytime!", day_of_week: 2, date: null, start_time: "10:30" });
    const b = dedupeKey("sfpl", { name: "family  storytime", day_of_week: 2, date: null, start_time: "10:30" });
    expect(a).toBe(b);
    expect(a).toBe("sfpl|family-storytime|d2|10:30");
  });
});

describe("robots.txt", () => {
  const txt = `User-agent: *\nDisallow: /admin\nAllow: /admin/public\nCrawl-delay: 5\n\nUser-agent: LittleSFBot\nDisallow: /calendar/*.ics$\n`;
  it("uses our own group when one exists", () => {
    const r = parseRobots(txt, "LittleSFBot/1.0 (+contact)");
    expect(r.isAllowed("/calendar/feed.ics")).toBe(false);
    expect(r.isAllowed("/calendar/feed.ics?x=1")).toBe(true);
    expect(r.isAllowed("/admin")).toBe(true);
  });
  it("falls back to * with longest-match and crawl delay", () => {
    const r = parseRobots(txt, "OtherBot/1.0");
    expect(r.isAllowed("/admin/secret")).toBe(false);
    expect(r.isAllowed("/admin/public/page")).toBe(true);
    expect(r.crawlDelaySeconds).toBe(5);
  });
});

describe("first-name moderation", () => {
  it("accepts simple first names, capitalised", () => {
    expect(checkFirstName(" ana ")).toEqual({ ok: true, name: "Ana" });
    expect(checkFirstName("Zoë")).toEqual({ ok: true, name: "Zoë" });
    expect(checkFirstName("Cassidy").ok).toBe(true);
  });
  it("rejects non-letters, long names and blocked words", () => {
    expect(checkFirstName("Ana Smith").ok).toBe(false);
    expect(checkFirstName("<script>").ok).toBe(false);
    expect(checkFirstName("A".repeat(21)).ok).toBe(false);
    expect(checkFirstName("Bitchy").ok).toBe(false);
    expect(checkFirstName("ass").ok).toBe(false);
  });
});

describe("polite fetcher", () => {
  it("treats a missing robots.txt as allowed and an unreachable one as off-limits", async () => {
    const { fixtureFetcher } = await import("./helpers");
    const missing = fixtureFetcher({ "https://a.example/page": "hi" });
    await expect(missing.fetcher.getText("https://a.example/page")).resolves.toBe("hi");
    const down = fixtureFetcher({ "https://b.example/robots.txt": { status: 503 }, "https://b.example/page": "hi" });
    await expect(down.fetcher.getText("https://b.example/page")).rejects.toThrow(/robots/);
  });
});

describe("seed data", () => {
  it("never gives two listings the same de-duplication key", async () => {
    const { SEED_LISTINGS, SEED_SOURCES, seedDedupeKey } = await import("@/lib/seed");
    const keys = SEED_LISTINGS.map(seedDedupeKey);
    expect(new Set(keys).size).toBe(keys.length);
    const slugs = new Set(SEED_SOURCES.map((s) => s.slug));
    for (const l of SEED_LISTINGS) expect(slugs.has(l.source_slug)).toBe(true);
  });
  it("sends researched listings to the review queue, unverified", async () => {
    const { SEED_LISTINGS } = await import("@/lib/seed");
    const pending = SEED_LISTINGS.filter((l) => l.status === "pending");
    expect(pending).toHaveLength(12);
    expect(pending.every((l) => l.last_verified_at === null && l.review_note)).toBe(true);
  });
});
