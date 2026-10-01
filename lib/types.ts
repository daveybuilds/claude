import type { CheckFrequency, ClassType, SourceMethod } from "./constants";

export type ListingStatus = "pending" | "approved" | "rejected" | "archived";
export type Availability = "open" | "waitlist" | "full";

/** The editable, factual part of a listing — what collectors produce and admins edit. */
export interface ListingFields {
  name: string;
  type: ClassType | null;
  day_of_week: number | null; // 0 = Sunday
  date: string | null; // YYYY-MM-DD, for one-off events
  start_time: string | null; // HH:MM, 24h
  end_time: string | null;
  series_start: string | null;
  series_end: string | null;
  location_name: string | null;
  address: string | null;
  neighborhood: string | null; // slug from NEIGHBORHOODS
  ages_text: string | null;
  age_min_months: number | null;
  age_max_months: number | null;
  is_free: boolean | null;
  price: string | null;
  price_details: string | null;
  availability: Availability | null;
  description: string | null; // short factual summary in our own words
  url: string | null;
}

export interface Listing extends ListingFields {
  id: string;
  source_id: string | null;
  provider: string;
  dedupe_key: string;
  status: ListingStatus;
  pending_changes: Partial<ListingFields> | null;
  review_note: string | null;
  last_verified_at: string | null;
  last_seen_at: string | null;
  missing_since: string | null;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  slug: string;
  name: string;
  provider: string;
  url: string;
  neighborhood: string | null;
  method: SourceMethod;
  trusted: boolean;
  active: boolean;
  options: Record<string, unknown>;
  parser_notes: string | null;
  check_frequency: CheckFrequency;
  last_run_at: string | null;
  last_success_at: string | null;
  last_error: string | null;
  last_count: number | null;
  needs_attention: boolean;
  created_at: string;
}

export interface HistoryEntry {
  id: string;
  listing_id: string;
  action: string;
  actor: string;
  before: Partial<ListingFields> | null;
  after: Partial<ListingFields> | null;
  created_at: string;
}

export interface NameEntry {
  id: string; // say_hi id
  first_name: string;
  mine: boolean;
}

export interface Report {
  id: string;
  name_id: string;
  listing_id: string;
  listing_name: string | null;
  occurrence_date: string;
  first_name: string;
  reason: string | null;
  status: "open" | "removed" | "restored";
  created_at: string;
}

export interface Viewer {
  id: string;
  email: string;
}

export interface MyHi {
  listingId: string;
  date: string;
  showingName: string | null;
}

/** What a public card needs, computed on the server. */
export interface PublicListing extends ListingFields {
  id: string;
  provider: string;
  last_verified_at: string | null;
  nextDate: string | null; // next occurrence (YYYY-MM-DD) when known
  showTimes: boolean; // false → "Check times"
  verifiedDaysAgo: number | null;
}

export const hiKey = (listingId: string, date: string) => `${listingId}|${date}`;
