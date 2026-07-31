const CONTENTS = [
  "Yesterday's revenue",
  "Jobs booked",
  "Average ticket",
  "What each lead cost",
  "Estimates still unsigned",
];

const TONES = {
  good: "bg-good text-good-ink",
  watch: "bg-watch text-watch-ink",
  flag: "bg-flag text-flag-ink",
} as const;

const SOURCES: {
  name: string;
  detail: string;
  tone: keyof typeof TONES;
  label: string;
}[] = [
  { name: "Google LSA", detail: "4 jobs · $180 spend", tone: "good", label: "Strong" },
  { name: "Referral", detail: "1 job · no spend", tone: "good", label: "Strong" },
  { name: "Angi", detail: "1 job · $95 spend", tone: "watch", label: "Watch" },
  { name: "Yelp Ads", detail: "0 jobs · $140 spend", tone: "flag", label: "Dead" },
];

const CARD =
  "rounded-[1.75rem] bg-white p-5 shadow-[0_24px_60px_-28px_rgba(18,18,20,0.28)] ring-1 ring-hairline";

/** Mirrors the reference's pill-list card: what actually lands in the text. */
export function DigestContentsCard() {
  return (
    <div className={`${CARD} w-full max-w-[280px]`}>
      <p className="text-[15px] font-bold text-ink">In every text</p>
      <ul className="mt-3.5 space-y-2">
        {CONTENTS.map((item) => (
          <li
            key={item}
            className="rounded-full bg-panel px-4 py-2.5 text-[13px] font-medium text-ink-soft"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Mirrors the reference's status-pill activity list: lead spend, judged. */
export function LeadSourceCard() {
  return (
    <div className={`${CARD} w-full max-w-[320px]`}>
      <p className="text-[15px] font-bold text-ink">
        Where yesterday&rsquo;s jobs came from
      </p>
      <ul className="mt-3.5 space-y-3">
        {SOURCES.map((source) => (
          <li key={source.name} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-bold text-ink">
                {source.name}
              </p>
              <p className="truncate text-[12px] text-ink-faint">{source.detail}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${TONES[source.tone]}`}
            >
              {source.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
