import { PhoneMockup } from "./_components/phone-mockup";

export default function Home() {
  return (
    <>
      <header className="mx-auto w-full max-w-6xl px-6 pt-7 sm:pt-9">
        <span className="text-[15px] font-semibold tracking-tight text-slate-900">
          Metric<span className="text-accent">Text</span>
        </span>
      </header>

      <main className="flex-1">
        {/* Hero + the sample text, which carries the whole pitch */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-10 sm:pt-14 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:pb-28 lg:pt-16">
          <div>
            <h1 className="text-[2.15rem] font-semibold leading-[1.08] tracking-[-0.02em] text-slate-900 sm:text-5xl lg:text-[3.35rem]">
              Your numbers, texted to you every morning.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 sm:text-xl">
              Revenue, jobs booked, and what your ad spend is actually bringing
              in — pulled from the tools you already use. Built for service
              owners who are never at a desk.
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900 sm:text-xl">
              No dashboards. Just a text.
            </p>

            <div className="mt-9">
              <a
                href="#waitlist"
                className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
              >
                Join the waitlist
              </a>
              <p className="mt-4 text-sm text-slate-500">
                Free while we&rsquo;re building. No spam, no sales calls.
              </p>
            </div>
          </div>

          <div className="mt-14 lg:mt-0">
            <PhoneMockup />
            <p className="mx-auto mt-6 max-w-xs text-center text-sm text-slate-500">
              One text every morning. That&rsquo;s the whole thing.
            </p>
          </div>
        </section>

        {/* Placeholder — the real waitlist form replaces this in step 4 */}
        <section
          id="waitlist"
          className="scroll-mt-8 border-t border-slate-200 bg-slate-50 px-6 py-20"
        >
          <div className="mx-auto max-w-md text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Join the waitlist
            </h2>
            <p className="mt-3 text-base text-slate-600">
              The signup form goes here next.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
