import { existsSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { playwrightAdapter } from "@/lib/pipeline/adapters/playwright";
import { emptyExtracted } from "@/lib/pipeline/schema";
import { fixture, fixtureFetcher, makeCtx, makeSource } from "./helpers";

// Uses a real headless Chromium against a saved page whose schedule only
// appears after JavaScript runs. Skipped where no browser is installed.
const chromiumPath = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const hasBrowser = existsSync(chromiumPath);

describe.skipIf(!hasBrowser)("playwright adapter", () => {
  it("renders the JavaScript calendar and extracts from the visible text", async () => {
    const url = "http://studio.test/schedule";
    const { fetcher } = fixtureFetcher({ "http://studio.test/robots.txt": "User-agent: *\nAllow: /" });
    const extract = vi.fn(async () => [{ ...emptyExtracted("Mom & Baby Barre"), day_of_week: 2, start_time: "9:15am", end_time: "10:00am", price: "$28" }]);

    // Serve the saved page instead of hitting the network.
    const { chromium } = await import("playwright-core");
    const realLaunch = chromium.launch.bind(chromium);
    const launchSpy = vi.spyOn(chromium, "launch").mockImplementation(async (opts) => {
      const browser = await realLaunch(opts);
      const realNewPage = browser.newPage.bind(browser);
      browser.newPage = async (o) => {
        const page = await realNewPage(o);
        await page.route("**/*", (route) => route.fulfill({ status: 200, contentType: "text/html", body: fixture("momence-schedule.html") }));
        return page;
      };
      return browser;
    });

    const source = makeSource({ method: "playwright", url, options: { waitFor: ".class-row", settleMs: 50 } });
    const result = await playwrightAdapter.collect(source, { ...makeCtx(fetcher, extract), env: { chromiumPath } });
    launchSpy.mockRestore();

    const text = (extract.mock.calls[0] as unknown as [{ text: string }])[0].text;
    expect(text).toContain("Mom & Baby Barre | Tuesday | 9:15am - 10:00am | $28 drop-in");
    expect(text).not.toContain("Loading…");
    expect(result.items[0]).toMatchObject({ name: "Mom & Baby Barre", start_time: "9:15am", price: "$28" });
  });

  it("checks robots.txt before opening a browser", async () => {
    const { fetcher } = fixtureFetcher({ "http://studio.test/robots.txt": "User-agent: *\nDisallow: /schedule" });
    const source = makeSource({ method: "playwright", url: "http://studio.test/schedule" });
    await expect(playwrightAdapter.collect(source, makeCtx(fetcher, vi.fn()))).rejects.toThrow(/robots/);
  });
});
