import ICAL from "ical.js";
import { CLASS_TYPE_LABELS, TIME_ZONE } from "../../constants";
import type { Source } from "../../types";
import { addDays } from "../../time";
import { classifyType, guessNeighborhood } from "../normalize";
import { emptyExtracted, type ExtractedListing } from "../schema";
import type { Adapter, CollectResult } from "./types";

/**
 * iCalendar feeds (library calendars, Google Calendar "public address in iCal
 * format", most booking tools). Options:
 *   categories: only keep events in any of these CATEGORIES
 *   keywords:   only keep events whose title/description/categories mention one
 *   horizonDays: how far ahead to read (default 60)
 */
export const icsAdapter: Adapter = {
  method: "ics",
  async collect(source, ctx) {
    const text = await ctx.fetcher.getText(source.url, { headers: { Accept: "text/calendar" } });
    return parseIcs(text, source, ctx.today);
  },
};

export interface Occurrence {
  name: string;
  date: string;
  start: string | null;
  end: string | null;
  location: string | null;
  description: string;
  categories: string[];
  url: string | null;
  weeklyUntil?: string | null;
  weekly?: boolean;
}

const sfParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Wall-clock date/time in San Francisco for an ICAL.Time. */
function sfWallClock(t: ICAL.Time): { date: string; time: string | null } {
  if (t.isDate) return { date: t.toString().slice(0, 10), time: null };
  const tz = t.zone?.tzid;
  if (tz === "UTC" || tz === "Z") {
    const p = Object.fromEntries(sfParts.formatToParts(t.toJSDate()).map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
  }
  // Floating or TZID time: assume the feed uses local San Francisco time.
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${t.year}-${pad(t.month)}-${pad(t.day)}`, time: `${pad(t.hour)}:${pad(t.minute)}` };
}

export function parseIcs(text: string, source: Pick<Source, "options" | "neighborhood" | "url">, today: string): CollectResult {
  const opts = source.options as { categories?: string[]; keywords?: string[]; horizonDays?: number };
  const horizon = addDays(today, opts.horizonDays ?? 60);
  const root = new ICAL.Component(ICAL.parse(text));
  const occurrences: Occurrence[] = [];

  for (const vevent of root.getAllSubcomponents("vevent")) {
    const ev = new ICAL.Event(vevent);
    if (vevent.getFirstPropertyValue("status") === "CANCELLED") continue;
    const categories = vevent
      .getAllProperties("categories")
      .flatMap((p) => p.getValues())
      .map((c) => String(c).trim());
    const name = (ev.summary ?? "").trim();
    if (!name) continue;
    const description = (ev.description ?? "").trim();

    if (opts.categories?.length) {
      const wanted = opts.categories.map((c) => c.toLowerCase());
      if (!categories.some((c) => wanted.includes(c.toLowerCase()))) continue;
    }
    if (opts.keywords?.length) {
      const hay = `${name} ${description} ${categories.join(" ")}`.toLowerCase();
      if (!opts.keywords.some((k) => hay.includes(k.toLowerCase()))) continue;
    }

    const start = sfWallClock(ev.startDate);
    const end = ev.endDate ? sfWallClock(ev.endDate) : null;
    const base = {
      name,
      start: start.time,
      end: end?.time ?? null,
      location: ev.location?.trim() || null,
      description,
      categories,
      url: (vevent.getFirstPropertyValue("url") as string | null) ?? null,
    };

    const rrule = vevent.getFirstPropertyValue("rrule") as ICAL.Recur | null;
    if (rrule && rrule.freq === "WEEKLY" && (rrule.interval ?? 1) === 1) {
      const until = rrule.until ? sfWallClock(rrule.until).date : null;
      if (until && until < today) continue;
      occurrences.push({ ...base, date: start.date, weekly: true, weeklyUntil: until });
    } else if (ev.isRecurring()) {
      // Other recurrence patterns: expand into individual dates.
      const it = ev.iterator();
      for (let next = it.next(), n = 0; next && n < 200; next = it.next(), n++) {
        const d = sfWallClock(next).date;
        if (d > horizon) break;
        if (d >= today) occurrences.push({ ...base, date: d });
      }
    } else if (start.date >= today && start.date <= horizon) {
      occurrences.push({ ...base, date: start.date });
    }
  }

  return { items: groupOccurrences(occurrences, source), structured: true, notes: [] };
}

const dow = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/**
 * Library feeds often publish one event per week instead of a rule. Events
 * with the same name, place, weekday and time become one weekly listing.
 */
export function groupOccurrences(occ: Occurrence[], source: Pick<Source, "neighborhood" | "url">): ExtractedListing[] {
  const groups = new Map<string, Occurrence[]>();
  for (const o of occ) {
    const key = o.weekly ? `rrule|${o.name}|${o.date}|${o.start}` : `${o.name}|${o.location}|${dow(o.date)}|${o.start}`;
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  return [...groups.values()].map((list) => {
    list.sort((a, b) => a.date.localeCompare(b.date));
    const first = list[0];
    const weekly = first.weekly || list.length >= 2;
    const type = classifyType(first.name, first.categories.join(" "));
    const ages = first.categories.filter((c) => /bab|toddler|famil|preschool|infant/i.test(c)).join(", ") || null;
    return {
      ...emptyExtracted(first.name),
      type,
      day_of_week: dow(first.date),
      date: weekly ? null : first.date,
      recurring_weekly: weekly,
      start_time: first.start,
      end_time: first.end,
      series_start: first.weekly ? first.date : null,
      series_end: first.weekly ? (first.weeklyUntil ?? null) : null,
      location: first.location,
      neighborhood: guessNeighborhood(first.location ?? "") ?? source.neighborhood,
      ages,
      is_free: /\bfree\b/i.test(first.description) ? true : null,
      price: /\bfree\b/i.test(first.description) ? "Free" : null,
      // Our own factual line, never the feed's (possibly copyrighted) text.
      description: [type ? CLASS_TYPE_LABELS[type] : "Event", first.location ? `at ${first.location}` : null, ages ? `for ${ages.toLowerCase()}` : null]
        .filter(Boolean)
        .join(" ") + ".",
      url: first.url ?? source.url,
    };
  });
}

