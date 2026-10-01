import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/chrome";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Little SF stores, who can see it, and how to delete it.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 pt-10 sm:px-6">
        <h1 className="text-4xl font-semibold">Privacy, simply</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Little SF is for new parents, so we keep as little as possible and never share your whereabouts.
        </p>

        <div className="mt-10 space-y-8 leading-relaxed [&_h2]:text-2xl [&_h2]:font-semibold [&_p]:mt-2 [&_p]:text-ink-soft [&_li]:text-ink-soft">
          <section>
            <h2>What we store</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Your email address, so you can sign in with a link (no password).</li>
              <li>Each “I'll say hi” tap: which class, which date. That's it.</li>
              <li>Your first name, only if you choose to show it for a class.</li>
              <li>If you join the Friday list: your email, neighborhood and baby's age group.</li>
            </ul>
            <p>No profiles, photos, surnames, messages, phone numbers or location tracking. Ever.</p>
          </section>

          <section>
            <h2>Who sees what</h2>
            <p>
              Everyone sees the <em>number</em> of moms saying hi to a class. Nobody sees who they are. If you choose to show your
              first name, only signed-in moms who have also tapped “I'll say hi” for that same class on that same day can see it.
              This is enforced by our database, not just hidden on screen.
            </p>
          </section>

          <section>
            <h2>How long we keep it</h2>
            <p>
              First names are deleted the day after the class. Taps are deleted 30 days after the class. Your email stays until
              you delete your account.
            </p>
          </section>

          <section>
            <h2>Staying safe</h2>
            <p>
              The meeting point is always the class entrance, after the session ends: a public place, with no plans required. If
              a name looks wrong, tap the ⋯ next to it to report it; it's hidden straight away while we take a look.
            </p>
          </section>

          <section>
            <h2>Deleting your data</h2>
            <p>
              Go to <Link href="/account" className="font-bold text-rose-ink underline underline-offset-4">your account</Link>{" "}
              and choose “Delete my account”. Your email, taps, names and Friday-list subscription are removed straight away.
            </p>
          </section>

          <section>
            <h2>Class listings</h2>
            <p>
              We collect class times from providers' public pages and calendars, respecting their robots.txt and terms, and we
              never copy their descriptions. Times change, so we always link to the source and show when we last checked.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
