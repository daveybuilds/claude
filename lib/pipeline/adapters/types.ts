import type { SourceMethod } from "../../constants";
import type { Source } from "../../types";
import type { Extractor } from "../extract";
import type { PoliteFetcher } from "../fetcher";
import type { ExtractedListing } from "../schema";

export interface CollectContext {
  fetcher: PoliteFetcher;
  /** Claude extraction step; null when ANTHROPIC_API_KEY isn't set. */
  extract: Extractor | null;
  log: (message: string) => void;
  /** Today in San Francisco, YYYY-MM-DD (injectable for tests). */
  today: string;
  env: { eventbriteToken?: string; chromiumPath?: string };
}

export interface CollectResult {
  items: ExtractedListing[];
  /** Data came from a structured feed (ICS/API/JSON-LD), not text extraction. */
  structured: boolean;
  /** Things the admin should know about this run (dropped fields, truncation…). */
  notes: string[];
  /** Manual sources don't collect anything. */
  skipped?: boolean;
}

export interface Adapter {
  method: SourceMethod;
  collect(source: Source, ctx: CollectContext): Promise<CollectResult>;
}
