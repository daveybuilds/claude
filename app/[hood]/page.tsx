import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PreviewBanner, SiteFooter, SiteHeader } from "@/components/chrome";
import { Finder } from "@/components/finder";
import { ShareButton } from "@/components/share-button";
import { FinderSkeleton } from "@/components/skeleton";
import { NEIGHBORHOOD_BY_SLUG, NEIGHBORHOODS } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { parseFilters } from "@/lib/data/listings";

// One landing page per neighborhood (/marina, /richmond …) for printed QR codes.
export const dynamicParams = false;
export function generateStaticParams() {
  return NEIGHBORHOODS.map((n) => ({ hood: n.slug }));
}

type Props = {
  params: Promise<{ hood: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const n = NEIGHBORHOOD_BY_SLUG.get((await params).hood);
  if (!n) return {};
  return {
    title: `Baby classes in ${n.name}`,
    description: `Story time, music, yoga and new-mom groups in ${n.name}, San Francisco, and moms who'll say hi at the door.`,
  };
}

export default async function HoodPage({ params, searchParams }: Props) {
  const { hood } = await params;
  const n = NEIGHBORHOOD_BY_SLUG.get(hood);
  if (!n) notFound();
  const filters = { ...parseFilters(await searchParams), hood };

  return (
    <>
      <SiteHeader />
      {!isSupabaseConfigured() && <PreviewBanner />}
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 sm:px-6 sm:pt-12">
        <p className="text-sm font-extrabold uppercase tracking-wider text-rose-ink">Hello, {n.name}</p>
        <h1 className="mt-2 text-[2.1rem] font-semibold leading-tight sm:text-5xl">Baby classes near you</h1>
        <p className="mt-3 max-w-xl text-ink-soft">
          {n.blurb}. Tap “I'll say hi” and other moms going to the same class will know there's a friendly face at the door.
        </p>
        <p className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
          <Link href="/classes" className="rounded-full border border-line bg-surface px-4 py-2 text-ink-soft hover:text-ink">
            See all of San Francisco
          </Link>
          <ShareButton path={`/${hood}`} className="rounded-full border border-line bg-surface px-4 py-2 text-ink-soft hover:text-ink">
            Share this page
          </ShareButton>
        </p>
        <div className="mt-8">
          <Suspense fallback={<FinderSkeleton />}>
            <Finder base={`/${hood}`} filters={filters} lockedHood />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
