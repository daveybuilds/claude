import { describe, expect, it } from "vitest";
import { manualAdapter, parseCsv, parseListingsCsv } from "@/lib/pipeline/adapters/manual";
import { fixture, fixtureFetcher, makeCtx, makeSource } from "./helpers";

describe("manual adapter", () => {
  it("never fetches anything", async () => {
    const { fetcher, requests } = fixtureFetcher({});
    const result = await manualAdapter.collect(makeSource({ method: "manual" }), makeCtx(fetcher));
    expect(result.skipped).toBe(true);
    expect(requests).toHaveLength(0);
  });

  it("parses quoted CSV fields", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\r\n')).toEqual([["a", "b"], ["x, y", 'say "hi"']]);
  });

  it("reads the admin CSV format, reporting bad rows", () => {
    const { rows, errors } = parseListingsCsv(fixture("manual-listings.csv"));
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ source: "jamaroo-kids", item: { name: "Baby Music & Movement", type: "music", day_of_week: 4, start_time: "9:30am", price_details: "drop-in, first class free" } });
    expect(rows[1].item).toMatchObject({ name: 'Parent Circle, "Newborns"', day_of_week: 3, price: "Free" });
    expect(rows[2].source).toBeNull();
    expect(errors).toEqual(["Row 5: missing name"]);
  });

  it("rejects files without a name column", () => {
    expect(parseListingsCsv("title,day\nx,Monday").errors[0]).toMatch(/name/);
  });
});
