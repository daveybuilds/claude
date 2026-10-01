import { CLASS_TYPES, NEIGHBORHOODS, type ClassType } from "../constants";
import type { Availability, ListingFields, Source } from "../types";
import type { ExtractedListing } from "./schema";

export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** De-duplication key: provider + name + day (or date) + start time. */
export function dedupeKey(
  provider: string,
  f: Pick<ListingFields, "name" | "day_of_week" | "date" | "start_time">,
): string {
  const when = f.date ?? (f.day_of_week != null ? `d${f.day_of_week}` : "any");
  return [slugify(provider), slugify(f.name), when, f.start_time ?? "anytime"].join("|");
}

/** "10:30 AM", "3pm", "15:00", "noon" → "HH:MM" (24h). Null if unclear. */
export function normalizeTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase().replace(/\./g, "");
  if (s === "noon") return "12:00";
  const m = /^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm|a|p)?$/.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? "0");
  const ap = m[3];
  if (ap?.startsWith("p") && h < 12) h += 12;
  if (ap?.startsWith("a") && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const TYPE_KEYWORDS: [ClassType, RegExp][] = [
  ["storytime", /\b(story ?time|stories|rhymes|lapsit|read(ing)? aloud|book babies)\b/i],
  ["music", /\b(music|sing|song|jam|drum|rhythm|ukulele)\b/i],
  ["yoga", /\b(yoga|stretch|pilates|barre|mommy ?& ?me fitness|postnatal fitness)\b/i],
  ["support", /\b(support|circle|new (mom|parent)s?|mama ?\+? ?babe|mothers'? group|parent group|postpartum|lactation|breastfeeding)\b/i],
  ["play", /\b(play|open gym|gym|sensory|movement|tumbl)/i],
];

/** Keyword classifier for when a feed doesn't say what kind of class it is. */
export function classifyType(...texts: (string | null | undefined)[]): ClassType | null {
  const text = texts.filter(Boolean).join(" ");
  for (const [type, re] of TYPE_KEYWORDS) if (re.test(text)) return type;
  return null;
}

/**
 * Pull an age range in months out of free text such as "0–12 months",
 * "6 weeks to pre-crawling", "ages 1-2", "babies", "toddlers". Returns nulls
 * when the text doesn't say.
 */
export function parseAges(text: string | null | undefined): {
  min: number | null;
  max: number | null;
} {
  if (!text) return { min: null, max: null };
  const t = text.toLowerCase();
  const range = /(\d+(?:\.\d+)?)\s*(weeks?|wks?|months?|mos?|m|years?|yrs?|y)?\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(weeks?|wks?|months?|mos?|m|years?|yrs?|y)\b/.exec(t);
  const toMonths = (n: number, unit: string | undefined) => {
    if (!unit) return n;
    if (unit.startsWith("w")) return Math.floor(n / 4.345);
    if (unit.startsWith("y")) return n * 12;
    return n;
  };
  if (range) {
    const unit2 = range[4];
    const unit1 = range[2] ?? unit2;
    return { min: Math.round(toMonths(Number(range[1]), unit1)), max: Math.round(toMonths(Number(range[3]), unit2)) };
  }
  const single = /(\d+)\s*(weeks?|months?|years?)\s*(?:to|-|–)\s*(pre-?crawl|crawl)/.exec(t);
  if (single) return { min: Math.round(toMonths(Number(single[1]), single[2])), max: 8 };
  if (/\bnewborns?\b/.test(t) && !/toddler/.test(t)) return { min: 0, max: 6 };
  if (/\bbab(y|ies)\b/.test(t) && !/toddler|preschool/.test(t)) return { min: 0, max: 18 };
  if (/\btoddlers?\b/.test(t) && !/bab(y|ies)/.test(t)) return { min: 12, max: 36 };
  if (/\bpreschool/.test(t) && !/bab(y|ies)|toddler/.test(t)) return { min: 36, max: 60 };
  return { min: null, max: null };
}

/** Is the price text explicitly free? Unknown stays null. */
export function parseIsFree(price: string | null | undefined): boolean | null {
  if (!price) return null;
  if (/\bfree\b|\$0(\.00)?\b|no cost|no charge/i.test(price)) return true;
  if (/\$\s?\d|\d+\s?(usd|dollars)/i.test(price)) return false;
  return null;
}

export function normalizeAvailability(raw: string | null | undefined): Availability | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (/wait ?list/.test(s)) return "waitlist";
  if (/\b(full|sold out)\b/.test(s)) return "full";
  if (/\b(open|available|spots? left|register)\b/.test(s)) return "open";
  return null;
}

const NEIGHBORHOOD_ALIASES: [RegExp, string][] = [
  [/\bmarina|fort mason|chestnut st/i, "marina"],
  [/\bcow hollow|union st/i, "cow-hollow"],
  [/\bpac(ific)? heights|fillmore/i, "pacific-heights"],
  [/\blaurel heights|presidio heights|jcc/i, "laurel-heights"],
  [/\bpresidio\b/i, "presidio"],
  [/\brussian hill|north beach|polk st/i, "russian-hill"],
  [/\brichmond|anza|clement st|geary/i, "richmond"],
  [/\bsunset|parkside|ortega|irving st|judah/i, "sunset"],
  [/\bwestern addition|nopa|divisadero/i, "western-addition"],
  [/\bhaight|cole valley/i, "haight"],
  [/\bhayes valley/i, "hayes-valley"],
  [/\bmission\b(?! bay)|valencia|dolores/i, "mission"],
  [/\bnoe valley|castro|glen park/i, "noe-valley"],
  [/\bbernal/i, "bernal-heights"],
  [/\bpotrero|dogpatch/i, "potrero-hill"],
  [/\bsoma|mission bay|south park/i, "soma"],
];

export function guessNeighborhood(...texts: (string | null | undefined)[]): string | null {
  const text = texts.filter(Boolean).join(" ");
  const exact = NEIGHBORHOODS.find((n) => n.slug === text.trim().toLowerCase());
  if (exact) return exact.slug;
  for (const [re, slug] of NEIGHBORHOOD_ALIASES) if (re.test(text)) return slug;
  return null;
}

const clean = (s: string | null | undefined, max: number) => {
  if (s == null) return null;
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

/**
 * Turn an extracted item into listing fields. Only fills in what can be
 * derived from the item itself (or the source's own settings); unknowns stay null.
 */
export function normalizeExtracted(item: ExtractedListing, source: Pick<Source, "neighborhood" | "url">): ListingFields | null {
  const name = clean(item.name, 160);
  if (!name) return null;
  const date = normalizeDate(item.date);
  const dow = item.day_of_week != null && item.day_of_week >= 0 && item.day_of_week <= 6 ? item.day_of_week : null;
  const type = item.type && (CLASS_TYPES as readonly string[]).includes(item.type) ? (item.type as ClassType) : classifyType(name, item.description);
  const ages = parseAges(item.ages);
  const neighborhood =
    guessNeighborhood(item.neighborhood ?? "") ??
    guessNeighborhood(item.location ?? "", item.address ?? "") ??
    source.neighborhood;
  const price = clean(item.price, 80);
  return {
    name,
    type,
    day_of_week: date ? new Date(`${date}T12:00:00Z`).getUTCDay() : dow,
    date: date && item.recurring_weekly ? null : date,
    start_time: normalizeTime(item.start_time),
    end_time: normalizeTime(item.end_time),
    series_start: normalizeDate(item.series_start),
    series_end: normalizeDate(item.series_end),
    location_name: clean(item.location, 120),
    address: clean(item.address, 160),
    neighborhood,
    ages_text: clean(item.ages, 80),
    age_min_months: ages.min,
    age_max_months: ages.max,
    is_free: item.is_free ?? parseIsFree(price),
    price,
    price_details: clean(item.price_details, 160),
    availability: normalizeAvailability(item.availability),
    description: clean(item.description, 240),
    url: item.url?.startsWith("http") ? item.url : source.url,
  };
}
