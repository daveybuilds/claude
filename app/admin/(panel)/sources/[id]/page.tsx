import Link from "next/link";
import { notFound } from "next/navigation";
import { SourceForm } from "@/components/admin/forms";
import { listSources } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

export default async function EditSource({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = id === "new" ? null : ((await listSources()).find((s) => s.id === id) ?? null);
  if (id !== "new" && !source) notFound();
  return (
    <div className="max-w-3xl">
      <Link href="/admin/sources" className="text-sm font-bold text-ink-soft hover:text-ink">
        ← All sources
      </Link>
      <h1 className="mt-2 text-3xl font-semibold">{source ? source.name : "Add a source"}</h1>
      {!source && (
        <p className="mt-2 text-sm text-ink-soft">
          Prefer a calendar feed (ics) or API if the provider has one. Use html for ordinary pages, playwright for JavaScript
          booking calendars, and manual for Instagram-only studios or anything we shouldn't scrape.
        </p>
      )}
      <div className="mt-6">
        <SourceForm source={source} />
      </div>
    </div>
  );
}
