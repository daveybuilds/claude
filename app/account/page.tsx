import type { Metadata } from "next";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { PreviewBanner, SiteFooter, SiteHeader } from "@/components/chrome";
import { DeleteAccount, SignInForm } from "@/components/account-forms";
import { isSupabaseConfigured } from "@/lib/env";
import { getMyHis, getPublicListings, getViewer } from "@/lib/data/site";
import { relativeDay } from "@/lib/time";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const viewer = await getViewer();
  const preview = !isSupabaseConfigured();

  return (
    <>
      <SiteHeader />
      {preview && <PreviewBanner />}
      <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 pt-10 sm:px-6">
        {!viewer ? (
          <>
            <h1 className="text-4xl font-semibold">Sign in</h1>
            <p className="mt-3 text-ink-soft">
              We'll email you a link. No password, no profile: it just makes sure every “I'll say hi” is a real mom.
            </p>
            {error && (
              <p role="alert" className="mt-4 rounded-2xl bg-rose-soft p-4 font-semibold text-rose-ink">
                That sign-in link didn't work (they expire after an hour). Please ask for a new one.
              </p>
            )}
            <div className="mt-6">
              <SignInForm next={next?.startsWith("/") ? next : "/classes"} preview={preview} />
            </div>
          </>
        ) : (
          <SignedIn email={viewer.email} />
        )}
      </main>
      <SiteFooter />
    </>
  );
}

async function SignedIn({ email }: { email: string }) {
  const viewer = await getViewer();
  const [mine, listings] = await Promise.all([getMyHis(viewer), getPublicListings()]);
  return (
    <>
      <h1 className="text-4xl font-semibold">Your account</h1>
      <p className="mt-3 text-ink-soft">
        Signed in as <strong className="text-ink">{email}</strong>
      </p>

      <section aria-labelledby="going" className="mt-10">
        <h2 id="going" className="text-2xl font-semibold">
          Classes you're saying hi to
        </h2>
        {mine.length === 0 ? (
          <p className="mt-2 text-ink-soft">
            None yet. <Link href="/classes" className="font-bold text-rose-ink underline underline-offset-4">Find a class</Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {mine.map((m) => {
              const l = listings.find((x) => x.id === m.listingId);
              return (
                <li key={`${m.listingId}${m.date}`} className="rounded-2xl border border-line bg-surface p-4">
                  <Link href={`/classes#l-${m.listingId}`} className="font-bold hover:underline">
                    {l?.name ?? "A class"}
                  </Link>
                  <span className="text-ink-soft"> · {relativeDay(m.date)}</span>
                  {m.showingName && <span className="text-ink-faint"> · showing “{m.showingName}”</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form action={signOutAction} className="mt-10">
        <button className="min-h-11 rounded-full border border-line bg-surface px-5 font-bold">Sign out</button>
      </form>

      <section aria-labelledby="delete" className="mt-12 rounded-[1.5rem] border border-rose p-5">
        <h2 id="delete" className="text-2xl font-semibold">
          Delete my account
        </h2>
        <p className="mt-2 text-ink-soft">
          Removes your email, every “I'll say hi”, any first names and your Friday-list subscription. This can't be undone.
        </p>
        <DeleteAccount />
      </section>
    </>
  );
}
