import Link from "next/link";
import { PreviewBanner, SiteFooter, SiteHeader } from "@/components/chrome";
import { FridaySignup } from "@/components/friday-signup";
import { PhotoSlot } from "@/components/photo-slot";
import { ShareButton } from "@/components/share-button";
import { NEIGHBORHOODS } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";

const STEPS = [
  {
    title: "Pick your corner and baby's age",
    body: "Story time, music, baby yoga and new-mom groups, from the Marina to the Sunset. Filter by newborn, 6–12 months or 1–2 years.",
    tone: "bg-rose-soft text-rose-ink",
  },
  {
    title: "Tap “I'll say hi”",
    body: "It's a quiet signal: you'll see how many other moms are going too. Add your first name if you like, or stay anonymous.",
    tone: "bg-lavender-soft text-lavender-ink",
  },
  {
    title: "Say hello at the door after",
    body: "Moms who tap meet by the entrance when class ends. A quick hello, no plans needed. Stay for a chat, or don't.",
    tone: "bg-sage-soft text-sage-ink",
  },
];

const SOON = [
  { title: "Coffee after", body: "An easy coffee nearby with moms whose babies are the same age." },
  { title: "Mom-friendly places", body: "Cafés with room for strollers, changing tables and a kind welcome." },
  { title: "The Friday email", body: "This weekend's picks for your neighborhood and your baby's age." },
];

function ExampleCard({
  className,
  type,
  tone,
  title,
  when,
  count,
  faces,
}: {
  className: string;
  type: string;
  tone: string;
  title: string;
  when: string;
  count: string;
  faces: string[];
}) {
  return (
    <div className={`w-[17.5rem] rounded-[1.6rem] border border-line bg-surface p-4 shadow-lift ${className}`}>
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{type}</span>
      <p className="mt-2.5 font-display text-lg font-semibold leading-snug">{title}</p>
      <p className="text-sm text-ink-soft">{when}</p>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex -space-x-2">
          {faces.map((c, i) => (
            <span key={i} className="h-7 w-7 rounded-full border-2 border-surface" style={{ background: c }} />
          ))}
        </div>
        <p className="text-sm font-bold text-rose-ink">{count}</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      {!isSupabaseConfigured() && <PreviewBanner />}
      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto w-full max-w-6xl overflow-hidden px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:overflow-visible">
          <svg aria-hidden="true" viewBox="0 0 600 600" className="pointer-events-none absolute -right-40 -top-24 -z-10 w-[36rem] opacity-80 sm:-right-24">
            <path d="M421 79c68 44 120 129 108 211s-91 162-180 186-187-8-246-72S16 237 58 161 205 49 284 39s69-4 137 40Z" fill="var(--rose-soft)" />
          </svg>
          <svg aria-hidden="true" viewBox="0 0 600 600" className="pointer-events-none absolute -bottom-48 -left-48 -z-10 w-[28rem] opacity-80">
            <path d="M432 108c56 52 92 132 70 205s-102 140-187 150-174-38-205-108 6-163 70-218 196-81 252-29Z" fill="var(--lavender-soft)" />
          </svg>

          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-rose-ink">For new moms in San Francisco</p>
              <h1 className="mt-4 text-[2.6rem] font-semibold leading-[1.08] tracking-[-0.01em] sm:text-6xl lg:text-[4.1rem]">
                You're not the only one at the{" "}
                <span className="italic text-rose-ink [font-variation-settings:'SOFT'_100]">10am class.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
                Find baby-friendly classes near you, and quietly let other moms know you'll say hi at the door afterwards.
                No profiles, no group chats, no awkward approaching strangers.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/classes?when=week"
                  className="inline-flex min-h-13 items-center justify-center rounded-full bg-button px-7 text-base font-extrabold text-button-ink shadow-soft transition-opacity hover:opacity-90"
                >
                  Find something this week
                </Link>
                <ShareButton className="inline-flex min-h-13 items-center justify-center rounded-full border-2 border-rose bg-surface px-7 text-base font-extrabold text-rose-ink hover:bg-rose-soft" />
              </div>
            </div>

            <div className="relative mx-auto h-[23rem] w-full max-w-[26rem] sm:h-[26rem]">
              <PhotoSlot slot="hero" priority className="absolute inset-x-6 inset-y-4 sm:inset-x-10" />
              <ExampleCard
                className="float absolute left-0 top-2 [--tilt:-3deg]"
                type="Story time"
                tone="bg-rose-soft text-rose-ink"
                title="Tuesday storytime"
                when="Marina Library · 10:30am"
                count="3 moms are saying hi"
                faces={["var(--rose)", "var(--lavender)", "var(--sage)"]}
              />
              <ExampleCard
                className="float float-delay absolute bottom-2 right-0 [--tilt:2.5deg]"
                type="Yoga"
                tone="bg-sage-soft text-sage-ink"
                title="Baby & Me Yoga"
                when="Wednesday · 10am"
                count="Ana and 4 others"
                faces={["var(--lavender)", "var(--sage)", "var(--rose)", "var(--lavender)"]}
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-8 bg-surface py-16 sm:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 id="how-title" className="text-3xl font-semibold sm:text-4xl">
              How it works
            </h2>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="rounded-[var(--radius-card)] border border-line bg-bg p-6">
                  <span className={`grid h-11 w-11 place-items-center rounded-full font-display text-xl font-semibold ${s.tone}`}>
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">{s.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-8 max-w-2xl text-sm text-ink-soft">
              Always a public place, always the class entrance, always after the session ends. Nobody sees who you are unless
              you choose to show your first name, and then only to other moms going to the same class.
            </p>
          </div>
        </section>

        {/* Neighborhoods */}
        <section aria-labelledby="hoods-title" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2 id="hoods-title" className="text-3xl font-semibold sm:text-4xl">
            Find your corner
          </h2>
          <ul className="mt-6 flex flex-wrap gap-2">
            {NEIGHBORHOODS.map((n) => (
              <li key={n.slug}>
                <Link
                  href={`/${n.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 font-bold text-ink-soft hover:border-ink-faint hover:text-ink"
                >
                  {n.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Coming soon + Friday list */}
        <section aria-labelledby="soon-title" className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 id="soon-title" className="text-3xl font-semibold sm:text-4xl">
              Coming soon
            </h2>
            <ul className="mt-6 space-y-3">
              {SOON.map((s, i) => (
                <li key={s.title} className="flex gap-4 rounded-[1.5rem] border border-dashed border-line p-5">
                  <span
                    aria-hidden="true"
                    className="mt-1 h-4 w-4 shrink-0 rounded-full"
                    style={{ background: ["var(--rose)", "var(--lavender)", "var(--sage)"][i] }}
                  />
                  <div>
                    <h3 className="text-lg font-semibold">{s.title}</h3>
                    <p className="text-ink-soft">{s.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div id="friday" className="rounded-[2rem] bg-lavender-soft p-6 sm:p-8">
            <h2 className="text-3xl font-semibold">The Friday list</h2>
            <p className="mt-2 text-ink-soft">
              A short email of next week's picks for your neighborhood and your baby's age. Be first to get it.
            </p>
            <div className="mt-6">
              <FridaySignup neighborhoods={NEIGHBORHOODS.map(({ slug, name }) => ({ slug, name }))} />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
