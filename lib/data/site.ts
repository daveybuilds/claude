import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { env, isSupabaseConfigured } from "../env";
import { memoryDb } from "../memory-db";
import { checkFirstName } from "../moderation";
import { supabaseForUser, supabasePublic, supabaseService } from "../supabase";
import { sfToday, addDays } from "../time";
import { hiKey, type MyHi, type NameEntry, type PublicListing, type Viewer } from "../types";
import { PUBLIC_COLUMNS, toPublic } from "./listings";

// Everything the public site reads and writes. Each function works against
// Supabase (row-level security enforced by Postgres) or, in preview mode,
// against the in-memory store, which applies the same rules in code.

export const PREVIEW_COOKIE = "lsf_preview_user";

// ---------------------------------------------------------------------------
// Listings and counts
// ---------------------------------------------------------------------------

export async function getPublicListings(now: Date = new Date()): Promise<PublicListing[]> {
  if (!isSupabaseConfigured()) {
    return toPublic(memoryDb().listings.filter((l) => l.status === "approved"), now);
  }
  const { data, error } = await supabasePublic().from("listings").select(PUBLIC_COLUMNS).eq("status", "approved");
  if (error) throw new Error(error.message);
  return toPublic(data ?? [], now);
}

export async function getHiCounts(listingIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (!listingIds.length) return counts;
  if (!isSupabaseConfigured()) {
    const today = sfToday();
    for (const t of memoryDb().taps) {
      if (listingIds.includes(t.listing_id) && t.occurrence_date >= today) {
        const k = hiKey(t.listing_id, t.occurrence_date);
        counts[k] = (counts[k] ?? 0) + 1;
      }
    }
    return counts;
  }
  const { data, error } = await supabasePublic().rpc("say_hi_counts", { p_listing_ids: listingIds });
  if (error) throw new Error(error.message);
  for (const r of (data ?? []) as { listing_id: string; occurrence_date: string; count: number }[]) {
    counts[hiKey(r.listing_id, r.occurrence_date)] = Number(r.count);
  }
  return counts;
}

// ---------------------------------------------------------------------------
// The signed-in mom
// ---------------------------------------------------------------------------

export async function getViewer(): Promise<Viewer | null> {
  if (!isSupabaseConfigured()) {
    const raw = (await cookies()).get(PREVIEW_COOKIE)?.value;
    if (!raw) return null;
    const [id, email] = raw.split("|");
    return id && email ? { id, email } : null;
  }
  const sb = await supabaseForUser();
  const { data } = await sb.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
}

/** Preview mode only: pretend sign-in (no email is sent). */
export async function previewSignIn(email: string): Promise<void> {
  const db = memoryDb();
  let user = db.users.find((u) => u.email === email);
  if (!user) {
    user = { id: randomUUID(), email };
    db.users.push(user);
  }
  (await cookies()).set(PREVIEW_COOKIE, `${user.id}|${email}`, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function getMyHis(viewer: Viewer | null): Promise<MyHi[]> {
  if (!viewer) return [];
  const today = sfToday();
  if (!isSupabaseConfigured()) {
    const db = memoryDb();
    return db.taps
      .filter((t) => t.user_id === viewer.id && t.occurrence_date >= today)
      .map((t) => ({
        listingId: t.listing_id,
        date: t.occurrence_date,
        showingName: db.names.find((n) => n.say_hi_id === t.id)?.first_name ?? null,
      }));
  }
  const sb = await supabaseForUser();
  const { data, error } = await sb
    .from("say_hi")
    .select("id, listing_id, occurrence_date, say_hi_names(first_name)")
    .gte("occurrence_date", today);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const names = r.say_hi_names as unknown as { first_name: string } | { first_name: string }[] | null;
    const name = Array.isArray(names) ? names[0]?.first_name : names?.first_name;
    return { listingId: r.listing_id, date: r.occurrence_date, showingName: name ?? null };
  });
}

/**
 * First names visible to this viewer, grouped by class occurrence. Postgres
 * only returns names for occurrences she's attending (plus her own).
 */
export async function getVisibleNames(viewer: Viewer | null, mine: MyHi[]): Promise<Record<string, NameEntry[]>> {
  const out: Record<string, NameEntry[]> = {};
  if (!viewer || !mine.length) return out;
  if (!isSupabaseConfigured()) {
    const db = memoryDb();
    const myTapIds = new Set(db.taps.filter((t) => t.user_id === viewer.id).map((t) => t.id));
    for (const m of mine) {
      out[hiKey(m.listingId, m.date)] = db.names
        .filter((n) => n.listing_id === m.listingId && n.occurrence_date === m.date && (!n.hidden || myTapIds.has(n.say_hi_id)))
        .map((n) => ({ id: n.say_hi_id, first_name: n.first_name, mine: myTapIds.has(n.say_hi_id) }));
    }
    return out;
  }
  const sb = await supabaseForUser();
  const [names, taps] = await Promise.all([
    sb.from("say_hi_names").select("say_hi_id, listing_id, occurrence_date, first_name").in("listing_id", [...new Set(mine.map((m) => m.listingId))]),
    sb.from("say_hi").select("id"),
  ]);
  if (names.error) throw new Error(names.error.message);
  const myTapIds = new Set((taps.data ?? []).map((t) => t.id));
  for (const n of names.data ?? []) {
    const k = hiKey(n.listing_id, n.occurrence_date);
    (out[k] ??= []).push({ id: n.say_hi_id, first_name: n.first_name, mine: myTapIds.has(n.say_hi_id) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Writes (called from server actions, which check input first)
// ---------------------------------------------------------------------------

export class UserError extends Error {}

function assertBookableDate(date: string) {
  const today = sfToday();
  if (date < today || date > addDays(today, 14)) throw new UserError("You can say hi to classes in the next two weeks.");
}

export async function setSayHi(viewer: Viewer, listingId: string, date: string, on: boolean): Promise<void> {
  assertBookableDate(date);
  if (!isSupabaseConfigured()) {
    const db = memoryDb();
    if (!db.listings.some((l) => l.id === listingId && l.status === "approved")) throw new UserError("That class isn't listed.");
    const existing = db.taps.find((t) => t.user_id === viewer.id && t.listing_id === listingId && t.occurrence_date === date);
    if (on && !existing) db.taps.push({ id: randomUUID(), user_id: viewer.id, listing_id: listingId, occurrence_date: date });
    if (!on && existing) {
      db.taps = db.taps.filter((t) => t !== existing);
      db.names = db.names.filter((n) => n.say_hi_id !== existing.id);
    }
    return;
  }
  const sb = await supabaseForUser();
  if (on) {
    const { error } = await sb.from("say_hi").insert({ user_id: viewer.id, listing_id: listingId, occurrence_date: date });
    if (error && error.code !== "23505") throw new Error(error.message); // 23505: already saying hi
  } else {
    const { error } = await sb.from("say_hi").delete().eq("listing_id", listingId).eq("occurrence_date", date);
    if (error) throw new Error(error.message);
  }
}

/** Show a first name on this tap, or pass null to hide it again. */
export async function setShownName(viewer: Viewer, listingId: string, date: string, rawName: string | null): Promise<void> {
  let name: string | null = null;
  if (rawName !== null) {
    const check = checkFirstName(rawName);
    if (!check.ok) throw new UserError(check.error);
    name = check.name;
  }
  if (!isSupabaseConfigured()) {
    const db = memoryDb();
    const tap = db.taps.find((t) => t.user_id === viewer.id && t.listing_id === listingId && t.occurrence_date === date);
    if (!tap) throw new UserError("Tap “I'll say hi” first.");
    db.names = db.names.filter((n) => n.say_hi_id !== tap.id);
    if (name) db.names.push({ say_hi_id: tap.id, listing_id: listingId, occurrence_date: date, first_name: name, hidden: false });
    return;
  }
  const sb = await supabaseForUser();
  const { data: tap, error } = await sb
    .from("say_hi")
    .select("id")
    .eq("listing_id", listingId)
    .eq("occurrence_date", date)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!tap) throw new UserError("Tap “I'll say hi” first.");
  const del = await sb.from("say_hi_names").delete().eq("say_hi_id", tap.id);
  if (del.error) throw new Error(del.error.message);
  if (name) {
    const ins = await sb.from("say_hi_names").insert({ say_hi_id: tap.id, listing_id: listingId, occurrence_date: date, first_name: name });
    if (ins.error) {
      if (ins.error.message.includes("name_not_allowed")) throw new UserError("Please choose a different name.");
      throw new Error(ins.error.message);
    }
  }
}

export async function reportName(viewer: Viewer, nameId: string, reason: string | null): Promise<void> {
  if (!isSupabaseConfigured()) {
    const db = memoryDb();
    const n = db.names.find((x) => x.say_hi_id === nameId);
    const attending = n && db.taps.some((t) => t.user_id === viewer.id && t.listing_id === n.listing_id && t.occurrence_date === n.occurrence_date);
    if (!n || !attending) throw new UserError("You can only report names at classes you're going to.");
    db.reports.push({
      id: randomUUID(),
      name_id: n.say_hi_id,
      listing_id: n.listing_id,
      listing_name: db.listings.find((l) => l.id === n.listing_id)?.name ?? null,
      occurrence_date: n.occurrence_date,
      first_name: n.first_name,
      reason,
      status: "open",
      reporter_id: viewer.id,
      created_at: new Date().toISOString(),
    });
    n.hidden = true;
    return;
  }
  const sb = await supabaseForUser();
  const { error } = await sb.rpc("report_name", { p_name_id: nameId, p_reason: reason });
  if (error) throw new UserError("Couldn't report that name. Please try again.");
}

export async function addSubscriber(email: string, neighborhoods: string[], ageBands: string[]): Promise<void> {
  if (!isSupabaseConfigured()) {
    const db = memoryDb();
    db.subscribers = db.subscribers.filter((s) => s.email !== email);
    db.subscribers.push({ email, neighborhoods, age_bands: ageBands });
    return;
  }
  const { error } = await supabaseService()
    .from("subscribers")
    .upsert({ email, neighborhoods, age_bands: ageBands }, { onConflict: "email" });
  if (error) throw new Error(error.message);
}

/** Delete the account, every tap and name, and any Friday-list subscription. */
export async function deleteAccount(viewer: Viewer): Promise<void> {
  if (!isSupabaseConfigured()) {
    const db = memoryDb();
    const tapIds = new Set(db.taps.filter((t) => t.user_id === viewer.id).map((t) => t.id));
    db.names = db.names.filter((n) => !tapIds.has(n.say_hi_id));
    db.taps = db.taps.filter((t) => t.user_id !== viewer.id);
    db.subscribers = db.subscribers.filter((s) => s.email !== viewer.email);
    db.users = db.users.filter((u) => u.id !== viewer.id);
    (await cookies()).delete(PREVIEW_COOKIE);
    return;
  }
  const admin = supabaseService();
  const sub = await admin.from("subscribers").delete().eq("email", viewer.email);
  if (sub.error) throw new Error(sub.error.message);
  // Deleting the auth user cascades to say_hi → say_hi_names.
  const { error } = await admin.auth.admin.deleteUser(viewer.id);
  if (error) throw new Error(error.message);
  const sb = await supabaseForUser();
  await sb.auth.signOut();
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) {
    (await cookies()).delete(PREVIEW_COOKIE);
    return;
  }
  const sb = await supabaseForUser();
  await sb.auth.signOut();
}

export async function sendMagicLink(email: string, next: string): Promise<void> {
  const sb = await supabaseForUser();
  const redirect = `${env.siteUrl}/auth/confirm?next=${encodeURIComponent(next)}`;
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: true } });
  if (error) {
    if (error.status === 429) throw new UserError("Too many sign-in emails just now. Please wait a minute and try again.");
    throw new UserError("Couldn't send the sign-in email. Please check the address and try again.");
  }
}
