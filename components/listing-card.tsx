import { AGE_BANDS, CLASS_TYPE_LABELS, neighborhoodName, type ClassType } from "@/lib/constants";
import { dayName, formatTimeRange, relativeDay } from "@/lib/time";
import type { HiState } from "@/app/actions";
import type { PublicListing } from "@/lib/types";
import { SayHi } from "./say-hi";

const TYPE_STYLE: Record<ClassType, string> = {
  music: "bg-lavender-soft text-lavender-ink",
  yoga: "bg-sage-soft text-sage-ink",
  storytime: "bg-rose-soft text-rose-ink",
  support: "bg-butter-soft text-butter-ink",
  play: "bg-lavender-soft text-lavender-ink",
};

function ageLabel(l: PublicListing): string | null {
  if (l.age_min_months === null && l.age_max_months === null) return l.ages_text;
  const bands = AGE_BANDS.filter(
    (b) => (l.age_min_months === null || l.age_min_months < b.max) && (l.age_max_months === null || l.age_max_months >= b.min),
  );
  if (bands.length === AGE_BANDS.length) return "0–2y+";
  if (!bands.length) return l.ages_text;
  return bands.map((b) => b.label).join(", ");
}

function verifiedText(days: number | null): string {
  if (days === null) return "Not yet verified";
  if (days === 0) return "Verified today";
  if (days === 1) return "Verified yesterday";
  return `Verified ${days} days ago`;
}

const Tag = ({ className, children }: { className: string; children: React.ReactNode }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>{children}</span>
);

export function ListingCard({
  listing: l,
  hi,
  signedIn,
  preview,
  returnPath,
}: {
  listing: PublicListing;
  hi: HiState;
  signedIn: boolean;
  preview: boolean;
  returnPath: string;
}) {
  const time = l.showTimes ? formatTimeRange(l.start_time, l.end_time) : null;
  const when = l.showTimes
    ? l.date
      ? relativeDay(l.date)
      : l.day_of_week !== null
        ? `${dayName(l.day_of_week)}s`
        : null
    : null;
  const age = ageLabel(l);
  const hood = neighborhoodName(l.neighborhood);
  const headingId = `listing-${l.id}`;

  return (
    <article
      id={`l-${l.id}`}
      aria-labelledby={headingId}
      className="scroll-mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-soft sm:p-6"
    >
      <div className="flex flex-wrap gap-1.5">
        {l.type && <Tag className={TYPE_STYLE[l.type]}>{CLASS_TYPE_LABELS[l.type]}</Tag>}
        {age && <Tag className="bg-bg-deep text-ink-soft">{age}</Tag>}
        {l.is_free === true && <Tag className="bg-sage-soft text-sage-ink">Free</Tag>}
        {l.is_free === false && <Tag className="bg-bg-deep text-ink-soft">Paid</Tag>}
        {l.availability === "waitlist" && <Tag className="bg-butter-soft text-butter-ink">Full · waitlist</Tag>}
        {l.availability === "full" && <Tag className="bg-butter-soft text-butter-ink">Full</Tag>}
      </div>

      <h3 id={headingId} className="mt-3 text-[1.35rem] font-semibold leading-snug">
        {l.name}
      </h3>

      <dl className="mt-3 space-y-1.5 text-[0.95rem]">
        <div className="flex gap-2">
          <dt className="sr-only">When</dt>
          <dd className="font-bold">
            {time && when ? (
              <>
                {when} · {time}
                {l.nextDate && l.day_of_week !== null && !l.date && (
                  <span className="font-semibold text-ink-soft"> · next {relativeDay(l.nextDate)}</span>
                )}
              </>
            ) : (
              <a href={l.url ?? "#"} target="_blank" rel="noopener noreferrer" className="text-rose-ink underline decoration-rose underline-offset-4">
                Check times with the provider
              </a>
            )}
          </dd>
        </div>
        {(l.location_name || l.address || hood) && (
          <div>
            <dt className="sr-only">Where</dt>
            <dd className="text-ink-soft">
              {[l.location_name, l.address].filter(Boolean).join(", ")}
              {hood && <span className="text-ink-faint">{l.location_name || l.address ? " · " : ""}{hood}</span>}
            </dd>
          </div>
        )}
        {(l.price || l.price_details) && (
          <div>
            <dt className="sr-only">Price</dt>
            <dd className="text-ink-soft">{l.price_details ?? l.price}</dd>
          </div>
        )}
      </dl>

      {l.description && <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">{l.description}</p>}

      <p className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-faint">
        <span>{verifiedText(l.verifiedDaysAgo)}</span>
        {l.url && (
          <a
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full px-1 py-1 text-sm font-bold text-ink-soft underline decoration-line underline-offset-4 hover:text-ink"
          >
            Check times<span className="sr-only"> for {l.name} (opens provider's site)</span> ↗
          </a>
        )}
      </p>

      {l.nextDate ? (
        <SayHi
          listingId={l.id}
          date={l.nextDate}
          dateLabel={relativeDay(l.nextDate)}
          initial={hi}
          signedIn={signedIn}
          preview={preview}
          returnPath={`${returnPath}#l-${l.id}`}
        />
      ) : (
        <p className="mt-4 border-t border-dashed border-line pt-4 text-sm text-ink-faint">
          “I'll say hi” opens once we've confirmed this class's times.
        </p>
      )}
    </article>
  );
}
