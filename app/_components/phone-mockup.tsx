/**
 * The emotional core of the page: a realistic phone showing one morning digest.
 * HVAC is the concrete example, but the pitch is for the whole trades world.
 *
 * The screen is locked to a real iPhone aspect ratio (393x852pt) so the device
 * reads as a phone rather than as a box sized by its content. The thread is
 * bottom-anchored, the way iOS Messages actually stacks a conversation.
 */
const DIGEST =
  "☀️ Morning, Mike. Yesterday: $8,400 booked across 6 jobs (avg ticket $1,400). Google LSA brought in 4 of those leads for $180 spend — strong day. July revenue $142k, up 12% vs last year. ⚠️ 3 estimates over $5k still unsigned — worth a nudge.";

/** The morning before, so the thread reads as a habit rather than a one-off. */
const PRIOR_DIGEST =
  "☀️ Morning, Mike. Yesterday: $6,100 booked across 5 jobs (avg ticket $1,220). Google LSA: 3 leads for $150 spend. July revenue $134k, up 9% vs last year.";

/* iOS light-mode system values */
const IOS_BLUE = "#007AFF";
const BUBBLE = "#E9E9EB";
const CHROME = "#F7F7F7";
const HAIRLINE = "#D3D3D8";
const PLACEHOLDER = "#8E8E93";

function SignalIcon() {
  return (
    <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor" aria-hidden="true">
      <rect y="7.6" width="3.2" height="3.4" rx="1" />
      <rect x="4.9" y="5.1" width="3.2" height="5.9" rx="1" />
      <rect x="9.8" y="2.6" width="3.2" height="8.4" rx="1" />
      <rect x="14.7" width="3.2" height="11" rx="1" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden="true">
      <path
        d="M1.2 3.5a9.7 9.7 0 0 1 13.6 0M3.7 6.2a6.1 6.1 0 0 1 8.6 0M6.3 8.8a2.4 2.4 0 0 1 3.4 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true">
      <rect
        x="0.65"
        y="0.65"
        width="21.7"
        height="10.7"
        rx="3.1"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.3"
      />
      <rect x="2.3" y="2.3" width="16" height="7.4" rx="1.9" fill="currentColor" />
      <path
        d="M24 4.2v3.6c.9-.28 1.5-.95 1.5-1.8s-.6-1.52-1.5-1.8Z"
        fill="currentColor"
        fillOpacity="0.35"
      />
    </svg>
  );
}

function DateStamp({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="pb-2 text-center text-[10px] font-semibold"
      style={{ color: PLACEHOLDER }}
    >
      {children}
    </p>
  );
}

/** Incoming bubble with the two-piece iMessage tail. */
function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative ml-1.5 max-w-[86%] rounded-[18px] px-3.5 py-2"
      style={{ background: BUBBLE }}
    >
      <p className="text-[14.5px] leading-[1.32] text-black">{children}</p>
      <span
        className="absolute -left-[6px] bottom-0 h-5 w-5 rounded-br-[16px]"
        style={{ background: BUBBLE }}
        aria-hidden="true"
      />
      <span
        className="absolute -left-[18px] bottom-0 h-5 w-5 rounded-br-[11px] bg-white"
        aria-hidden="true"
      />
    </div>
  );
}

export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[300px] lg:max-w-[340px]">
      {/* Side buttons, tucked behind the frame so only their edges show */}
      <span
        className="absolute -left-[2.5px] top-[17%] h-[3.5%] w-[3px] rounded-l-sm bg-ink/70"
        aria-hidden="true"
      />
      <span
        className="absolute -left-[2.5px] top-[24%] h-[7%] w-[3px] rounded-l-sm bg-ink/70"
        aria-hidden="true"
      />
      <span
        className="absolute -left-[2.5px] top-[33%] h-[7%] w-[3px] rounded-l-sm bg-ink/70"
        aria-hidden="true"
      />
      <span
        className="absolute -right-[2.5px] top-[26%] h-[11%] w-[3px] rounded-r-sm bg-ink/70"
        aria-hidden="true"
      />

      {/* Titanium-ish frame */}
      <div className="relative rounded-[13.5%/6.2%] bg-ink p-[3.4%] shadow-[0_36px_80px_-28px_rgba(18,18,20,0.5)] ring-1 ring-white/50">
        {/* Screen — real iPhone proportions */}
        <div className="relative flex aspect-[393/852] w-full flex-col overflow-hidden rounded-[11.5%/5.4%] bg-white">
          {/* Dynamic island */}
          <div className="absolute left-1/2 top-[1.3%] z-10 h-[3.1%] w-[27%] -translate-x-1/2 rounded-full bg-black" />

          {/* Status bar */}
          <div
            className="flex shrink-0 items-center justify-between px-5 pb-1.5 pt-3.5 text-black"
            style={{ background: CHROME }}
          >
            <span className="text-[12.5px] font-semibold tabular-nums">7:02</span>
            <span className="flex items-center gap-[5px]">
              <SignalIcon />
              <WifiIcon />
              <BatteryIcon />
            </span>
          </div>

          {/* Messages header: back chevron, centred contact, FaceTime */}
          <div
            className="flex shrink-0 items-center justify-between px-3 pb-2 pt-1"
            style={{ background: CHROME, borderBottom: `0.5px solid ${HAIRLINE}` }}
          >
            <svg
              width="11"
              height="19"
              viewBox="0 0 11 19"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <path
                d="M9.5 1.5 2 9.5l7.5 8"
                stroke={IOS_BLUE}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="flex flex-col items-center gap-[3px]">
              <span
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-ink text-[13px] font-bold text-white"
                aria-hidden="true"
              >
                M
              </span>
              <span className="text-[10.5px] font-medium leading-none text-black">
                MetricText
              </span>
            </div>

            <svg
              width="22"
              height="14"
              viewBox="0 0 22 14"
              fill={IOS_BLUE}
              aria-hidden="true"
              className="shrink-0"
            >
              <rect width="15" height="14" rx="4" />
              <path d="M16.5 5.5 22 2v10l-5.5-3.5v-3Z" />
            </svg>
          </div>

          {/* Thread — bottom-anchored, as iOS stacks it */}
          <div className="flex flex-1 flex-col justify-end px-3.5 pb-1.5">
            <DateStamp>Yesterday 7:01 AM</DateStamp>
            <Bubble>{PRIOR_DIGEST}</Bubble>
            <div className="pt-3.5">
              <DateStamp>Today 7:02 AM</DateStamp>
            </div>
            <Bubble>{DIGEST}</Bubble>
          </div>

          {/* Input bar */}
          <div className="flex shrink-0 items-center gap-2 px-3 pb-1.5 pt-1.5">
            <span
              className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-full text-[17px] leading-none"
              style={{ background: BUBBLE, color: "#6E6E73" }}
              aria-hidden="true"
            >
              +
            </span>
            <span
              className="flex flex-1 items-center justify-between rounded-full py-[5px] pl-3.5 pr-1 text-[13px]"
              style={{ border: `1px solid ${HAIRLINE}`, color: PLACEHOLDER }}
            >
              iMessage
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="10" r="10" fill="#C7C7CC" />
                <path
                  d="M10 14.5V6m0 0L6.6 9.4M10 6l3.4 3.4"
                  stroke="#fff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>

          {/* Home indicator */}
          <div className="flex shrink-0 justify-center pb-[6px] pt-1" aria-hidden="true">
            <span className="h-[4px] w-[36%] rounded-full bg-black" />
          </div>
        </div>
      </div>
    </div>
  );
}
