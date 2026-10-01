import { AGE_BANDS, type AgeBandId, type ClassType } from "../constants";
import { fromDb } from "../pipeline/store";
import { addDays, isEnded, isFresh, nextOccurrence, sfToday, timeToMinutes, verifiedDaysAgo } from "../time";
import type { Listing, ListingFields, PublicListing } from "../types";

export const PUBLIC_COLUMNS =
  "id, provider, name, type, day_of_week, date, start_time, end_time, series_start, series_end, location_name, address, neighborhood, ages_text, age_min_months, age_max_months, is_free, price, price_details, availability, description, url, last_verified_at";

type PublicRow = ListingFields & Pick<Listing, "id" | "provider" | "last_verified_at">;

/** Add the computed bits a card needs; drop classes that have finished for good. */
export function toPublic(rows: PublicRow[], now: Date = new Date()): PublicListing[] {
  return rows
    .map((r) => fromDb(r))
    .filter((l) => !isEnded(l, now))
    .map((l) => {
      const hasSchedule = !!l.start_time && (l.day_of_week !== null || !!l.date);
      const showTimes = hasSchedule && isFresh(l.last_verified_at, now);
      return {
        ...l,
        showTimes,
        nextDate: showTimes ? nextOccurrence(l, now) : null,
        verifiedDaysAgo: verifiedDaysAgo(l.last_verified_at, now),
      };
    });
}

export interface Filters {
  hood?: string;
  age?: AgeBandId;
  type?: ClassType;
  price?: "free" | "paid";
  when?: "week";
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): Filters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const f: Filters = {};
  const hood = one("hood");
  if (hood && /^[a-z-]{2,40}$/.test(hood)) f.hood = hood;
  const age = one("age");
  if (AGE_BANDS.some((b) => b.id === age)) f.age = age as AgeBandId;
  const type = one("type");
  if (type && ["music", "yoga", "storytime", "support", "play"].includes(type)) f.type = type as ClassType;
  const price = one("price");
  if (price === "free" || price === "paid") f.price = price;
  if (one("when") === "week") f.when = "week";
  return f;
}

export function filterListings(list: PublicListing[], f: Filters, now: Date = new Date()): PublicListing[] {
  const band = f.age ? AGE_BANDS.find((b) => b.id === f.age) : undefined;
  const weekEnd = addDays(sfToday(now), 6);
  return list.filter((l) => {
    if (f.hood && l.neighborhood !== f.hood) return false;
    if (f.type && l.type !== f.type) return false;
    if (f.price === "free" && l.is_free !== true) return false;
    if (f.price === "paid" && l.is_free !== false) return false;
    if (band) {
      // Unknown ages stay in: we'd rather show "check ages" than hide a class.
      if (l.age_min_months !== null && l.age_min_months >= band.max) return false;
      if (l.age_max_months !== null && l.age_max_months < band.min) return false;
    }
    if (f.when === "week" && (!l.nextDate || l.nextDate > weekEnd)) return false;
    return true;
  });
}

/** Soonest first; "check times" listings after, alphabetically. */
export function sortListings(list: PublicListing[]): PublicListing[] {
  return [...list].sort((a, b) => {
    if (a.nextDate && b.nextDate) {
      return a.nextDate.localeCompare(b.nextDate) || (timeToMinutes(a.start_time) ?? 0) - (timeToMinutes(b.start_time) ?? 0);
    }
    if (a.nextDate) return -1;
    if (b.nextDate) return 1;
    return a.name.localeCompare(b.name);
  });
}
