import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { env, isSupabaseConfigured } from "./env";
import { memoryDb } from "./memory-db";
import { supabaseService } from "./supabase";
import { addDays, sfToday } from "./time";

/** Vercel Cron sends "Authorization: Bearer $CRON_SECRET". */
export function cronAuthorized(request: NextRequest): boolean {
  if (!env.cronSecret) return !env.isProduction; // open locally, closed in production without a secret
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${env.cronSecret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Delete first names after the class date and taps after 30 days. */
export async function purgeExpired(): Promise<{ names_deleted: number; taps_deleted: number }> {
  if (!isSupabaseConfigured()) {
    const db = memoryDb();
    const today = sfToday();
    const before = { names: db.names.length, taps: db.taps.length };
    db.names = db.names.filter((n) => n.occurrence_date >= today);
    db.taps = db.taps.filter((t) => t.occurrence_date >= addDays(today, -30));
    return { names_deleted: before.names - db.names.length, taps_deleted: before.taps - db.taps.length };
  }
  const { data, error } = await supabaseService().rpc("purge_expired");
  if (error) throw new Error(error.message);
  return data as { names_deleted: number; taps_deleted: number };
}
