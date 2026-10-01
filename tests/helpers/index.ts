import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CollectContext } from "@/lib/pipeline/adapters";
import type { Extractor } from "@/lib/pipeline/extract";
import { PoliteFetcher } from "@/lib/pipeline/fetcher";
import type { Source } from "@/lib/types";

export const TODAY = "2026-10-01";

export function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url)), "utf8");
}

export function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "test-source",
    name: "Test Source",
    provider: "Test Provider",
    url: "https://provider.example/classes",
    neighborhood: "marina",
    method: "html",
    trusted: false,
    active: true,
    options: {},
    parser_notes: null,
    check_frequency: "daily",
    last_run_at: null,
    last_success_at: null,
    last_error: null,
    last_count: null,
    needs_attention: false,
    created_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

/** Fetcher that serves saved pages instead of the network, and records requests. */
export function fixtureFetcher(pages: Record<string, string | { status: number; body?: string }>) {
  const requests: { url: string; headers: Record<string, string> }[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const page = pages[url];
    if (page === undefined) return new Response("not found", { status: 404 });
    if (typeof page === "string") return new Response(page, { status: 200 });
    return new Response(page.body ?? "", { status: page.status });
  }) as typeof fetch;
  const fetcher = new PoliteFetcher({ contactEmail: "test@example.com", minDelayMs: 0, fetchImpl, sleep: async () => {} });
  return { fetcher, requests };
}

export function makeCtx(fetcher: PoliteFetcher, extract: Extractor | null = null): CollectContext {
  return { fetcher, extract, log: () => {}, today: TODAY, env: {} };
}
