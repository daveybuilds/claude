"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { AGE_BANDS, NEIGHBORHOODS } from "@/lib/constants";
import {
  addSubscriber,
  deleteAccount,
  getHiCounts,
  getMyHis,
  getPublicListings,
  getViewer,
  getVisibleNames,
  previewSignIn,
  reportName,
  sendMagicLink,
  setSayHi,
  setShownName,
  signOut,
  UserError,
} from "@/lib/data/site";
import { hiKey, type NameEntry } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$/;

export interface HiState {
  ok: boolean;
  error?: string;
  needsSignIn?: boolean;
  on: boolean;
  count: number;
  showingName: string | null;
  names: NameEntry[];
}

const fail = (error: string, extra: Partial<HiState> = {}): HiState => ({ ok: false, error, on: false, count: 0, showingName: null, names: [], ...extra });

/** Check the listing exists and that `date` is really its next class. */
async function validOccurrence(listingId: string, date: string): Promise<boolean> {
  if (!UUID.test(listingId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const listing = (await getPublicListings()).find((l) => l.id === listingId);
  return !!listing && listing.nextDate === date;
}

async function stateFor(listingId: string, date: string): Promise<HiState> {
  const viewer = await getViewer();
  const key = hiKey(listingId, date);
  const [counts, mine] = await Promise.all([getHiCounts([listingId]), getMyHis(viewer)]);
  const my = mine.find((m) => m.listingId === listingId && m.date === date);
  const names = my ? ((await getVisibleNames(viewer, [my]))[key] ?? []) : [];
  return { ok: true, on: !!my, count: counts[key] ?? 0, showingName: my?.showingName ?? null, names };
}

async function guard(listingId: string, date: string, fn: () => Promise<void>): Promise<HiState> {
  try {
    if (!(await validOccurrence(listingId, date))) return fail("This class's times have changed. Please refresh.");
    await fn();
    return await stateFor(listingId, date);
  } catch (e) {
    if (e instanceof UserError) return { ...(await stateFor(listingId, date)), ok: false, error: e.message };
    console.error(e);
    return { ...(await stateFor(listingId, date).catch(() => fail(""))), ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function toggleHiAction(listingId: string, date: string, on: boolean): Promise<HiState> {
  const viewer = await getViewer();
  if (!viewer) return fail("Sign in first", { needsSignIn: true });
  return guard(listingId, date, () => setSayHi(viewer, listingId, date, on));
}

export async function setNameAction(listingId: string, date: string, name: string | null): Promise<HiState> {
  const viewer = await getViewer();
  if (!viewer) return fail("Sign in first", { needsSignIn: true });
  return guard(listingId, date, () => setShownName(viewer, listingId, date, name));
}

export async function reportNameAction(listingId: string, date: string, nameId: string, reason: string): Promise<HiState> {
  const viewer = await getViewer();
  if (!viewer) return fail("Sign in first", { needsSignIn: true });
  if (!UUID.test(nameId)) return fail("Couldn't report that name.");
  return guard(listingId, date, () => reportName(viewer, nameId, reason.slice(0, 200) || null));
}

// ---------------------------------------------------------------------------
// Sign-in
// ---------------------------------------------------------------------------

export interface FormState {
  ok: boolean;
  message?: string;
}

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/classes";
}

/** Email a magic link. In preview mode, signs in straight away instead. */
export async function sendLinkAction(_: FormState | null, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(form.get("next"));
  if (!EMAIL.test(email)) return { ok: false, message: "That email doesn't look quite right." };
  if (!isSupabaseConfigured()) {
    await previewSignIn(email);
    return { ok: true, message: "preview" };
  }
  try {
    await sendMagicLink(email, next);
    return { ok: true, message: `Check ${email} for a sign-in link. It works for an hour.` };
  } catch (e) {
    return { ok: false, message: e instanceof UserError ? e.message : "Couldn't send the email. Please try again." };
  }
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/");
}

export async function deleteAccountAction(_: FormState | null, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "You're not signed in." };
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== "delete")
    return { ok: false, message: 'Type "delete" to confirm.' };
  try {
    await deleteAccount(viewer);
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Couldn't delete your account just now. Please try again or email us." };
  }
  redirect("/?deleted=1");
}

// ---------------------------------------------------------------------------
// Friday list
// ---------------------------------------------------------------------------

export async function subscribeAction(_: FormState | null, form: FormData): Promise<FormState> {
  if (String(form.get("company") ?? "")) return { ok: true, message: "Thanks!" }; // honeypot
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, message: "That email doesn't look quite right." };
  const hoods = form.getAll("hood").map(String).filter((h) => NEIGHBORHOODS.some((n) => n.slug === h));
  const ages = form.getAll("age").map(String).filter((a) => AGE_BANDS.some((b) => b.id === a));
  try {
    await addSubscriber(email, hoods, ages);
    return { ok: true, message: "You're on the Friday list. We'll email you when the first one goes out." };
  } catch (e) {
    console.error(e);
    return { ok: false, message: "Couldn't sign you up just now. Please try again." };
  }
}
