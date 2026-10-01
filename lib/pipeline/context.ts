import { createClient } from "@supabase/supabase-js";
import { memoryDb } from "../memory-db";
import { sfToday } from "../time";
import type { CollectContext } from "./adapters";
import { createClaudeExtractor } from "./extract";
import { PoliteFetcher } from "./fetcher";
import { MemoryPipelineStore, SupabasePipelineStore, type PipelineStore } from "./store";

// Reads process.env directly (not lib/env.ts) so collectors can run from the
// command line and GitHub Actions without Next.js.

export function createCollectContext(log: (m: string) => void = console.log): CollectContext {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  return {
    fetcher: new PoliteFetcher({
      contactEmail: process.env.CONTACT_EMAIL ?? process.env.ADMIN_EMAIL ?? "hello@example.com",
      minDelayMs: Number(process.env.COLLECT_MIN_DELAY_MS ?? 3000),
    }),
    extract: apiKey ? createClaudeExtractor({ apiKey, model: process.env.EXTRACTION_MODEL ?? "claude-opus-5-5" }) : null,
    log,
    today: sfToday(),
    env: { eventbriteToken: process.env.EVENTBRITE_TOKEN, chromiumPath: process.env.CHROMIUM_PATH },
  };
}

/** Supabase when configured with a service key, otherwise the preview store. */
export function createPipelineStore(): { store: PipelineStore; kind: "supabase" | "memory" } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (url && key) {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    return { store: new SupabasePipelineStore(sb), kind: "supabase" };
  }
  return { store: new MemoryPipelineStore(memoryDb()), kind: "memory" };
}
