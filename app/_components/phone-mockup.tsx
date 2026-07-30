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
    <div className="mx-auto w-full max-w-[330px]">
      {/* Device bezel */}
      <div className="rounded-[2.75rem] bg-slate-900 p-[10px] shadow-2xl shadow-slate-900/25">
        <div className="relative overflow-hidden rounded-[2.25rem] bg-white">
          {/* Dynamic island */}
          <div className="absolute left-1/2 top-2.5 z-10 h-[24px] w-[88px] -translate-x-1/2 rounded-full bg-slate-900" />

          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pb-1 pt-4 text-slate-900">
            <span className="text-[12px] font-semibold tabular-nums">7:02</span>
            <span className="flex items-center gap-[5px]">
              <SignalIcon />
              <WifiIcon />
              <BatteryIcon />
            </span>
          </div>

          {/* Conversation header */}
          <div className="flex flex-col items-center gap-1.5 border-b border-slate-200 px-4 pb-3 pt-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[15px] font-semibold text-white"
              aria-hidden="true"
            >
              M
            </span>
            <span className="text-[11px] font-medium text-slate-600">MetricText</span>
          </div>

          {/* Message thread */}
          <div className="px-3.5 pb-5 pt-4">
            <p className="pb-2.5 text-center text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Today 7:02 AM
            </p>
            <div className="max-w-[87%] rounded-[1.15rem] rounded-bl-md bg-slate-100 px-3.5 py-2.5">
              <p className="text-[14.5px] leading-[1.45] text-slate-800">{DIGEST}</p>
            </div>
          </div>

          {/* Message input — sells the illusion that this is a real thread */}
          <div className="flex items-center gap-2 px-3.5 pb-2" aria-hidden="true">
            <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-[15px] leading-none text-slate-400">
              +
            </span>
            <span className="flex flex-1 items-center rounded-full border border-slate-200 py-[5px] pl-3 pr-1.5 text-[12px] text-slate-400">
              Text Message
            </span>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center pb-2 pt-1" aria-hidden="true">
            <span className="h-[4px] w-[100px] rounded-full bg-slate-900/80" />
          </div>
        </div>
      </div>
    </div>
  );
}
