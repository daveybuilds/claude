"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminLogin, adminLogout, requireAdmin } from "@/lib/admin-auth";
import { CHECK_FREQUENCIES, CLASS_TYPES, SOURCE_METHODS, type CheckFrequency, type ClassType, type SourceMethod } from "@/lib/constants";
import * as admin from "@/lib/data/admin";
import { normalizeTime, parseAges, slugify } from "@/lib/pipeline/normalize";
import type { Availability, ListingFields } from "@/lib/types";

export interface AdminFormState {
  ok: boolean;
  message?: string;
}

const done = (path = "/admin") => {
  revalidatePath("/", "layout");
  return path;
};

export async function loginAction(_: AdminFormState | null, form: FormData): Promise<AdminFormState> {
  const h = await headers();
  const client = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const res = await adminLogin(String(form.get("password") ?? ""), client);
  if (!res.ok) return { ok: false, message: res.error };
  redirect("/admin");
}

export async function logoutAction() {
  await adminLogout();
  redirect("/admin/login");
}

// ---- Listings --------------------------------------------------------------

export async function approveAction(id: string) {
  await requireAdmin();
  await admin.approveListing(id);
  done();
}

export async function rejectAction(id: string) {
  await requireAdmin();
  await admin.rejectListing(id);
  done();
}

export async function archiveAction(id: string) {
  await requireAdmin();
  await admin.archiveListing(id);
  done();
}

export async function verifyAction(id: string) {
  await requireAdmin();
  await admin.markVerified(id);
  done();
}

const str = (form: FormData, k: string, max = 300) => {
  const v = String(form.get(k) ?? "").trim();
  return v ? v.slice(0, max) : null;
};
const int = (form: FormData, k: string) => {
  const v = str(form, k);
  return v !== null && /^\d+$/.test(v) ? Number(v) : null;
};
const date = (form: FormData, k: string) => {
  const v = str(form, k);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

function listingFromForm(form: FormData): ListingFields | string {
  const name = str(form, "name", 160);
  if (!name) return "Name is required.";
  const type = str(form, "type");
  const dow = str(form, "day_of_week");
  const isFree = str(form, "is_free");
  const availability = str(form, "availability");
  const url = str(form, "url", 500);
  if (url && !/^https?:\/\//.test(url)) return "The link must start with http:// or https://";
  const ages = str(form, "ages_text", 80);
  const parsed = parseAges(ages);
  const fields: ListingFields = {
    name,
    type: type && (CLASS_TYPES as readonly string[]).includes(type) ? (type as ClassType) : null,
    day_of_week: dow !== null && /^[0-6]$/.test(dow) ? Number(dow) : null,
    date: date(form, "date"),
    start_time: normalizeTime(str(form, "start_time")),
    end_time: normalizeTime(str(form, "end_time")),
    series_start: date(form, "series_start"),
    series_end: date(form, "series_end"),
    location_name: str(form, "location_name", 120),
    address: str(form, "address", 160),
    neighborhood: str(form, "neighborhood", 40),
    ages_text: ages,
    age_min_months: int(form, "age_min_months") ?? parsed.min,
    age_max_months: int(form, "age_max_months") ?? parsed.max,
    is_free: isFree === "free" ? true : isFree === "paid" ? false : null,
    price: str(form, "price", 80),
    price_details: str(form, "price_details", 160),
    availability: availability && ["open", "waitlist", "full"].includes(availability) ? (availability as Availability) : null,
    description: str(form, "description", 240),
    url,
  };
  if (fields.date) fields.day_of_week = new Date(`${fields.date}T12:00:00Z`).getUTCDay();
  return fields;
}

export async function saveListingAction(_: AdminFormState | null, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const fields = listingFromForm(form);
  if (typeof fields === "string") return { ok: false, message: fields };
  const id = str(form, "id");
  const sourceId = str(form, "source_id");
  const sources = await admin.listSources();
  const source = sources.find((s) => s.id === sourceId);
  const provider = source?.provider ?? str(form, "provider", 80) ?? "Manual";
  let savedId: string;
  try {
    savedId = await admin.saveListing(id, fields, {
      sourceId: source?.id ?? null,
      provider,
      verify: form.get("verify") === "on",
      approve: form.get("approve") === "on",
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Couldn't save" };
  }
  done();
  redirect(`/admin/listings/${savedId}?saved=1`);
}

// ---- Reports ---------------------------------------------------------------

export async function resolveReportAction(id: string, action: "remove" | "restore") {
  await requireAdmin();
  await admin.resolveReport(id, action);
  done();
}

// ---- Sources ---------------------------------------------------------------

export async function saveSourceAction(_: AdminFormState | null, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const name = str(form, "name", 120);
  const url = str(form, "url", 500);
  const method = str(form, "method");
  if (!name || !url || !method) return { ok: false, message: "Name, URL and method are required." };
  if (!/^https?:\/\//.test(url)) return { ok: false, message: "The URL must start with http:// or https://" };
  if (!(SOURCE_METHODS as readonly string[]).includes(method)) return { ok: false, message: "Pick a method." };
  if (/instagram\.com|facebook\.com|fb\.com|tiktok\.com/i.test(url) && method !== "manual")
    return { ok: false, message: "Social platforms can't be collected automatically. Use the manual method." };
  let options: Record<string, unknown> = {};
  const rawOptions = str(form, "options", 5000);
  if (rawOptions) {
    try {
      options = JSON.parse(rawOptions);
    } catch {
      return { ok: false, message: "Options must be valid JSON (or empty)." };
    }
  }
  const frequency = str(form, "check_frequency") ?? "daily";
  const id = str(form, "id");
  try {
    await admin.saveSource(id, {
      slug: str(form, "slug", 60) ?? slugify(name),
      name,
      provider: str(form, "provider", 80) ?? name,
      url,
      neighborhood: str(form, "neighborhood", 40),
      method: method as SourceMethod,
      trusted: form.get("trusted") === "on",
      active: form.get("active") === "on",
      options,
      parser_notes: str(form, "parser_notes", 2000),
      check_frequency: ((CHECK_FREQUENCIES as readonly string[]).includes(frequency) ? frequency : "daily") as CheckFrequency,
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Couldn't save" };
  }
  done();
  redirect("/admin/sources?saved=1");
}

export async function runSourceAction(_: AdminFormState | null, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const slug = String(form.get("slug") ?? "");
  try {
    const r = await admin.runSourceNow(slug);
    done();
    if (r.skipped) return { ok: true, message: "Manual source: nothing to collect." };
    return r.ok
      ? { ok: true, message: `Found ${r.found}: ${r.created} new, ${r.proposed} changes to review, ${r.unchanged} unchanged.` }
      : { ok: false, message: r.error };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Run failed" };
  }
}

export async function clearFlagAction(id: string) {
  await requireAdmin();
  await admin.clearSourceFlag(id);
  done();
}

// ---- CSV import --------------------------------------------------------------

export async function importCsvAction(_: AdminFormState | null, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const file = form.get("file");
  let text = String(form.get("csv") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > 1_000_000) return { ok: false, message: "That file is over 1 MB." };
    text = await file.text();
  }
  if (!text.trim()) return { ok: false, message: "Choose a CSV file or paste some rows." };
  const res = await admin.importCsv(text, str(form, "source"));
  done();
  const summary = `Added ${res.created}, updated ${res.updated}.`;
  return { ok: res.errors.length === 0, message: res.errors.length ? `${summary} ${res.errors.join(" · ")}` : summary };
}
