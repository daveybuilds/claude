import Link from "next/link";
import { AGE_BANDS, CLASS_TYPES, CLASS_TYPE_LABELS, NEIGHBORHOODS } from "@/lib/constants";
import type { Filters } from "@/lib/data/listings";
import { HoodSelect } from "./hood-select";

type Key = keyof Filters;

function href(base: string, current: Filters, key: Key, value: string | undefined): string {
  const next: Record<string, string | undefined> = { ...current, [key]: current[key] === value ? undefined : value };
  const qs = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => !!e[1])).toString();
  return qs ? `${base}?${qs}` : base;
}

function Chip({ active, href: to, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-bold transition-colors ${
        active ? "border-button bg-button text-button-ink" : "border-line bg-surface text-ink-soft hover:border-ink-faint hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs font-extrabold uppercase tracking-wider text-ink-faint">{label}</span>
      <div className="no-scrollbar -mr-4 flex gap-2 overflow-x-auto pb-1 pr-4 sm:mr-0 sm:flex-wrap sm:overflow-visible sm:pr-0">
        {children}
      </div>
    </div>
  );
}

/**
 * Filter chips are plain links, so filtering works without JavaScript and
 * every combination has a shareable URL.
 */
export function FilterBar({ base, filters, lockedHood }: { base: string; filters: Filters; lockedHood?: boolean }) {
  return (
    <div className="space-y-3">
      {!lockedHood && (
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-xs font-extrabold uppercase tracking-wider text-ink-faint">Where</span>
          <HoodSelect base={base} filters={filters} neighborhoods={NEIGHBORHOODS.map(({ slug, name }) => ({ slug, name }))} />
        </div>
      )}
      <Row label="When">
        <Chip active={!filters.when} href={href(base, filters, "when", undefined)}>
          Any day
        </Chip>
        <Chip active={filters.when === "week"} href={href(base, filters, "when", "week")}>
          This week
        </Chip>
      </Row>
      <Row label="Baby">
        {AGE_BANDS.map((b) => (
          <Chip key={b.id} active={filters.age === b.id} href={href(base, filters, "age", b.id)}>
            {b.label}
          </Chip>
        ))}
      </Row>
      <Row label="Type">
        {CLASS_TYPES.map((t) => (
          <Chip key={t} active={filters.type === t} href={href(base, filters, "type", t)}>
            {CLASS_TYPE_LABELS[t]}
          </Chip>
        ))}
      </Row>
      <Row label="Price">
        <Chip active={filters.price === "free"} href={href(base, filters, "price", "free")}>
          Free
        </Chip>
        <Chip active={filters.price === "paid"} href={href(base, filters, "price", "paid")}>
          Paid
        </Chip>
      </Row>
    </div>
  );
}
