// Shared vocabularies used by the site, the admin pages and the collectors.

export const SITE_NAME = "Little SF";

export const CLASS_TYPES = ["music", "yoga", "storytime", "support", "play"] as const;
export type ClassType = (typeof CLASS_TYPES)[number];

export const CLASS_TYPE_LABELS: Record<ClassType, string> = {
  music: "Music",
  yoga: "Yoga",
  storytime: "Story time",
  support: "Support",
  play: "Play",
};

export const AGE_BANDS = [
  { id: "0-6m", label: "Newborn–6m", min: 0, max: 6 },
  { id: "6-12m", label: "6–12m", min: 6, max: 12 },
  { id: "1-2y", label: "1–2y", min: 12, max: 24 },
] as const;
export type AgeBandId = (typeof AGE_BANDS)[number]["id"];

export type Neighborhood = { slug: string; name: string; blurb: string };

// Slugs double as landing URLs (/marina, /richmond …), so keep them short and
// never reuse a top-level route name like "classes" or "admin".
export const NEIGHBORHOODS: Neighborhood[] = [
  { slug: "marina", name: "Marina", blurb: "Chestnut Street, the Green and Fort Mason" },
  { slug: "cow-hollow", name: "Cow Hollow", blurb: "Union Street and the slopes above it" },
  { slug: "pacific-heights", name: "Pacific Heights", blurb: "Fillmore, Alta Plaza and Lafayette Park" },
  { slug: "laurel-heights", name: "Laurel Heights & Presidio Heights", blurb: "California Street, Sacramento Street and around" },
  { slug: "presidio", name: "Presidio", blurb: "Trails, the Tunnel Tops and the Main Post" },
  { slug: "russian-hill", name: "Russian Hill & North Beach", blurb: "Polk Street to Washington Square" },
  { slug: "richmond", name: "Richmond", blurb: "Inner and Outer Richmond, Clement to Geary" },
  { slug: "sunset", name: "Sunset", blurb: "Inner and Outer Sunset, Irving to Judah" },
  { slug: "western-addition", name: "Western Addition & NoPa", blurb: "Divisadero, Alamo Square and the Panhandle" },
  { slug: "haight", name: "Haight & Cole Valley", blurb: "Golden Gate Park's eastern edge" },
  { slug: "hayes-valley", name: "Hayes Valley", blurb: "Patricia's Green and around" },
  { slug: "mission", name: "Mission", blurb: "Valencia, Dolores Park and 24th Street" },
  { slug: "noe-valley", name: "Noe Valley & Castro", blurb: "24th Street, Castro and Glen Park" },
  { slug: "bernal-heights", name: "Bernal Heights", blurb: "Cortland Avenue and the hill" },
  { slug: "potrero-hill", name: "Potrero Hill & Dogpatch", blurb: "18th Street down to the bay" },
  { slug: "soma", name: "SoMa & Mission Bay", blurb: "South Park to the ballpark" },
];

export const NEIGHBORHOOD_BY_SLUG = new Map(NEIGHBORHOODS.map((n) => [n.slug, n]));

export function neighborhoodName(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return NEIGHBORHOOD_BY_SLUG.get(slug)?.name ?? null;
}

export const TIME_ZONE = "America/Los_Angeles";

/** Listings that haven't been verified within this window hide their times. */
export const FRESHNESS_DAYS = 14;

export const SOURCE_METHODS = ["ics", "api", "html", "playwright", "manual"] as const;
export type SourceMethod = (typeof SOURCE_METHODS)[number];

export const CHECK_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type CheckFrequency = (typeof CHECK_FREQUENCIES)[number];

export const MEETING_NOTE =
  "Moms who tap this are meeting by the door after class. Pause for a quick hello, no plans needed.";
