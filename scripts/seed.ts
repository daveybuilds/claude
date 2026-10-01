/**
 * Load the starting sources, listings and name block-list into Supabase.
 * Safe to run more than once: existing rows (matched by slug / dedupe key /
 * word) are left alone, so it never overwrites your edits.
 *
 *   npm run seed
 */
import { createClient } from "@supabase/supabase-js";
import { BLOCKED_EXACT, BLOCKED_FRAGMENTS } from "../lib/moderation";
import { SEED_LISTINGS, SEED_SOURCES, seedDedupeKey } from "../lib/seed";

try {
  process.loadEnvFile(".env.local");
} catch {
  // use the environment as is
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const words = [...BLOCKED_EXACT.map((word) => ({ word, exact: true })), ...BLOCKED_FRAGMENTS.map((word) => ({ word, exact: false }))];
  const w = await sb.from("blocked_words").upsert(words, { onConflict: "word", ignoreDuplicates: true });
  if (w.error) throw w.error;
  console.log(`Block-list: ${words.length} words`);

  const s = await sb.from("sources").upsert(SEED_SOURCES, { onConflict: "slug", ignoreDuplicates: true });
  if (s.error) throw s.error;
  const { data: sources, error } = await sb.from("sources").select("id, slug");
  if (error) throw error;
  const idBySlug = new Map(sources.map((x) => [x.slug, x.id]));
  console.log(`Sources: ${SEED_SOURCES.length}`);

  const rows = SEED_LISTINGS.map(({ source_slug, ...l }) => ({
    ...l,
    source_id: idBySlug.get(source_slug) ?? null,
    dedupe_key: seedDedupeKey({ source_slug, ...l }),
    status: "approved",
    last_seen_at: l.last_verified_at,
  }));
  const r = await sb.from("listings").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (r.error) throw r.error;
  console.log(`Listings: ${rows.length}`);
  console.log("Done.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
