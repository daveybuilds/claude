"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deleteAccountAction, sendLinkAction } from "@/app/actions";

export function SignInForm({ next, preview }: { next: string; preview: boolean }) {
  const [state, action, pending] = useActionState(sendLinkAction, null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok && state.message === "preview") router.push(next);
  }, [state, next, router]);

  if (state?.ok && state.message !== "preview") {
    return (
      <p role="status" className="rounded-2xl bg-sage-soft p-5 font-bold text-sage-ink">
        {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="signin-email" className="block text-sm font-extrabold">
        Email
      </label>
      <input
        id="signin-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        className="min-h-12 w-full rounded-full border border-line bg-surface px-5 text-base text-ink placeholder:text-ink-faint"
      />
      <button disabled={pending} className="min-h-12 w-full rounded-full bg-button px-6 font-extrabold text-button-ink disabled:opacity-60">
        {pending ? "Sending…" : preview ? "Sign in (preview)" : "Email me a sign-in link"}
      </button>
      {state && !state.ok && (
        <p role="alert" className="text-sm font-bold text-rose-ink">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function DeleteAccount() {
  const [state, action, pending] = useActionState(deleteAccountAction, null);
  return (
    <form action={action} className="mt-4 space-y-3">
      <label htmlFor="confirm-delete" className="block text-sm font-bold">
        Type “delete” to confirm
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="confirm-delete"
          name="confirm"
          autoComplete="off"
          className="min-h-11 flex-1 rounded-full border border-line bg-surface px-4 text-base text-ink"
        />
        <button disabled={pending} className="min-h-11 rounded-full bg-rose-ink px-5 font-extrabold text-white disabled:opacity-60 dark:text-[#2a2429]">
          {pending ? "Deleting…" : "Delete my account"}
        </button>
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-sm font-bold text-rose-ink">
          {state.message}
        </p>
      )}
    </form>
  );
}
