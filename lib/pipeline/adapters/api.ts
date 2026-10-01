import { TIME_ZONE } from "../../constants";
import type { Source } from "../../types";
import { addDays } from "../../time";
import { groupOccurrences, type Occurrence } from "./ics";
import type { Adapter, CollectContext, CollectResult } from "./types";

/**
 * Structured JSON sources. `options.kind` picks the flavour:
 *
 *  - "json": any public JSON endpoint, e.g. a booking widget's embed feed.
 *      itemsPath: dotted path to the array of events ("data.events")
 *      fields: { name, start, end, location, url, price, description, categories }
 *              each a dotted path inside one item; start/end are ISO date-times
 *      keywords: optional filter on name/description
 *
 *  - "eventbrite": events from specific Eventbrite organisers (their API no
 *      longer offers city-wide search). organizerIds: string[], keywords?: string[]
 *      Needs EVENTBRITE_TOKEN.
 */
export const apiAdapter: Adapter = {
  method: "api",
  async collect(source, ctx) {
    const kind = (source.options as { kind?: string }).kind ?? "json";
    if (kind === "eventbrite") return collectEventbrite(source, ctx);
    if (kind === "json") {
      const data = await ctx.fetcher.getJson(source.url, { headers: { Accept: "application/json" } });
      return parseJsonFeed(data, source, ctx.today);
    }
    throw new Error(`Unknown api kind "${kind}"`);
  },
};

export function get(obj: unknown, path: string | undefined): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

const sfParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "2026-10-06T10:30:00-07:00" → SF wall clock. No offset = already local. */
export function isoToSf(iso: string | null): { date: string; time: string | null } | null {
  if (!iso) return null;
  const local = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/.exec(iso);
  if (!local) return null;
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(iso)) return { date: local[1], time: local[2] ?? null };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = Object.fromEntries(sfParts.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

interface JsonOptions {
  itemsPath?: string;
  fields?: Partial<Record<"name" | "start" | "end" | "location" | "url" | "price" | "description" | "categories", string>>;
  keywords?: string[];
  horizonDays?: number;
}

export function parseJsonFeed(data: unknown, source: Pick<Source, "options" | "neighborhood" | "url">, today: string): CollectResult {
  const opts = source.options as JsonOptions;
  const f = opts.fields ?? {};
  const items = opts.itemsPath ? get(data, opts.itemsPath) : data;
  if (!Array.isArray(items)) throw new Error(`No array at itemsPath "${opts.itemsPath ?? ""}"`);
  const horizon = addDays(today, opts.horizonDays ?? 60);
  const occ: (Occurrence & { price: string | null })[] = [];

  for (const item of items) {
    const name = str(get(item, f.name ?? "name"));
    const start = isoToSf(str(get(item, f.start ?? "start")));
    if (!name || !start || start.date < today || start.date > horizon) continue;
    const description = str(get(item, f.description ?? "description")) ?? "";
    if (opts.keywords?.length) {
      const hay = `${name} ${description}`.toLowerCase();
      if (!opts.keywords.some((k) => hay.includes(k.toLowerCase()))) continue;
    }
    const cats = get(item, f.categories ?? "categories");
    occ.push({
      name,
      date: start.date,
      start: start.time,
      end: isoToSf(str(get(item, f.end ?? "end")))?.time ?? null,
      location: str(get(item, f.location ?? "location")),
      description,
      categories: Array.isArray(cats) ? cats.map(String) : [],
      url: str(get(item, f.url ?? "url")),
      price: str(get(item, f.price ?? "price")),
    });
  }

  const grouped = groupOccurrences(occ, source);
  // Carry explicit prices across (grouping keys on name/place/time, so the first wins).
  for (const g of grouped) {
    const match = occ.find((o) => o.name === g.name && o.price);
    if (match?.price) {
      g.price = match.price;
      g.is_free = /\bfree\b|^\$?0(\.00)?$/i.test(match.price) ? true : null;
    }
  }
  return { items: grouped, structured: true, notes: [] };
}

interface EventbriteEvent {
  name?: { text?: string };
  summary?: string;
  url?: string;
  start?: { local?: string };
  end?: { local?: string };
  is_free?: boolean;
  venue?: { name?: string; address?: { localized_address_display?: string } };
  ticket_availability?: { minimum_ticket_price?: { display?: string }; is_sold_out?: boolean };
}

async function collectEventbrite(source: Source, ctx: CollectContext): Promise<CollectResult> {
  const opts = source.options as { organizerIds?: string[]; keywords?: string[] };
  if (!ctx.env.eventbriteToken) throw new Error("EVENTBRITE_TOKEN is not set");
  if (!opts.organizerIds?.length) throw new Error("options.organizerIds is empty");
  const events: EventbriteEvent[] = [];
  for (const id of opts.organizerIds) {
    const url = `https://www.eventbriteapi.com/v3/organizers/${encodeURIComponent(id)}/events/?status=live&expand=venue,ticket_availability`;
    // Official API with a token: robots.txt governs crawlers, not API clients.
    const data = await ctx.fetcher.getJson<{ events?: EventbriteEvent[] }>(url, {
      headers: { Authorization: `Bearer ${ctx.env.eventbriteToken}` },
      skipRobots: true,
    });
    events.push(...(data.events ?? []));
  }
  return parseEventbrite(events, source, ctx.today, opts.keywords);
}

export function parseEventbrite(
  events: EventbriteEvent[],
  source: Pick<Source, "options" | "neighborhood" | "url">,
  today: string,
  keywords: string[] = [],
): CollectResult {
  const mapped = events.map((e) => ({
    name: e.name?.text,
    description: e.summary,
    url: e.url,
    start: e.start?.local,
    end: e.end?.local,
    location: [e.venue?.name, e.venue?.address?.localized_address_display].filter(Boolean).join(", ") || undefined,
    price: e.is_free ? "Free" : (e.ticket_availability?.minimum_ticket_price?.display ?? undefined),
  }));
  const result = parseJsonFeed(mapped, { ...source, options: { keywords } }, today);
  for (const item of result.items) {
    const ev = events.find((e) => e.name?.text === item.name);
    if (ev?.ticket_availability?.is_sold_out) item.availability = "full";
  }
  return result;
}
