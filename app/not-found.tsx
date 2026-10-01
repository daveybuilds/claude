import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/chrome";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 pt-16 text-center sm:px-6">
        <h1 className="text-4xl font-semibold">We couldn't find that page</h1>
        <p className="mt-3 text-ink-soft">It may have moved. The classes are still here, though.</p>
        <Link href="/classes" className="mt-8 inline-flex min-h-12 items-center rounded-full bg-button px-6 font-extrabold text-button-ink">
          Find a class
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
