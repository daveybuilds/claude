import { NextResponse, type NextRequest } from "next/server";
import { createCollectContext, createPipelineStore } from "@/lib/pipeline/context";
import { runDueSources } from "@/lib/pipeline/run";
import { cronAuthorized, purgeExpired } from "@/lib/cron";

// Vercel Cron calls this every night (see vercel.json). It collects every
// due source except Playwright ones (those need a browser; the GitHub Actions
// workflow runs them), then deletes expired first names and old taps.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const logs: string[] = [];
  const { store } = createPipelineStore();
  const runs = await runDueSources(store, createCollectContext((m) => logs.push(m)), {
    methods: ["ics", "api", "html"],
    budgetMs: 240_000,
  });
  const purged = await purgeExpired();
  return NextResponse.json({
    ran: runs.length,
    failed: runs.filter((r) => !r.ok).map((r) => ({ source: r.source, error: r.error })),
    purged,
    logs,
  });
}
