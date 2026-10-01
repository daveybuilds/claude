import type { Browser } from "playwright-core";
import { extractFromText } from "./html";
import type { Adapter, CollectContext } from "./types";

/**
 * JavaScript booking calendars (Mindbody, Momence, Jackrabbit…). Renders the
 * page in headless Chromium, waits for the schedule, reads the visible text and
 * hands it to the same extraction step as the HTML adapter.
 *
 * Prefer the provider's public embed/JSON endpoint (method "api") when there
 * is one — it's lighter and more reliable. Options:
 *   waitFor:   CSS selector that appears once the schedule has loaded
 *   selector:  only read text inside this element (default: body)
 *   settleMs:  extra wait after load for late widgets (default 1500)
 *   nextButton + pages: click "next week" N times, reading each page
 *
 * Needs a Chromium binary, so it runs from `npm run collect` (locally or in
 * the GitHub Actions workflow), not inside Vercel functions.
 */
export const playwrightAdapter: Adapter = {
  method: "playwright",
  async collect(source, ctx) {
    const opts = source.options as { waitFor?: string; selector?: string; settleMs?: number; nextButton?: string; pages?: number };
    const rules = await ctx.fetcher.assertAllowed(source.url);
    await ctx.fetcher.throttle(source.url, rules);

    const browser = await launch(ctx);
    try {
      const page = await browser.newPage({ userAgent: ctx.fetcher.userAgent });
      await page.goto(source.url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (opts.waitFor) await page.waitForSelector(opts.waitFor, { timeout: 20_000 });
      await page.waitForTimeout(opts.settleMs ?? 1500);

      const chunks: string[] = [];
      const read = async () => chunks.push(await page.locator(opts.selector ?? "body").first().innerText());
      await read();
      for (let i = 0; opts.nextButton && i < (opts.pages ?? 0); i++) {
        // Polite delay between page turns, like any other request.
        await page.waitForTimeout(Math.max(3000, (rules.crawlDelaySeconds ?? 0) * 1000));
        await page.click(opts.nextButton);
        if (opts.waitFor) await page.waitForSelector(opts.waitFor, { timeout: 20_000 });
        await page.waitForTimeout(opts.settleMs ?? 1500);
        await read();
      }
      return await extractFromText(chunks.join("\n\n"), source, ctx);
    } finally {
      await browser.close();
    }
  },
};

async function launch(ctx: CollectContext): Promise<Browser> {
  const { chromium } = await import("playwright-core");
  return chromium.launch({ headless: true, executablePath: ctx.env.chromiumPath || undefined });
}

