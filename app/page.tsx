import { PhoneMockup } from "./_components/phone-mockup";

const STEPS = [
  {
    title: "Connect your tools",
    body: "Link what you already run on — field service, payments, lead sources. A few minutes, once.",
  },
  {
    title: "We pull your numbers",
    body: "Every night we gather revenue, jobs booked, and what each lead source actually produced.",
  },
  {
    title: "You get a text",
    body: "On your schedule. 7am, end of day, Monday mornings — whenever you'll actually read it.",
  },
];

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
              Your numbers, simplified and texted to your phone while
              you&rsquo;re on the go.
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

        {/* The problem, in words an owner will recognize as their own week */}
        <section className="border-t border-slate-200 bg-slate-50 py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <h2 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.015em] text-slate-900 sm:text-4xl">
                Your numbers are scattered. You&rsquo;re not at a desk.
              </h2>
              <div className="mt-6 space-y-4 text-lg leading-relaxed text-slate-600">
                <p>
                  Jobs and revenue live in Housecall Pro or Jobber. Payments sit
                  with your processor. What you&rsquo;re spending on leads is
                  split between Google, Angi, and wherever else you buy. None of
                  it talks to each other.
                </p>
                <p>
                  So getting a straight answer to &ldquo;how did we do?&rdquo;
                  means logging into four things at a desk you&rsquo;re never
                  at. Which means most weeks, nobody checks.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.015em] text-slate-900 sm:text-4xl">
              How it works
            </h2>
            <ol className="mt-10 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-slate-600">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Who it's for */}
        <section className="bg-slate-900 py-20 lg:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <h2 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.015em] text-white sm:text-4xl">
                Built for owners who run the business from the truck.
              </h2>
              <div className="mt-6 space-y-4 text-lg leading-relaxed text-slate-300">
                <p>
                  Home-service and trades companies with 1 to 20 techs &mdash;
                  HVAC, plumbing, electrical, landscaping, cleaning. If you run
                  on a field-service app, take card payments, and buy leads,
                  this fits.
                </p>
                <p className="text-base text-slate-400">
                  Our examples use HVAC numbers because specifics are more
                  useful than vague ones. The pitch is the same whatever you
                  run.
                </p>
              </div>
            </div>
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

      <footer className="border-t border-slate-200 py-10">
        <div className="mx-auto max-w-6xl px-6 space-y-3 text-sm leading-relaxed text-slate-500 [&>*]:max-w-2xl">
          <p>
            <span className="font-semibold text-slate-900">MetricText</span>{" "}
            is early. We&rsquo;re talking to service-business owners now to
            figure out what belongs in that morning text and what doesn&rsquo;t.
            If you&rsquo;ve got opinions, we want to hear them.
          </p>
          <p>&copy; {new Date().getFullYear()} MetricText</p>
        </div>
      </footer>
    </>
  );
}
