import { describe, expect, it } from "vitest";
import { apiAdapter, isoToSf, parseEventbrite } from "@/lib/pipeline/adapters/api";
import { fixture, fixtureFetcher, makeCtx, makeSource, TODAY } from "./helpers";

describe("api adapter — generic JSON", () => {
  const source = makeSource({
    method: "api",
    url: "https://booking.example/api/events.json",
    neighborhood: "laurel-heights",
    options: {
      kind: "json",
      itemsPath: "data.events",
      fields: { name: "title", start: "starts", end: "ends", location: "venue.name", price: "price", url: "link" },
      keywords: ["baby", "crawl"],
    },
  });

  it("maps fields, filters by keyword and groups weekly sessions", async () => {
    const { fetcher } = fixtureFetcher({ "https://booking.example/api/events.json": fixture("booking-feed.json") });
    const { items, structured } = await apiAdapter.collect(source, makeCtx(fetcher));
    expect(structured).toBe(true);
    expect(items.map((i) => i.name).sort()).toEqual(["Baby & Me Yoga", "Open Gym for Crawlers"]);
    const yoga = items.find((i) => i.name === "Baby & Me Yoga")!;
    expect(yoga).toMatchObject({ day_of_week: 3, date: null, start_time: "10:00", end_time: "11:20", price: "$30", type: "yoga", location: "JCC San Francisco" });
    const gym = items.find((i) => i.name === "Open Gym for Crawlers")!;
    expect(gym).toMatchObject({ date: "2026-10-09", start_time: "09:00", is_free: true, type: "play" });
  });

  it("fails clearly when the items path is wrong", async () => {
    const { fetcher } = fixtureFetcher({ "https://booking.example/api/events.json": "{}" });
    await expect(apiAdapter.collect(source, makeCtx(fetcher))).rejects.toThrow(/No array/);
  });
});

describe("api adapter — Eventbrite", () => {
  const source = makeSource({ method: "api", options: { kind: "eventbrite", organizerIds: ["42"], keywords: ["baby", "infant", "mom"] } });

  it("calls the organiser endpoint with the token and maps events", async () => {
    const url = "https://www.eventbriteapi.com/v3/organizers/42/events/?status=live&expand=venue,ticket_availability";
    const { fetcher, requests } = fixtureFetcher({ [url]: fixture("eventbrite-organizer.json") });
    const ctx = { ...makeCtx(fetcher), env: { eventbriteToken: "tok" } };
    const { items } = await apiAdapter.collect(source, ctx);
    expect(requests[0].headers.Authorization).toBe("Bearer tok");
    expect(items.map((i) => i.name)).toEqual(["Mom and Baby Picnic in the Presidio", "Infant CPR Class"]);
    expect(items[0]).toMatchObject({ date: "2026-10-10", start_time: "11:00", price: "Free", is_free: true, neighborhood: "presidio" });
    expect(items[1]).toMatchObject({ price: "$45.00", availability: "full" });
  });

  it("needs a token", async () => {
    const { fetcher } = fixtureFetcher({});
    await expect(apiAdapter.collect(source, makeCtx(fetcher))).rejects.toThrow(/EVENTBRITE_TOKEN/);
  });

  it("parses without network", () => {
    const { items } = parseEventbrite(JSON.parse(fixture("eventbrite-organizer.json")).events, source, TODAY, ["picnic"]);
    expect(items).toHaveLength(1);
  });
});

describe("isoToSf", () => {
  it("handles offsets, UTC and local times", () => {
    expect(isoToSf("2026-10-06T17:30:00Z")).toEqual({ date: "2026-10-06", time: "10:30" });
    expect(isoToSf("2026-10-06T10:30:00-07:00")).toEqual({ date: "2026-10-06", time: "10:30" });
    expect(isoToSf("2026-10-06T10:30:00")).toEqual({ date: "2026-10-06", time: "10:30" });
    expect(isoToSf("2026-10-06")).toEqual({ date: "2026-10-06", time: null });
  });
});
