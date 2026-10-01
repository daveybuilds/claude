import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ExtractionResultSchema, type ExtractedListing } from "./schema";

export interface ExtractInput {
  text: string;
  url: string;
  sourceName: string;
  notes?: string | null;
}

/** Turns page text into listings. Swappable so tests never call the API. */
export type Extractor = (input: ExtractInput) => Promise<ExtractedListing[]>;

/** Pages longer than this are cut, and the source is flagged so you know. */
export const MAX_TEXT_CHARS = 120_000;

const SYSTEM = `You extract baby and toddler class listings (ages 0-2 and family classes) from web page text for a San Francisco parents' site.

Rules:
- Only include classes, groups or events suitable for babies or toddlers with a parent.
- Copy facts exactly as stated. If something is not explicitly on the page, use null.
- Never guess or infer times, dates or prices. A class with no stated time gets start_time null.
- One listing per distinct recurring class (name + weekday + start time) or per one-off event.
- day_of_week: 0=Sunday through 6=Saturday. Dates as YYYY-MM-DD; if the year isn't shown, use null for the date.
- description: a short factual summary in your own words (max 25 words). Never copy sentences from the page.
- If there are no suitable listings, return an empty list.`;

export function createClaudeExtractor(opts: { apiKey?: string; model: string }): Extractor {
  const client = new Anthropic({ apiKey: opts.apiKey });
  return async ({ text, url, sourceName, notes }) => {
    const response = await client.beta.messages.parse({
      model: opts.model,
      max_tokens: 16000,
      // Extraction is a well-specified task: low effort keeps it quick and cheap.
      output_config: { effort: "low", format: betaZodOutputFormat(ExtractionResultSchema) },
      // If the request is ever declined by a safety classifier, retry it on
      // the model the API picks rather than losing the run.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Source: ${sourceName}\nPage URL: ${url}\n${notes ? `Notes about this source: ${notes}\n` : ""}\n<page_text>\n${text}\n</page_text>`,
        },
      ],
    });
    if (response.stop_reason === "refusal") throw new Error("Extraction was declined by the model");
    if (response.stop_reason === "max_tokens") throw new Error("Extraction output was cut off (too many listings on one page)");
    if (!response.parsed_output) throw new Error("Extraction returned no parseable JSON");
    return response.parsed_output.listings;
  };
}

// ---------------------------------------------------------------------------
// Grounding: double-check the model didn't invent times or prices.
// ---------------------------------------------------------------------------

function timeAppears(time: string, text: string): boolean {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/i.exec(time.trim());
  if (!m) return text.includes(time);
  const h = Number(m[1]);
  const min = m[2] ?? "00";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const candidates = new Set([`${h}:${min}`, `${h12}:${min}`, `${String(h).padStart(2, "0")}:${min}`]);
  if (min === "00") {
    candidates.add(`${h12}am`).add(`${h12}pm`).add(`${h12} am`).add(`${h12} pm`).add(`${h12}a`).add(`${h12}p`);
    candidates.add(`${h12} a.m`).add(`${h12} p.m`).add(`${h12}–`).add(`${h12}-`).add(`${h12} to`).add(`${h12} –`).add(`${h12} -`);
  }
  if (h === 12 && min === "00") candidates.add("noon");
  const hay = text.toLowerCase();
  return [...candidates].some((c) => hay.includes(c.toLowerCase()));
}

function amountsAppear(price: string, text: string): boolean {
  const amounts = price.match(/\d[\d,]*(?:\.\d+)?/g);
  if (!amounts) return true; // "Free", "Donation" etc. are checked by wording
  const hay = text.replace(/,/g, "");
  return amounts.every((a) => hay.includes(a.replace(/,/g, "")));
}

/**
 * Null out any time or price that can't be found in the page text, and say
 * which fields were dropped so the admin can see it.
 */
export function groundListing(item: ExtractedListing, text: string): { item: ExtractedListing; dropped: string[] } {
  const out = { ...item };
  const dropped: string[] = [];
  for (const key of ["start_time", "end_time"] as const) {
    const v = out[key];
    if (v && !timeAppears(v, text)) {
      out[key] = null;
      dropped.push(key);
    }
  }
  if (out.price && !amountsAppear(out.price, text)) {
    out.price = null;
    out.is_free = null;
    dropped.push("price");
  }
  if (out.is_free && !/\bfree\b/i.test(text)) {
    out.is_free = null;
    dropped.push("is_free");
  }
  return { item: out, dropped };
}

// ---------------------------------------------------------------------------
// HTML → readable text
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Strip scripts, styles and markup, keeping line breaks between blocks. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<(nav|footer)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article|header|table|ul|ol|dd|dt)>/gi, "\n")
      .replace(/<(td|th)\b[^>]*>/gi, " | ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n[ \n]*/g, "\n")
    .trim();
}
