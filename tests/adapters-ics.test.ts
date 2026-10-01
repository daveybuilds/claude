import { describe, expect, it } from "vitest";
import { icsAdapter, parseIcs } from "@/lib/pipeline/adapters/ics";
import { fixture, fixtureFetcher, makeCtx, makeSource, TODAY } from "./helpers";

const source = makeSource({ method: "ics", url: "https://sfpl.example/marina.ics", options: { categories: ["Babies", "Toddlers", "Families"] } });

describe("ics adapter", () => {
  it("fetches the feed with a clear user agent and returns structured items", async () => {
    const { fetcher, requests } = fixtureFetcher({
      "https://sfpl.example/robots.txt": "User-agent: *\nDisallow: /private",
      "https://sfpl.example/marina.ics": fixture("sfpl-branch.ics"),
    });
    const result = await icsAdapter.collect(source, makeCtx(fetcher));
    expect(result.structured).toBe(true);
    expect(requests.map((r) => r.url)).toEqual(["https://sfpl.example/robots.txt", "https://sfpl.example/marina.ics"]);
    expect(requests[1].headers["User-Agent"]).toMatch(/LittleSFBot.*test@example\.com/);
  });

  it("groups weekly one-off events into one weekly listing", () => {
    const { items } = parseIcs(fixture("sfpl-branch.ics"), source, TODAY);
    const story = items.find((i) => i.name === "Storytime for Families")!;
    expect(story).toMatchObject({ day_of_week: 2, date: null, recurring_weekly: true, start_time: "10:30", end_time: "11:00", type: "storytime", is_free: true });
    expect(story.location).toBe("Marina Branch Library");
    // Our own summary, never the feed's text.
    expect(story.description).not.toContain("Join us");
  });

  it("converts UTC times to San Francisco time and keeps single events as dated", () => {
    const { items } = parseIcs(fixture("sfpl-branch.ics"), source, TODAY);
    const rhyme = items.find((i) => i.name === "Baby Rhyme Time")!;
    expect(rhyme).toMatchObject({ date: "2026-10-08", start_time: "11:00", end_time: "11:30", neighborhood: "richmond" });
  });

  it("reads weekly RRULEs as a series", () => {
    const { items } = parseIcs(fixture("sfpl-branch.ics"), source, TODAY);
    const music = items.find((i) => i.name === "Toddler Music & Movement")!;
    expect(music).toMatchObject({ day_of_week: 5, series_start: "2026-10-02", series_end: "2026-12-18", start_time: "09:30", type: "music" });
  });

  it("drops other categories, past and cancelled events", () => {
    const names = parseIcs(fixture("sfpl-branch.ics"), source, TODAY).items.map((i) => i.name);
    expect(names).not.toContain("Mystery Book Club");
    expect(names).not.toContain("Storytime for Families (past)");
    expect(names).not.toContain("Cancelled Baby Storytime");
    expect(names).toHaveLength(3);
  });

  it("refuses to fetch what robots.txt disallows", async () => {
    const { fetcher } = fixtureFetcher({ "https://sfpl.example/robots.txt": "User-agent: *\nDisallow: /", "https://sfpl.example/marina.ics": "x" });
    await expect(icsAdapter.collect(source, makeCtx(fetcher))).rejects.toThrow(/robots\.txt disallows/);
  });
});
