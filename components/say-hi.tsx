"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reportNameAction, sendLinkAction, setNameAction, toggleHiAction, type HiState } from "@/app/actions";
import { MEETING_NOTE } from "@/lib/constants";
import { FIRST_NAME_PATTERN } from "@/lib/moderation";

const PENDING_KEY = "lsf_pending_hi";
const NAME_KEY = "lsf_first_name";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function countText(count: number, on: boolean): string {
  if (on) {
    const others = count - 1;
    if (others <= 0) return "You're the first to say hi";
    return `You and ${others} other ${others === 1 ? "mom" : "moms"} are saying hi`;
  }
  if (count === 0) return "Be the first to say hi";
  return `${count} ${count === 1 ? "mom is" : "moms are"} saying hi`;
}

interface Props {
  listingId: string;
  date: string;
  dateLabel: string;
  initial: HiState;
  signedIn: boolean;
  preview: boolean;
  returnPath: string;
}

export function SayHi({ listingId, date, dateLabel, initial, signedIn, preview, returnPath }: Props) {
  const [state, setState] = useState<HiState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [askSignIn, setAskSignIn] = useState(false);
  const [pending, startTransition] = useTransition();
  const [bump, setBump] = useState(0);
  const router = useRouter();
  const ids = useId();
  const key = `${listingId}|${date}`;

  const apply = (next: HiState) => {
    if (next.needsSignIn) {
      setAskSignIn(true);
      return;
    }
    setState(next);
    setError(next.ok ? null : (next.error ?? null));
  };

  const toggle = (on: boolean) => {
    if (!signedIn) {
      storage()?.setItem(PENDING_KEY, key);
      setAskSignIn(true);
      return;
    }
    // Optimistic: flip straight away, then settle on the server's answer.
    setState((s) => ({ ...s, on, count: Math.max(0, s.count + (on ? 1 : -1)) }));
    setBump((b) => b + 1);
    startTransition(async () => apply(await toggleHiAction(listingId, date, on)));
  };

  // Finish a tap that started before the sign-in email.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current || !signedIn || state.on) return;
    if (storage()?.getItem(PENDING_KEY) === key) {
      resumed.current = true;
      storage()?.removeItem(PENDING_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off resume after sign-in
      toggle(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  return (
    <div className="mt-4 border-t border-dashed border-line pt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          aria-pressed={state.on}
          aria-describedby={`${ids}-count`}
          disabled={pending}
          onClick={() => toggle(!state.on)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-[0.95rem] font-extrabold transition-colors disabled:opacity-70 ${
            state.on
              ? "bg-rose-ink text-white shadow-soft dark:text-[#2a2429]"
              : "border-2 border-rose bg-rose-soft text-rose-ink hover:bg-rose"
          }`}
        >
          <span aria-hidden="true" key={bump} className={bump ? "pop inline-block" : "inline-block"}>
            {state.on ? "✓" : "👋"}
          </span>
          {state.on ? "Saying hi" : "I'll say hi"}
          <span className="sr-only"> at {dateLabel}</span>
        </button>
        <p id={`${ids}-count`} className="text-sm font-semibold text-ink-soft" aria-live="polite">
          {countText(state.count, state.on)}
          <span className="text-ink-faint"> · {dateLabel}</span>
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm font-semibold text-rose-ink">
          {error}
        </p>
      )}

      {askSignIn && !signedIn && (
        <SignInInline
          returnPath={returnPath}
          preview={preview}
          onPreviewSignedIn={() => router.refresh()}
          onClose={() => setAskSignIn(false)}
        />
      )}

      {state.on && (
        <div className="mt-3 space-y-3 rounded-2xl bg-sage-soft p-4 text-sm text-sage-ink">
          <p className="font-semibold">{MEETING_NOTE}</p>
          <NamesList
            names={state.names.filter((n) => !n.mine)}
            onReport={(nameId, reason) => startTransition(async () => apply(await reportNameAction(listingId, date, nameId, reason)))}
          />
          <MyName
            showingName={state.showingName}
            pending={pending}
            onSave={(name) => startTransition(async () => apply(await setNameAction(listingId, date, name)))}
          />
        </div>
      )}
    </div>
  );
}

function SignInInline({
  returnPath,
  preview,
  onPreviewSignedIn,
  onClose,
}: {
  returnPath: string;
  preview: boolean;
  onPreviewSignedIn: () => void;
  onClose: () => void;
}) {
  const [result, action, pending] = useActionState(sendLinkAction, null);
  const id = useId();
  useEffect(() => {
    if (result?.ok && result.message === "preview") onPreviewSignedIn();
  }, [result, onPreviewSignedIn]);

  if (result?.ok && result.message !== "preview") {
    return (
      <p role="status" className="mt-3 rounded-2xl bg-lavender-soft p-4 text-sm font-semibold text-lavender-ink">
        {result.message} When you come back, your “I'll say hi” will be waiting.
      </p>
    );
  }
  return (
    <form action={action} className="mt-3 rounded-2xl bg-lavender-soft p-4 text-sm">
      <p className="font-semibold text-lavender-ink">
        Pop in your email so every count is a real mom. We'll send a sign-in link: no password, no profile.
        {preview && " (Preview mode: you're signed in straight away.)"}
      </p>
      <input type="hidden" name="next" value={returnPath} />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          className="min-h-11 flex-1 rounded-full border border-line bg-surface px-4 text-base text-ink placeholder:text-ink-faint"
        />
        <button
          disabled={pending}
          className="min-h-11 rounded-full bg-button px-5 font-extrabold text-button-ink disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send link"}
        </button>
      </div>
      {result && !result.ok && (
        <p role="alert" className="mt-2 font-semibold text-rose-ink">
          {result.message}
        </p>
      )}
      <button type="button" onClick={onClose} className="mt-2 text-xs font-semibold text-ink-soft underline">
        Not now
      </button>
    </form>
  );
}

function NamesList({ names, onReport }: { names: HiState["names"]; onReport: (id: string, reason: string) => void }) {
  const [reporting, setReporting] = useState<string | null>(null);
  if (!names.length) return null;
  return (
    <div>
      <p className="font-semibold">Also saying hi:</p>
      <ul className="mt-1.5 flex flex-wrap gap-2">
        {names.map((n) => (
          <li key={n.id} className="flex items-center gap-1 rounded-full bg-surface py-1 pl-3 pr-1 text-ink">
            {/* React escapes text, so a name can never inject markup. */}
            <span className="font-bold">{n.first_name}</span>
            {reporting === n.id ? (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onReport(n.id, "Reported from class card");
                    setReporting(null);
                  }}
                  className="rounded-full bg-rose-soft px-2 py-1 text-xs font-bold text-rose-ink"
                >
                  Report name
                </button>
                <button type="button" onClick={() => setReporting(null)} className="rounded-full px-2 py-1 text-xs text-ink-soft">
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setReporting(n.id)}
                aria-label={`Report the name ${n.first_name}`}
                className="rounded-full px-2 py-1 text-xs text-ink-faint hover:text-rose-ink"
              >
                ⋯
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MyName({ showingName, pending, onSave }: { showingName: string | null; pending: boolean; onSave: (n: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const id = useId();

  if (showingName) {
    return (
      <p className="flex flex-wrap items-center gap-2">
        <span>
          Showing your first name: <strong className="text-ink">{showingName}</strong>
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => onSave(null)}
          className="min-h-9 rounded-full border border-sage-ink/30 px-3 font-bold text-sage-ink hover:bg-surface"
        >
          Hide my name
        </button>
      </p>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setName(storage()?.getItem(NAME_KEY) ?? "");
          setEditing(true);
        }}
        className="min-h-9 rounded-full border border-sage-ink/30 px-3 font-bold text-sage-ink hover:bg-surface"
      >
        Show my first name
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!FIRST_NAME_PATTERN.test(trimmed)) {
          setHint("Letters only, up to 20.");
          return;
        }
        storage()?.setItem(NAME_KEY, trimmed);
        setEditing(false);
        onSave(trimmed);
      }}
      className="space-y-2"
    >
      <label htmlFor={`${id}-name`} className="block font-semibold">
        First name (optional)
      </label>
      <div className="flex gap-2">
        <input
          id={`${id}-name`}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setHint(null);
          }}
          maxLength={20}
          autoComplete="given-name"
          autoCapitalize="words"
          className="min-h-11 w-full max-w-[14rem] rounded-full border border-line bg-surface px-4 text-base text-ink"
        />
        <button disabled={pending} className="min-h-11 rounded-full bg-button px-4 font-extrabold text-button-ink">
          Show it
        </button>
      </div>
      <p className="text-xs">
        {hint ?? "Only moms who also tapped “I'll say hi” for this class can see it. It's deleted after the class."}
      </p>
      <button type="button" onClick={() => setEditing(false)} className="text-xs font-semibold underline">
        Stay anonymous
      </button>
    </form>
  );
}
