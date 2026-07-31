import { PhoneMockup } from "./_components/phone-mockup";
import { DigestContentsCard, LeadSourceCard } from "./_components/floating-cards";

const STEPS = [
  {
    title: "Connect your tools",
    body: "Link what you already run on — field service, payments, lead sources. A few minutes, once.",
    tone: "bg-periwinkle",
  },
  {
    title: "We pull your numbers",
    body: "Every night we gather revenue, jobs booked, and what each lead source actually produced.",
    tone: "bg-butter",
  },
  {
    title: "You get a text",
    body: "On your schedule. 7am, end of day, Monday mornings — whenever you'll actually read it.",
    tone: "bg-mint",
  },
];

export default function Home() {
  return (
    <>
      <header className="mx-auto w-full max-w-6xl px-6 pt-8 sm:pt-10">
        <span className="text-[17px] font-extrabold tracking-tight text-ink">
          MetricText
        </span>
      </header>

      <main className="flex-1">
        {/* Hero — headline left, supporting line right, phone on a soft panel */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-8 sm:pt-12">
          <div className="lg:flex lg:items-start lg:justify-between lg:gap-14">
            <h1 className="max-w-3xl text-[2.15rem] font-extrabold leading-[1.58] tracking-[-0.025em] text-ink sm:text-[2.7rem] sm:leading-[1.5] lg:text-[3.05rem] lg:leading-[1.42]">
              The numbers you need to run your business &mdash;{" "}
              <span className="box-decoration-clone rounded-2xl bg-ink px-3 py-0.5 text-white sm:px-3.5 sm:py-1">
                texted to your phone
              </span>{" "}
              while you&rsquo;re on the go.
            </h1>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-ink-soft lg:mt-4 lg:shrink-0">
              Revenue, jobs booked, and what your ad spend is actually bringing
              in — pulled from the tools you already use. Built for service
              owners who are never at a desk.
            </p>
          </div>

          <p className="mt-8 max-w-md text-xl font-bold leading-snug text-ink sm:text-2xl">
            No dashboards. Just a text.
          </p>

          <div className="mt-8">
            <a
              href="#waitlist"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-ink px-8 py-4 text-base font-bold text-white transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:w-auto"
            >
              Join the waitlist
            </a>
            <p className="mt-4 text-sm text-ink-faint">
              Free while we&rsquo;re building. No spam, no sales calls.
            </p>
          </div>

          {/* The sample text, staged on a panel with the two cards flanking it */}
          <div className="relative mt-12 rounded-[2.25rem] bg-panel px-4 py-12 sm:px-6 lg:mt-16 lg:px-10 lg:py-20">
            <PhoneMockup />

            {/* On large screens the cards float over the panel, as in the
                reference; below that they stack underneath the phone. */}
            <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center lg:hidden">
              <DigestContentsCard />
              <LeadSourceCard />
            </div>

            <div className="pointer-events-none hidden lg:block">
              <div className="absolute left-8 top-1/2 -translate-y-1/2 -rotate-[4deg] xl:left-14">
                <DigestContentsCard />
              </div>
              <div className="absolute right-8 top-1/2 -translate-y-[35%] rotate-[3deg] xl:right-14">
                <LeadSourceCard />
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-ink-faint">
            One text every morning. That&rsquo;s the whole thing.
          </p>
        </section>

        {/* The problem, in words an owner will recognize as their own week */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <h2 className="text-[1.85rem] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink sm:text-4xl">
                Your numbers are scattered. You&rsquo;re not at a desk.
              </h2>
              <div className="mt-6 space-y-4 text-lg leading-relaxed text-ink-soft">
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

        {/* How it works — pastel tiles, echoing the reference's action grid */}
        <section className="pb-16 lg:pb-24">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-[1.85rem] font-extrabold leading-[1.15] tracking-[-0.02em] text-ink sm:text-4xl">
              How it works
            </h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <li
                  key={step.title}
                  className={`rounded-[1.75rem] ${step.tone} p-6`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-extrabold tracking-tight text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink/70">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Who it's for */}
        <section className="pb-16 lg:pb-24">
          <div className="mx-auto max-w-6xl px-6">
            <div className="rounded-[2.25rem] bg-ink px-7 py-14 lg:px-14 lg:py-20">
              <div className="max-w-2xl">
                <h2 className="text-[1.85rem] font-extrabold leading-[1.15] tracking-[-0.02em] text-white sm:text-4xl">
                  Built for owners who run the business from the truck.
                </h2>
                <div className="mt-6 space-y-4 text-lg leading-relaxed text-white/75">
                  <p>
                    Home-service and trades companies with 1 to 20 techs &mdash;
                    HVAC, plumbing, electrical, landscaping, cleaning. If you
                    run on a field-service app, take card payments, and buy
                    leads, this fits.
                  </p>
                  <p className="text-base text-white/55">
                    Our examples use HVAC numbers because specifics are more
                    useful than vague ones. The pitch is the same whatever you
                    run.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Placeholder — the real waitlist form replaces this in step 4 */}
        <section id="waitlist" className="scroll-mt-8 bg-cream-soft px-6 py-20">
          <div className="mx-auto max-w-md text-center">
            <h2 className="text-[1.85rem] font-extrabold tracking-[-0.02em] text-ink">
              Join the waitlist
            </h2>
            <p className="mt-3 text-base text-ink-soft">
              The signup form goes here next.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline py-10">
        <div className="mx-auto max-w-6xl space-y-3 px-6 text-sm leading-relaxed text-ink-faint [&>*]:max-w-2xl">
          <p>
            <span className="font-bold text-ink">MetricText</span>{" "}
            is early.
            We&rsquo;re talking to service-business owners now to figure out what
            belongs in that morning text and what doesn&rsquo;t. If you&rsquo;ve
            got opinions, we want to hear them.
          </p>
          <p>&copy; {new Date().getFullYear()} MetricText</p>
        </div>
      </footer>
    </>
  );
}
