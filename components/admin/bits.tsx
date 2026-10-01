import type { ListingStatus } from "@/lib/types";
import { dayName, formatTimeRange } from "@/lib/time";
import type { ListingFields } from "@/lib/types";

/** Button that runs a bound server action. */
export function ActionButton({
  action,
  children,
  tone = "plain",
}: {
  action: () => Promise<void>;
  children: React.ReactNode;
  tone?: "plain" | "good" | "bad";
}) {
  const cls = {
    plain: "border border-line bg-surface text-ink",
    good: "bg-sage-ink text-white dark:text-[#1d191c]",
    bad: "border border-rose text-rose-ink",
  }[tone];
  return (
    <form action={action}>
      <button className={`min-h-9 rounded-full px-3 text-sm font-bold ${cls}`}>{children}</button>
    </form>
  );
}

export function StatusPill({ status }: { status: ListingStatus }) {
  const cls = {
    pending: "bg-butter-soft text-butter-ink",
    approved: "bg-sage-soft text-sage-ink",
    rejected: "bg-rose-soft text-rose-ink",
    archived: "bg-bg-deep text-ink-faint",
  }[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{status}</span>;
}

export function whenText(l: Pick<ListingFields, "date" | "day_of_week" | "start_time" | "end_time">): string {
  const day = l.date ?? (l.day_of_week !== null ? `${dayName(l.day_of_week)}s` : "No day");
  return `${day} · ${formatTimeRange(l.start_time, l.end_time) ?? "no time"}`;
}

export function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v);
}
