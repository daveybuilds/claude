import type { Metadata } from "next";
import { Suspense } from "react";
import { PreviewBanner, SiteFooter, SiteHeader } from "@/components/chrome";
import { Finder } from "@/components/finder";
import { FinderSkeleton } from "@/components/skeleton";
import { neighborhoodName } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { parseFilters } from "@/lib/data/listings";

export const metadata: Metadata = {
  title: "Find a baby class",
  description: "Baby-friendly classes across San Francisco: story time, music, yoga and new-mom groups, filtered by neighborhood and baby's age.",
};

export default async function ClassesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams);
  const area = neighborhoodName(filters.hood);
  return (
    <>
      <SiteHeader />
      {!isSupabaseConfigured() && <PreviewBanner />}
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 sm:px-6 sm:pt-12">
        <h1 className="text-[2.1rem] font-semibold leading-tight sm:text-5xl">
          {area ? `Baby classes in ${area}` : "Find something this week"}
        </h1>
        <p className="mt-3 max-w-xl text-ink-soft">
          Tap “I'll say hi” on a class and you'll see how many other moms are going. Afterwards, pause by the door for a
          quick hello.
        </p>
        <div className="mt-8">
          <Suspense fallback={<FinderSkeleton />}>
            <Finder base="/classes" filters={filters} />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
