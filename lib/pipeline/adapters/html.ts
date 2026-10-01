import type { Source } from "../../types";
import { decodeEntities, groundListing, htmlToText, MAX_TEXT_CHARS } from "../extract";
import type { ExtractedListing } from "../schema";
import { isoToSf } from "./api";
import { groupOccurrences, type Occurrence } from "./ics";
import type { Adapter, CollectContext, CollectResult } from "./types";

/**
 * Plain HTML pages. First looks for schema.org Event data embedded in the
 * page (JSON-LD) — structured, no AI needed. Otherwise turns the page into
 * text and asks Claude to extract listings, then checks every time and price
 * against the page text. Options:
 *   startMarker / endMarker: only read the text between these phrases
 *   keywords: for JSON-LD events, only keep ones mentioning one of these
 */
export const htmlAdapter: Adapter = {
  method: "html",
  async collect(source, ctx) {
    const html = await ctx.fetcher.getText(source.url, { headers: { Accept: "text/html" } });
    const structured = parseJsonLdEvents(html, source, ctx.today);
    if (structured.length) return { items: structured, structured: true, notes: ["Used schema.org event data on the page"] };
    return extractFromText(htmlToText(html), source, ctx);
  },
};

/** Shared by the HTML and Playwright adapters. */
export async function extractFromText(fullText: string, source: Source, ctx: CollectContext): Promise<CollectResult> {
  if (!ctx.extract) throw new Error("ANTHROPIC_API_KEY is not set, so page text can't be turned into listings");
  const notes: string[] = [];
  let text = sliceBetween(fullText, source.options as { startMarker?: string; endMarker?: string });
  if (text.length > MAX_TEXT_CHARS) {
    notes.push(`Page text was ${text.length} characters; only the first ${MAX_TEXT_CHARS} were read. Consider setting startMarker/endMarker.`);
    text = text.slice(0, MAX_TEXT_CHARS);
  }
  const raw = await ctx.extract({ text, url: source.url, sourceName: source.name, notes: source.parser_notes });
  const items: ExtractedListing[] = [];
  for (const r of raw) {
    const { item, dropped } = groundListing(r, text);
    if (dropped.length) notes.push(`"${item.name}": removed ${dropped.join(", ")} not found on the page`);
    items.push(item);
  }
  return { items, structured: false, notes };
}

export function sliceBetween(text: string, opts: { startMarker?: string; endMarker?: string }): string {
  let out = text;
  if (opts.startMarker) {
    const i = out.toLowerCase().indexOf(opts.startMarker.toLowerCase());
    if (i >= 0) out = out.slice(i);
  }
  if (opts.endMarker) {
    const j = out.toLowerCase().indexOf(opts.endMarker.toLowerCase(), 1);
    if (j >= 0) out = out.slice(0, j);
  }
  return out;
}

type Json = Record<string, unknown>;

function flatten(node: unknown): Json[] {
  if (Array.isArray(node)) return node.flatMap(flatten);
  if (node && typeof node === "object") {
    const o = node as Json;
    return [o, ...(o["@graph"] ? flatten(o["@graph"]) : [])];
  }
  return [];
}

const isEvent = (o: Json) => {
  const t = o["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === "string" && /Event$/.test(x));
};

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? decodeEntities(v.trim()) : null);

export function parseJsonLdEvents(html: string, source: Pick<Source, "options" | "neighborhood" | "url">, today: string): ExtractedListing[] {
  const keywords = (source.options as { keywords?: string[] }).keywords ?? [];
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const occ: Occurrence[] = [];
  for (const [, body] of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      continue;
    }
    for (const ev of flatten(parsed).filter(isEvent)) {
      const name = text(ev.name);
      const start = isoToSf(text(ev.startDate));
      if (!name || !start || start.date < today) continue;
      const description = text(ev.description) ?? "";
      if (keywords.length && !keywords.some((k) => `${name} ${description}`.toLowerCase().includes(k.toLowerCase()))) continue;
      const loc = ev.location as Json | undefined;
      const address = loc?.address;
      const offers = (Array.isArray(ev.offers) ? ev.offers[0] : ev.offers) as Json | undefined;
      const free = ev.isAccessibleForFree === true || offers?.price === 0 || offers?.price === "0";
      occ.push({
        name,
        date: start.date,
        start: start.time,
        end: isoToSf(text(ev.endDate))?.time ?? null,
        location: [text(loc?.name), typeof address === "string" ? address : text((address as Json | undefined)?.streetAddress)]
          .filter(Boolean)
          .join(", ") || null,
        description: free ? "free" : "",
        categories: [],
        url: text(ev.url),
      });
    }
  }
  return groupOccurrences(occ, source);
}
