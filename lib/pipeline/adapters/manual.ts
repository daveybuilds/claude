import { CLASS_TYPES } from "../../constants";
import { emptyExtracted, type ExtractedListing } from "../schema";
import type { Adapter } from "./types";

/**
 * Manual sources (Instagram-only studios, sites we can't or shouldn't
 * scrape). Nothing is fetched: you update these listings in the admin page,
 * either one by one or by uploading a CSV (see parseListingsCsv below).
 */
export const manualAdapter: Adapter = {
  method: "manual",
  async collect() {
    return { items: [], structured: false, notes: ["Manual source: update in the admin page or by CSV"], skipped: true };
  },
};

/** Columns accepted in an uploaded CSV. Only `name` is required. */
export const CSV_COLUMNS = [
  "source", "name", "type", "day", "date", "start_time", "end_time", "series_start", "series_end",
  "location", "address", "neighborhood", "ages", "price", "price_details", "availability", "description", "url",
] as const;

/** RFC 4180-ish CSV parser: quoted fields, escaped quotes, newlines in quotes. */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const text = input.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim()));
}

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface CsvRow {
  source: string | null;
  item: ExtractedListing;
}

/** Parse an admin CSV upload into items + per-row errors. */
export function parseListingsCsv(csv: string): { rows: CsvRow[]; errors: string[] } {
  const [header, ...lines] = parseCsv(csv);
  const errors: string[] = [];
  if (!header) return { rows: [], errors: ["The file is empty"] };
  const cols = header.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  if (!cols.includes("name")) return { rows: [], errors: ['Missing a "name" column'] };
  const unknown = cols.filter((c) => c && !(CSV_COLUMNS as readonly string[]).includes(c));
  if (unknown.length) errors.push(`Ignored unknown columns: ${unknown.join(", ")}`);

  const rows: CsvRow[] = [];
  lines.forEach((line, idx) => {
    const v = (col: string) => {
      const i = cols.indexOf(col);
      const s = i >= 0 ? line[i]?.trim() : "";
      return s ? s : null;
    };
    const name = v("name");
    if (!name) {
      errors.push(`Row ${idx + 2}: missing name`);
      return;
    }
    const day = v("day");
    let dow: number | null = null;
    if (day) {
      dow = /^\d$/.test(day) ? Number(day) : DAYS.indexOf(day.slice(0, 3).toLowerCase());
      if (dow < 0 || dow > 6) {
        errors.push(`Row ${idx + 2}: couldn't read day "${day}"`);
        dow = null;
      }
    }
    const type = v("type")?.toLowerCase().replace(/\s+/g, "") ?? null;
    const item: ExtractedListing = {
      ...emptyExtracted(name),
      type: type && (CLASS_TYPES as readonly string[]).includes(type) ? type : null,
      day_of_week: dow,
      date: v("date"),
      recurring_weekly: v("date") ? false : dow !== null,
      start_time: v("start_time"),
      end_time: v("end_time"),
      series_start: v("series_start"),
      series_end: v("series_end"),
      location: v("location"),
      address: v("address"),
      neighborhood: v("neighborhood"),
      ages: v("ages"),
      price: v("price"),
      price_details: v("price_details"),
      availability: v("availability"),
      description: v("description"),
      url: v("url"),
    };
    rows.push({ source: v("source"), item });
  });
  return { rows, errors };
}
