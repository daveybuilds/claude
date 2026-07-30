export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Step 1 of 5 &middot; Setup check
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
          Scaffold is live.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          Next.js App Router + Tailwind, deployed and serving. If you can read
          this on your phone, the pipeline works and we can start building the
          page.
        </p>
      </div>
    </main>
  );
}
