import Link from "next/link";

export function LogoMark({ className = "" }: { className?: string }) {
  // Two overlapping soft shapes: two moms, one hello.
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <path d="M13 4c6 0 10 4.5 10 10.5S18.5 27 12.5 27 3 22 3.5 15.5 7 4 13 4Z" fill="var(--rose)" />
      <path d="M21 9c5 0 8.5 3.6 8 9-.4 5.2-4.4 9-9.4 8.6S12 22.5 12.7 17.3 16 9 21 9Z" fill="var(--lavender)" opacity=".9" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-5 sm:px-6 sm:pt-7">
      <Link href="/" className="flex items-center gap-2 rounded-full py-1 pr-2" aria-label="Little SF home">
        <LogoMark className="h-8 w-8" />
        <span className="font-display text-[1.35rem] font-semibold tracking-tight">Little SF</span>
      </Link>
      <nav aria-label="Main" className="flex items-center gap-1 text-[0.95rem] font-semibold">
        <Link href="/classes" className="rounded-full px-3 py-2 text-ink-soft hover:bg-surface hover:text-ink">
          Classes
        </Link>
        <Link href="/account" className="rounded-full px-3 py-2 text-ink-soft hover:bg-surface hover:text-ink">
          Account
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-bg-deep">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 text-sm text-ink-soft sm:grid-cols-[1fr_auto] sm:px-6">
        <div className="max-w-xl space-y-2">
          <p className="flex items-center gap-2 font-display text-lg text-ink">
            <LogoMark className="h-6 w-6" /> Little SF
          </p>
          <p>
            Class times change. We check our sources every day and show when each listing was last verified, but
            please confirm with the provider before you head out.
          </p>
          <p>Meet in public places only. Little SF never shares your location.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-start gap-x-5 gap-y-2 font-semibold sm:flex-col">
          <Link href="/classes" className="hover:text-ink">Find a class</Link>
          <Link href="/#how" className="hover:text-ink">How it works</Link>
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/account" className="hover:text-ink">Your account</Link>
        </nav>
      </div>
    </footer>
  );
}

export function PreviewBanner() {
  return (
    <p className="mx-auto mt-3 w-fit max-w-[calc(100%-2rem)] rounded-full bg-butter-soft px-4 py-1.5 text-center text-xs font-semibold text-butter-ink">
      Preview mode: sample data, pretend sign-in, nothing is saved. Connect Supabase to go live.
    </p>
  );
}
