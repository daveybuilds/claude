import type { SourceMethod } from "../../constants";
import { apiAdapter } from "./api";
import { htmlAdapter } from "./html";
import { icsAdapter } from "./ics";
import { manualAdapter } from "./manual";
import { playwrightAdapter } from "./playwright";
import type { Adapter } from "./types";

export const ADAPTERS: Record<SourceMethod, Adapter> = {
  ics: icsAdapter,
  api: apiAdapter,
  html: htmlAdapter,
  playwright: playwrightAdapter,
  manual: manualAdapter,
};

export type { Adapter, CollectContext, CollectResult } from "./types";
