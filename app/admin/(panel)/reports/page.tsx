import { resolveReportAction } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/bits";
import { listReports } from "@/lib/data/admin";
import { formatDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await listReports();
  const open = reports.filter((r) => r.status === "open");
  const done = reports.filter((r) => r.status !== "open");
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Reported names</h1>
        <p className="mt-1 text-sm text-ink-soft">
          A reported name is hidden straight away. Remove it for good, or restore it if it looks fine. Names are deleted after the
          class date either way.
        </p>
      </div>
      {open.length === 0 ? (
        <p className="text-ink-faint">No open reports. 🌿</p>
      ) : (
        <ul className="space-y-3">
          {open.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
              {/* React escapes the name: it is shown as text, never as markup. */}
              <p className="text-lg font-bold">“{r.first_name}”</p>
              <p className="text-sm text-ink-soft">
                {r.listing_name ?? "Class"} · {formatDate(r.occurrence_date)} · reported {r.created_at.slice(0, 10)}
              </p>
              {r.reason && <p className="mt-1 text-sm text-ink-faint">{r.reason}</p>}
              <div className="mt-3 flex gap-2">
                <ActionButton action={resolveReportAction.bind(null, r.id, "remove")} tone="bad">
                  Remove name
                </ActionButton>
                <ActionButton action={resolveReportAction.bind(null, r.id, "restore")}>Restore</ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">Resolved</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {done.slice(0, 50).map((r) => (
              <li key={r.id}>
                “{r.first_name}” · {r.listing_name ?? "Class"} · {r.status}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
