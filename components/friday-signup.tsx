"use client";

import { useActionState } from "react";
import { subscribeAction } from "@/app/actions";
import { AGE_BANDS } from "@/lib/constants";

export function FridaySignup({ neighborhoods }: { neighborhoods: { slug: string; name: string }[] }) {
  const [state, action, pending] = useActionState(subscribeAction, null);

  if (state?.ok) {
    return (
      <p role="status" className="rounded-2xl bg-sage-soft p-5 font-bold text-sage-ink">
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="friday-email" className="block text-sm font-extrabold">
          Your email
        </label>
        <input
          id="friday-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className="mt-1.5 min-h-12 w-full rounded-full border border-line bg-surface px-5 text-base text-ink placeholder:text-ink-faint"
        />
      </div>
      <div>
        <label htmlFor="friday-hood" className="block text-sm font-extrabold">
          Your corner of the city
        </label>
        <select
          id="friday-hood"
          name="hood"
          className="mt-1.5 min-h-12 w-full rounded-full border border-line bg-surface px-5 text-base font-semibold text-ink"
          defaultValue=""
        >
          <option value="">All of San Francisco</option>
          {neighborhoods.map((n) => (
            <option key={n.slug} value={n.slug}>
              {n.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="text-sm font-extrabold">Baby's age</legend>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {AGE_BANDS.map((b) => (
            <label
              key={b.id}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-bold has-[:checked]:border-button has-[:checked]:bg-button has-[:checked]:text-button-ink has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-lavender-ink"
            >
              <input type="checkbox" name="age" value={b.id} className="sr-only" />
              {b.label}
            </label>
          ))}
        </div>
      </fieldset>
      {/* Hidden from people; bots fill it in. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Company <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <button
        disabled={pending}
        className="min-h-12 w-full rounded-full bg-button px-6 text-base font-extrabold text-button-ink transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Adding you…" : "Send me the Friday list"}
      </button>
      {state && !state.ok && (
        <p role="alert" className="text-sm font-bold text-rose-ink">
          {state.message}
        </p>
      )}
      <p className="text-xs text-ink-faint">One email a week. Unsubscribe any time. We never share your address.</p>
    </form>
  );
}
