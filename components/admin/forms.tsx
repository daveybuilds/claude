"use client";

import { useActionState } from "react";
import {
  importCsvAction,
  loginAction,
  runSourceAction,
  saveListingAction,
  saveSourceAction,
  type AdminFormState,
} from "@/app/admin/actions";
import { CHECK_FREQUENCIES, CLASS_TYPES, CLASS_TYPE_LABELS, NEIGHBORHOODS, SOURCE_METHODS } from "@/lib/constants";
import type { Listing, Source } from "@/lib/types";

export const inputCls =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink placeholder:text-ink-faint";
const labelCls = "block text-sm font-extrabold";
export const primaryBtn = "min-h-11 rounded-full bg-button px-5 font-extrabold text-button-ink disabled:opacity-60";

function Message({ state }: { state: AdminFormState | null }) {
  if (!state?.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-xl p-3 text-sm font-bold ${state.ok ? "bg-sage-soft text-sage-ink" : "bg-rose-soft text-rose-ink"}`}>
      {state.message}
    </p>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-3">
      <Field label="Password">
        <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
      </Field>
      <button disabled={pending} className={`${primaryBtn} w-full`}>
        {pending ? "Checking…" : "Sign in"}
      </button>
      <Message state={state} />
    </form>
  );
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ListingForm({ listing, sources }: { listing: Listing | null; sources: Pick<Source, "id" | "name">[] }) {
  const [state, action, pending] = useActionState(saveListingAction, null);
  const l = listing;
  const v = (x: string | number | null | undefined) => (x === null || x === undefined ? "" : String(x));
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {l && <input type="hidden" name="id" value={l.id} />}
      <div className="sm:col-span-2">
        <Field label="Name">
          <input name="name" required maxLength={160} defaultValue={v(l?.name)} className={inputCls} />
        </Field>
      </div>
      <Field label="Source">
        <select name="source_id" defaultValue={v(l?.source_id)} className={inputCls}>
          <option value="">— none (manual) —</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Type">
        <select name="type" defaultValue={v(l?.type)} className={inputCls}>
          <option value="">Unknown</option>
          {CLASS_TYPES.map((t) => (
            <option key={t} value={t}>
              {CLASS_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Weekly on" hint="For classes that repeat every week">
        <select name="day_of_week" defaultValue={v(l?.day_of_week)} className={inputCls}>
          <option value="">—</option>
          {DAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Or one date" hint="For one-off events">
        <input type="date" name="date" defaultValue={v(l?.date)} className={inputCls} />
      </Field>
      <Field label="Starts">
        <input type="time" name="start_time" defaultValue={v(l?.start_time)} className={inputCls} />
      </Field>
      <Field label="Ends">
        <input type="time" name="end_time" defaultValue={v(l?.end_time)} className={inputCls} />
      </Field>
      <Field label="Series starts">
        <input type="date" name="series_start" defaultValue={v(l?.series_start)} className={inputCls} />
      </Field>
      <Field label="Series ends">
        <input type="date" name="series_end" defaultValue={v(l?.series_end)} className={inputCls} />
      </Field>
      <Field label="Place">
        <input name="location_name" defaultValue={v(l?.location_name)} className={inputCls} />
      </Field>
      <Field label="Address">
        <input name="address" defaultValue={v(l?.address)} className={inputCls} />
      </Field>
      <Field label="Neighborhood">
        <select name="neighborhood" defaultValue={v(l?.neighborhood)} className={inputCls}>
          <option value="">Unknown / citywide</option>
          {NEIGHBORHOODS.map((n) => (
            <option key={n.slug} value={n.slug}>
              {n.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Ages (as the provider says it)">
        <input name="ages_text" defaultValue={v(l?.ages_text)} placeholder="e.g. 0–12 months" className={inputCls} />
      </Field>
      <Field label="Youngest (months)" hint="Leave empty to work it out from the ages text">
        <input name="age_min_months" inputMode="numeric" defaultValue={v(l?.age_min_months)} className={inputCls} />
      </Field>
      <Field label="Oldest (months)">
        <input name="age_max_months" inputMode="numeric" defaultValue={v(l?.age_max_months)} className={inputCls} />
      </Field>
      <Field label="Free or paid">
        <select name="is_free" defaultValue={l?.is_free === true ? "free" : l?.is_free === false ? "paid" : ""} className={inputCls}>
          <option value="">Unknown</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
      </Field>
      <Field label="Price">
        <input name="price" defaultValue={v(l?.price)} placeholder="$180" className={inputCls} />
      </Field>
      <Field label="Price details">
        <input name="price_details" defaultValue={v(l?.price_details)} placeholder="per 6-week series" className={inputCls} />
      </Field>
      <Field label="Availability">
        <select name="availability" defaultValue={v(l?.availability)} className={inputCls}>
          <option value="">Unknown</option>
          <option value="open">Open</option>
          <option value="waitlist">Full, waitlist</option>
          <option value="full">Full</option>
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Short description" hint="Your own words, factual, up to 240 characters. Don't paste the provider's text.">
          <textarea name="description" maxLength={240} rows={3} defaultValue={v(l?.description)} className={`${inputCls} py-2`} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Link to times (provider's page)">
          <input name="url" type="url" defaultValue={v(l?.url)} className={inputCls} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-5 sm:col-span-2">
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" name="verify" defaultChecked className="h-5 w-5" /> I checked these times today
        </label>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" name="approve" defaultChecked={!l || l.status === "approved"} className="h-5 w-5" /> Approved
          (visible on the site)
        </label>
      </div>
      <div className="space-y-3 sm:col-span-2">
        <button disabled={pending} className={primaryBtn}>
          {pending ? "Saving…" : "Save listing"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function SourceForm({ source }: { source: Source | null }) {
  const [state, action, pending] = useActionState(saveSourceAction, null);
  const s = source;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Name">
        <input name="name" required defaultValue={s?.name} className={inputCls} />
      </Field>
      <Field label="Slug" hint="Short id for the command line, e.g. sfpl-marina. Leave empty to generate.">
        <input name="slug" pattern="[a-z0-9-]+" defaultValue={s?.slug} className={inputCls} />
      </Field>
      <Field label="Provider" hint="Same provider across sources = shared de-duplication">
        <input name="provider" defaultValue={s?.provider} className={inputCls} />
      </Field>
      <Field label="Method">
        <select name="method" defaultValue={s?.method ?? "html"} className={inputCls}>
          {SOURCE_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="URL" hint="The feed, API endpoint or page to read">
          <input name="url" type="url" required defaultValue={s?.url} className={inputCls} />
        </Field>
      </div>
      <Field label="Default neighborhood">
        <select name="neighborhood" defaultValue={s?.neighborhood ?? ""} className={inputCls}>
          <option value="">— work it out per listing —</option>
          {NEIGHBORHOODS.map((n) => (
            <option key={n.slug} value={n.slug}>
              {n.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Check every">
        <select name="check_frequency" defaultValue={s?.check_frequency ?? "daily"} className={inputCls}>
          {CHECK_FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {f === "daily" ? "day" : f === "weekly" ? "week" : "month"}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Options (JSON)" hint='e.g. {"keywords": ["baby", "toddler"]} — see the README for each method'>
          <textarea name="options" rows={3} defaultValue={s ? JSON.stringify(s.options, null, 2) : "{}"} className={`${inputCls} py-2 font-mono text-sm`} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Parser notes" hint="Anything useful about this page. Also passed to the extractor.">
          <textarea name="parser_notes" rows={3} defaultValue={s?.parser_notes ?? ""} className={`${inputCls} py-2`} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-5 sm:col-span-2">
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" name="active" defaultChecked={s?.active ?? true} className="h-5 w-5" /> Active
        </label>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" name="trusted" defaultChecked={s?.trusted ?? false} className="h-5 w-5" /> Trusted feed (ICS/API
          only: auto-approve normal updates)
        </label>
      </div>
      <div className="space-y-3 sm:col-span-2">
        <button disabled={pending} className={primaryBtn}>
          {pending ? "Saving…" : "Save source"}
        </button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function RunSourceButton({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(runSourceAction, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <button disabled={pending} className="min-h-9 rounded-full border border-line bg-surface px-3 text-sm font-bold">
        {pending ? "Running…" : "Run now"}
      </button>
      <Message state={state} />
    </form>
  );
}

export function ImportForm({ sources }: { sources: Pick<Source, "slug" | "name">[] }) {
  const [state, action, pending] = useActionState(importCsvAction, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Source for rows without a “source” column">
        <select name="source" className={inputCls} defaultValue="">
          <option value="">— must be in the file —</option>
          {sources.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="CSV file">
        <input type="file" name="file" accept=".csv,text/csv" className="block text-sm" />
      </Field>
      <Field label="…or paste rows">
        <textarea name="csv" rows={6} className={`${inputCls} py-2 font-mono text-sm`} />
      </Field>
      <button disabled={pending} className={primaryBtn}>
        {pending ? "Importing…" : "Import"}
      </button>
      <Message state={state} />
    </form>
  );
}
