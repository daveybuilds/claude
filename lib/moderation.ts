// First-name rules for "I'll say hi". The database enforces the same rules
// (see supabase/migrations), so a crafted request can't get around them.

/** Letters only (including common accented Latin letters), 1–20 characters. */
export const FIRST_NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]{1,20}$/;

// Kept short and deliberately conservative: it only has to stop the obvious.
// Short words must match the whole name (so "Cassidy" and "Hancock" are fine);
// longer fragments match anywhere in the name. `npm run seed` loads the same
// lists into the database's `blocked_words` table.
export const BLOCKED_EXACT = [
  "anal", "arse", "ass", "boob", "boobs", "cock", "cum", "dick", "fag", "milf",
  "piss", "porn", "sex", "sexy", "spic", "tits", "twat", "kike",
];
export const BLOCKED_FRAGMENTS = [
  "asshole", "bastard", "bitch", "bollock", "cunt", "dildo", "fuck", "hitler",
  "jizz", "nazi", "nigg", "penis", "pussy", "rapist", "retard", "shit", "slut",
  "vagina", "wank", "whore",
];

export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

export function normalizeFirstName(raw: string): string {
  const trimmed = raw.normalize("NFC").trim();
  return trimmed.charAt(0).toLocaleUpperCase("en-US") + trimmed.slice(1);
}

export function isBlockedName(name: string): boolean {
  const lower = name.toLowerCase();
  return BLOCKED_EXACT.includes(lower) || BLOCKED_FRAGMENTS.some((w) => lower.includes(w));
}

export function checkFirstName(raw: string): NameCheck {
  const name = normalizeFirstName(raw);
  if (!name) return { ok: false, error: "Add a first name, or stay anonymous." };
  if (name.length > 20) return { ok: false, error: "Keep it to 20 letters or fewer." };
  if (!FIRST_NAME_PATTERN.test(name))
    return { ok: false, error: "Letters only, please — just a first name." };
  if (isBlockedName(name)) return { ok: false, error: "Please choose a different name." };
  return { ok: true, name };
}
