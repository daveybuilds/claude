import { ImportForm } from "@/components/admin/forms";
import { listSources } from "@/lib/data/admin";
import { CSV_COLUMNS } from "@/lib/pipeline/adapters/manual";

export const dynamic = "force-dynamic";

const EXAMPLE = `source,name,type,day,start_time,end_time,location,address,neighborhood,ages,price,price_details,url
jamaroo-kids,Baby Music & Movement,music,Thursday,9:30am,10:15am,JAMaROO Kids,2116 Union St,cow-hollow,6-18 months,$35,drop-in,https://jamarookids.com`;

export default async function ImportPage() {
  const sources = (await listSources()).map(({ slug, name }) => ({ slug, name }));
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <h1 className="text-3xl font-semibold">Update times by CSV</h1>
        <p className="mt-2 text-sm text-ink-soft">
          For manual sources (Instagram-only studios and the like). Rows matching an existing listing (same provider, name, day
          and start time) are updated; new rows are added. Everything imported counts as checked today and goes live.
        </p>
        <div className="mt-6">
          <ImportForm sources={sources} />
        </div>
      </div>
      <div className="text-sm">
        <h2 className="text-xl font-semibold">Columns</h2>
        <p className="mt-2 text-ink-soft">Only <code>name</code> is required. Leave anything you don't know empty.</p>
        <p className="mt-2 font-mono text-xs leading-relaxed text-ink-soft">{CSV_COLUMNS.join(", ")}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
          <li><code>day</code>: Monday…Sunday (or 0–6, Sunday = 0) for weekly classes</li>
          <li><code>date</code>: YYYY-MM-DD for a one-off event</li>
          <li><code>type</code>: music, yoga, storytime, support or play</li>
          <li><code>neighborhood</code>: e.g. marina, cow-hollow, richmond</li>
        </ul>
        <h2 className="mt-6 text-xl font-semibold">Example</h2>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-bg-deep p-3 text-xs">{EXAMPLE}</pre>
      </div>
    </div>
  );
}
