import { z } from "zod";

/**
 * What every collector returns, before normalising. Mirrors the extraction
 * schema given to Claude: anything not explicitly on the page is null.
 */
export const ExtractedListingSchema = z.object({
  name: z.string().describe("Class or event name as shown on the page"),
  // Free text rather than an enum so one odd value can't fail the whole page;
  // normalizeExtracted() keeps only the known types.
  type: z
    .string()
    .nullable()
    .describe('One of "music", "yoga", "storytime", "support", "play" — only if clear from the page'),
  day_of_week: z
    .number()
    .int()
    .nullable()
    .describe("0=Sunday … 6=Saturday, for weekly classes"),
  date: z.string().nullable().describe("YYYY-MM-DD for a one-off event or a specific session"),
  recurring_weekly: z.boolean().nullable().describe("True if the page says it repeats every week"),
  start_time: z.string().nullable().describe("Start time exactly as shown, e.g. 10:30am"),
  end_time: z.string().nullable().describe("End time exactly as shown"),
  series_start: z.string().nullable().describe("YYYY-MM-DD first session of a series"),
  series_end: z.string().nullable().describe("YYYY-MM-DD last session of a series"),
  location: z.string().nullable().describe("Venue / room name"),
  address: z.string().nullable().describe("Street address if shown"),
  neighborhood: z.string().nullable().describe("San Francisco neighborhood if stated"),
  ages: z.string().nullable().describe("Ages exactly as described, e.g. 0-12 months"),
  price: z.string().nullable().describe("Price as shown, e.g. Free or $180"),
  price_details: z.string().nullable().describe("What the price covers, e.g. per 6-week series"),
  is_free: z.boolean().nullable().describe("True only if the page says it is free"),
  availability: z.string().nullable().describe("e.g. open, full, waitlist — only if shown"),
  description: z
    .string()
    .nullable()
    .describe("A factual summary in your own words, max 25 words. Never copy sentences."),
  url: z.string().nullable().describe("Link to this class's page or booking page if shown"),
});

export type ExtractedListing = z.infer<typeof ExtractedListingSchema>;

export const ExtractionResultSchema = z.object({
  listings: z.array(ExtractedListingSchema),
});

/** Convenience for adapters that build items by hand. */
export function emptyExtracted(name: string): ExtractedListing {
  return {
    name,
    type: null,
    day_of_week: null,
    date: null,
    recurring_weekly: null,
    start_time: null,
    end_time: null,
    series_start: null,
    series_end: null,
    location: null,
    address: null,
    neighborhood: null,
    ages: null,
    price: null,
    price_details: null,
    is_free: null,
    availability: null,
    description: null,
    url: null,
  };
}
