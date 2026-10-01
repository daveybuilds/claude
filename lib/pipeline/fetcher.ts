import { parseRobots, type RobotsRules } from "./robots";

export class BlockedByRobotsError extends Error {
  constructor(url: string) {
    super(`robots.txt disallows ${url} (or robots.txt couldn't be reached)`);
  }
}

export interface FetcherOptions {
  contactEmail: string;
  /** Minimum gap between two requests to the same host. */
  minDelayMs?: number;
  timeoutMs?: number;
  maxBytes?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Polite HTTP client for collectors: identifies itself with a contact email,
 * obeys robots.txt (including Crawl-delay), waits between requests to the same
 * host and gives up on slow or oversized responses.
 */
export class PoliteFetcher {
  readonly userAgent: string;
  private robots = new Map<string, Promise<RobotsRules>>();
  private lastHit = new Map<string, number>();
  private fetchImpl: typeof fetch;
  private sleep: (ms: number) => Promise<void>;

  constructor(private opts: FetcherOptions) {
    this.userAgent = `LittleSFBot/1.0 (+contact: ${opts.contactEmail}; baby-class listings for SF parents)`;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  async robotsFor(url: string): Promise<RobotsRules> {
    const origin = new URL(url).origin;
    let rules = this.robots.get(origin);
    if (!rules) {
      // RFC 9309: a missing robots.txt (4xx) means "allowed"; an unreachable
      // one (5xx or network error) means "assume everything is off-limits".
      const disallowAll = parseRobots("User-agent: *\nDisallow: /", this.userAgent);
      rules = this.raw(`${origin}/robots.txt`)
        .then(async (res) => {
          if (res.ok) return parseRobots(await res.text(), this.userAgent);
          return res.status >= 500 ? disallowAll : parseRobots("", this.userAgent);
        })
        .catch(() => disallowAll);
      this.robots.set(origin, rules);
    }
    return rules;
  }

  /** Throws BlockedByRobotsError when the page is off-limits. */
  async assertAllowed(url: string): Promise<RobotsRules> {
    const u = new URL(url);
    const rules = await this.robotsFor(url);
    if (!rules.isAllowed(u.pathname + u.search)) throw new BlockedByRobotsError(url);
    return rules;
  }

  /** Wait until we're allowed to hit this host again. */
  async throttle(url: string, rules?: RobotsRules): Promise<void> {
    const host = new URL(url).host;
    const crawlDelay = (rules?.crawlDelaySeconds ?? 0) * 1000;
    const gap = Math.max(this.opts.minDelayMs ?? 3000, crawlDelay);
    const last = this.lastHit.get(host);
    if (last !== undefined) {
      const wait = last + gap - Date.now();
      if (wait > 0) await this.sleep(wait);
    }
    this.lastHit.set(host, Date.now());
  }

  async get(url: string, init: { headers?: Record<string, string>; skipRobots?: boolean } = {}): Promise<Response> {
    const rules = init.skipRobots ? undefined : await this.assertAllowed(url);
    await this.throttle(url, rules);
    const res = await this.raw(url, init.headers);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res;
  }

  async getText(url: string, init: { headers?: Record<string, string>; skipRobots?: boolean } = {}): Promise<string> {
    const res = await this.get(url, init);
    const text = await res.text();
    const max = this.opts.maxBytes ?? 5_000_000;
    if (text.length > max) throw new Error(`Response too large (${text.length} bytes) for ${url}`);
    return text;
  }

  async getJson<T = unknown>(url: string, init: { headers?: Record<string, string>; skipRobots?: boolean } = {}): Promise<T> {
    return JSON.parse(await this.getText(url, init)) as T;
  }

  private raw(url: string, headers: Record<string, string> = {}): Promise<Response> {
    return this.fetchImpl(url, {
      headers: { "User-Agent": this.userAgent, Accept: "*/*", ...headers },
      redirect: "follow",
      signal: AbortSignal.timeout(this.opts.timeoutMs ?? 20_000),
    });
  }
}
