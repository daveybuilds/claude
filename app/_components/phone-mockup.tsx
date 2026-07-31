/**
 * The emotional core of the page: a realistic phone showing one morning digest.
 * HVAC is the concrete example, but the pitch is for the whole trades world.
 */
const DIGEST =
  "☀️ Morning, Mike. Yesterday: $8,400 booked across 6 jobs (avg ticket $1,400). Google LSA brought in 4 of those leads for $180 spend — strong day. July revenue $142k, up 12% vs last year. ⚠️ 3 estimates over $5k still unsigned — worth a nudge.";

function SignalIcon() {
  return (
    <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true">
      <rect y="7.5" width="3" height="3.5" rx="1" />
      <rect x="4.7" y="5" width="3" height="6" rx="1" />
      <rect x="9.4" y="2.5" width="3" height="8.5" rx="1" />
      <rect x="14" width="3" height="11" rx="1" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="15" height="11" viewBox="0 0 15 11" fill="none" aria-hidden="true">
      <path
        d="M1 3.4a9.2 9.2 0 0 1 13 0M3.4 6a5.8 5.8 0 0 1 8.2 0M5.9 8.6a2.3 2.3 0 0 1 3.2 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden="true">
      <rect
        x="0.6"
        y="0.6"
        width="20.8"
        height="10.8"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />
      <rect x="2.2" y="2.2" width="15" height="7.6" rx="1.8" fill="currentColor" />
      <path
        d="M23 4.1v3.8c.95-.3 1.6-1 1.6-1.9s-.65-1.6-1.6-1.9Z"
        fill="currentColor"
        fillOpacity="0.35"
      />
    </svg>
  );
}

export function PhoneMockup() {
  return (
    <div className="mx-auto w-full max-w-[330px] lg:max-w-[360px]">
      {/* Device bezel — dark shell with a thin bright outer edge */}
      <div className="rounded-[2.9rem] bg-ink p-[11px] shadow-[0_32px_70px_-24px_rgba(18,18,20,0.45)] ring-1 ring-white/60">
        <div className="relative overflow-hidden rounded-[2.3rem] bg-white">
          {/* Dynamic island */}
          <div className="absolute left-1/2 top-2.5 z-10 h-[23px] w-[82px] -translate-x-1/2 rounded-full bg-ink" />

          {/* Cream zone: status bar + conversation header */}
          <div className="bg-cream pb-4">
            <div className="flex items-center justify-between px-5 pb-1 pt-4 text-ink">
              <span className="text-[12px] font-bold tabular-nums">7:02</span>
              <span className="flex items-center gap-[5px]">
                <SignalIcon />
                <WifiIcon />
                <BatteryIcon />
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5 pt-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-[15px] font-bold text-white"
                aria-hidden="true"
              >
                M
              </span>
              <span className="text-[11px] font-semibold text-ink">MetricText</span>
            </div>
          </div>

          {/* Message thread */}
          <div className="px-3.5 pb-5 pt-4">
            <p className="pb-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
              Today 7:02 AM
            </p>
            <div className="max-w-[88%] rounded-[1.3rem] rounded-bl-md bg-cream-soft px-3.5 py-3">
              <p className="text-[14.5px] leading-[1.45] text-ink">{DIGEST}</p>
            </div>
          </div>

          {/* Message input — sells the illusion that this is a real thread */}
          <div className="flex items-center gap-2 px-3.5 pb-2" aria-hidden="true">
            <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-panel text-[15px] leading-none text-ink-faint">
              +
            </span>
            <span className="flex flex-1 items-center rounded-full border border-hairline py-[6px] pl-3 pr-1.5 text-[12px] text-ink-faint">
              Text Message
            </span>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center pb-2 pt-1" aria-hidden="true">
            <span className="h-[4px] w-[100px] rounded-full bg-ink/80" />
          </div>
        </div>
      </div>
    </div>
  );
}
