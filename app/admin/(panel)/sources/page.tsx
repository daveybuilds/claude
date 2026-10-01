import Link from "next/link";
import { clearFlagAction } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/bits";
import { RunSourceButton } from "@/components/admin/forms";
import { listListings, listSources } from "@/lib/data/admin";
import { sourcesNeedingAttention } from "@/lib/pipeline/digest";

export const dynamic = "force-dynamic";

export default async function SourcesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const [sources, listings] = await Promise.all([listSources(), listListings()]);
  const attention = new Map(sourcesNeedingAttention(sources).map((a) => [a.source.id, a.reason]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Sources</h1>
        <Link href="/admin/sources/new" className="rounded-full bg-button px-4 py-2 font-extrabold text-button-ink">
          Add a source
        </Link>
      </div>
      {saved && <p role="status" className="mt-3 rounded-xl bg-sage-soft p-3 text-sm font-bold text-sage-ink">Saved.</p>}
      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {sources.map((s) => {
          const problem = attention.get(s.id);
          const count = listings.filter((l) => l.source_id === s.id && l.status === "approved").length;
          return (
            <li key={s.id} className={`rounded-2xl border bg-surface p-4 ${problem ? "border-rose" : "border-line"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/admin/sources/${s.id}`} className="font-bold hover:underline">
                    {s.name}
                  </Link>
                  <p className="text-xs text-ink-faint">
                    {s.slug} · {s.method} · every {s.check_frequency === "daily" ? "day" : s.check_frequency === "weekly" ? "week" : "month"}
                    {s.trusted ? " · trusted" : ""}
                    {!s.active ? " · inactive" : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                    !s.active ? "bg-bg-deep text-ink-faint" : problem ? "bg-rose-soft text-rose-ink" : s.method === "manual" ? "bg-lavender-soft text-lavender-ink" : "bg-sage-soft text-sage-ink"
                  }`}
                >
                  {!s.active ? "off" : problem ? "attention" : s.method === "manual" ? "manual" : "healthy"}
                </span>
              </div>
              <dl className="mt-3 space-y-0.5 text-sm text-ink-soft">
                <div>Last success: {s.last_success_at?.slice(0, 16).replace("T", " ") ?? "never"}</div>
                <div>Last run found: {s.last_count ?? "—"} · live listings: {count}</div>
                {(problem || s.last_error) && <div className="text-rose-ink">{problem ?? s.last_error}</div>}
              </dl>
              <div className="mt-3 flex flex-wrap items-start gap-2">
                {s.method !== "manual" && <RunSourceButton slug={s.slug} />}
                {s.needs_attention && <ActionButton action={clearFlagAction.bind(null, s.id)}>Clear flag</ActionButton>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-sm text-ink-soft">
        Playwright sources need a browser, so “Run now” only works where Chromium is installed (your computer or the GitHub
        Actions workflow). From a terminal: <code className="rounded bg-bg-deep px-1">npm run collect -- --source slug</code>
      </p>
    </div>
  );
}
