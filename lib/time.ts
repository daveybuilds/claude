import { FRESHNESS_DAYS, TIME_ZONE } from "./constants";
import type { Listing } from "./types";

// All schedule maths happens in San Francisco time, whatever the server's zone.

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function sfNow(now: Date = new Date()) {
  const p = Object.fromEntries(partsFmt.formatToParts(now).map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

export function sfToday(now: Date = new Date()): string {
  return sfNow(now).date;
}

/** Day of week (0 = Sunday) for a YYYY-MM-DD date. */
export function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000,
  );
}

export function timeToMinutes(t: string | null): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Minutes after the start when we treat a class as over if no end time is known. */
const DEFAULT_LENGTH = 60;

type Schedule = Pick<
  Listing,
  "day_of_week" | "date" | "start_time" | "end_time" | "series_start" | "series_end"
>;

/**
 * The next date this class happens (today counts until the class has ended).
 * Returns null when the schedule is unknown or the series is over.
 */
export function nextOccurrence(l: Schedule, now: Date = new Date()): string | null {
  const { date: today, minutes } = sfNow(now);
  const end = timeToMinutes(l.end_time) ?? (timeToMinutes(l.start_time) ?? 0) + DEFAULT_LENGTH;
  const over = (d: string) => d < today || (d === today && minutes >= end);

  if (l.date) return over(l.date) ? null : l.date;
  if (l.day_of_week == null || !l.start_time) return null;

  let from = today;
  if (l.series_start && l.series_start > from) from = l.series_start;
  let candidate = addDays(from, (l.day_of_week - dayOfWeek(from) + 7) % 7);
  if (over(candidate)) candidate = addDays(candidate, 7);
  if (l.series_end && candidate > l.series_end) return null;
  return candidate;
}

/** True when the class has definitely finished for good. */
export function isEnded(l: Schedule, now: Date = new Date()): boolean {
  const today = sfToday(now);
  if (l.date) return l.date < today;
  return !!l.series_end && l.series_end < today;
}

export function verifiedDaysAgo(lastVerifiedAt: string | null, now: Date = new Date()): number | null {
  if (!lastVerifiedAt) return null;
  return Math.max(0, daysBetween(sfToday(new Date(lastVerifiedAt)), sfToday(now)));
}

export function isFresh(lastVerifiedAt: string | null, now: Date = new Date()): boolean {
  const age = verifiedDaysAgo(lastVerifiedAt, now);
  return age !== null && age <= FRESHNESS_DAYS;
}

// ---- Display helpers ----------------------------------------------------

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function dayName(dow: number, short = false): string {
  const n = DAY_NAMES[dow] ?? "";
  return short ? n.slice(0, 3) : n;
}

export function formatTime(t: string | null): string | null {
  const m = timeToMinutes(t);
  if (m === null) return null;
  const h = Math.floor(m / 60);
  const min = m % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min ? `${h12}:${String(min).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}

export function formatTimeRange(start: string | null, end: string | null): string | null {
  const s = formatTime(start);
  if (!s) return null;
  const e = formatTime(end);
  return e ? `${s}–${e}` : s;
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    ...opts,
  });
}

/** "Today", "Tomorrow", or "Tue, Oct 6". */
export function relativeDay(date: string, now: Date = new Date()): string {
  const diff = daysBetween(sfToday(now), date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return formatDate(date);
}
