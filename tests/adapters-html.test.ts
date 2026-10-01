import { describe, expect, it, vi } from "vitest";
import { htmlAdapter, parseJsonLdEvents, sliceBetween } from "@/lib/pipeline/adapters/html";
import { groundListing, htmlToText } from "@/lib/pipeline/extract";
import { emptyExtracted, type ExtractedListing } from "@/lib/pipeline/schema";
import { fixture, fixtureFetcher, makeCtx, makeSource, TODAY } from "./helpers";

const PAGE = "https://www.sfmusictogether.example/classes.aspx";
const source = makeSource({ url: PAGE, provider: "Music Together", neighborhood: null });

/** What Claude would return for the sample page (one item deliberately invents data). */
const extracted: ExtractedListing[] = [
  {
    ...emptyExtracted("Music Together — Fort Mason"),
    type: "music",
    day_of_week: 1,
    recurring_weekly: true,
    start_time: "5:00pm",
    end_time: "5:45pm",
    series_start: "2026-10-19",
    series_end: "2026-12-14",
    location: "Fort Mason Building C, Room C230",
    ages: "Mixed ages 0-5",
    price: "$273–$298",
    availability: "full, waitlist",
    description: "Mixed-age family music class.",
  },
  {
    ...emptyExtracted("Music Together — Noe Valley"),
    day_of_week: 6,
    start_time: "9:30am",
    end_time: "10:15am",
    location: "Noe Valley Ministry",
    ages: "Babies 0-8 months",
    price: "$150", // not on the page: must be removed
    availability: "Open",
  },
];

describe("html adapter", () => {
  it("strips scripts, styles, nav and footer before extraction", () => {
    const text = htmlToText(fixture("music-together-classes.html"));
    expect(text).toContain("Fort Mason Building C, Room C230");
    expect(text).toContain("Tuition $273–$298");
    expect(text).not.toContain("tracking");
    expect(text).not.toContain("About");
    expect(text).not.toContain("Fake St");
  });

  it("sends page text to the extractor and grounds the result", async () => {
    const { fetcher } = fixtureFetcher({ [PAGE]: fixture("music-together-classes.html") });
    const extract = vi.fn(async () => extracted);
    const result = await htmlAdapter.collect(source, makeCtx(fetcher, extract));
    expect(extract).toHaveBeenCalledOnce();
    const call = (extract.mock.calls[0] as unknown as [{ text: string; url: string }])[0];
    expect(call.url).toBe(PAGE);
    expect(call.text).toContain("5:00-5:45 pm");
    expect(result.structured).toBe(false);
    expect(result.items[0]).toMatchObject({ start_time: "5:00pm", price: "$273–$298" });
    expect(result.items[1].price).toBeNull();
    expect(result.notes.join(" ")).toMatch(/Noe Valley.*removed price/);
  });

  it("needs an Anthropic key for text pages", async () => {
    const { fetcher } = fixtureFetcher({ [PAGE]: fixture("music-together-classes.html") });
    await expect(htmlAdapter.collect(source, makeCtx(fetcher, null))).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });

  it("prefers schema.org event data when the page has it (no AI call)", async () => {
    const url = "https://kinspace.example/mama-babe";
    const { fetcher } = fixtureFetcher({ [url]: fixture("jsonld-events.html") });
    const extract = vi.fn();
    const result = await htmlAdapter.collect(makeSource({ url, neighborhood: "cow-hollow" }), makeCtx(fetcher, extract));
    expect(extract).not.toHaveBeenCalled();
    expect(result.structured).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ name: "Mama + Babe: Spring Babies", day_of_week: 4, date: null, start_time: "10:00", end_time: "11:30", location: "Kinspace, 2154 Union St" });
    expect(result.items[1]).toMatchObject({ name: "Free Baby Massage Workshop", date: "2026-10-20", is_free: true });
  });

  it("parses JSON-LD with keyword filters", () => {
    const items = parseJsonLdEvents(fixture("jsonld-events.html"), makeSource({ options: { keywords: ["massage"] } }), TODAY);
    expect(items.map((i) => i.name)).toEqual(["Free Baby Massage Workshop"]);
  });

  it("can read just part of a page", () => {
    expect(sliceBetween("intro START the classes END outro", { startMarker: "start", endMarker: "end" })).toBe("START the classes ");
  });
});

describe("grounding check", () => {
  const text = "Storytime Tuesdays 10:30-11 am. Family music Saturdays 9am. Cost $25. Free for members.";
  it("keeps times and prices that appear on the page", () => {
    const { item, dropped } = groundListing({ ...emptyExtracted("x"), start_time: "10:30am", end_time: "11:00am", price: "$25" }, text);
    expect(dropped).toEqual([]);
    expect(item.end_time).toBe("11:00am");
  });
  it("removes invented times and prices", () => {
    const { item, dropped } = groundListing({ ...emptyExtracted("x"), start_time: "2:15pm", price: "$40", is_free: null }, text);
    expect(item.start_time).toBeNull();
    expect(item.price).toBeNull();
    expect(dropped).toEqual(["start_time", "price"]);
  });
  it("accepts hour-only times like 9am", () => {
    expect(groundListing({ ...emptyExtracted("x"), start_time: "9:00" }, text).dropped).toEqual([]);
  });
});
