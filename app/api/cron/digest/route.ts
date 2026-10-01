import { NextResponse, type NextRequest } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { env } from "@/lib/env";
import { createPipelineStore } from "@/lib/pipeline/context";
import { buildDigest, sendEmail } from "@/lib/pipeline/digest";

// Morning email to the admin: sources needing attention, listings waiting
// for review, reported names. Skipped on quiet days.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { store } = createPipelineStore();
  const digest = await buildDigest(store, env.siteUrl);
  if (!digest.hasNews) return NextResponse.json({ sent: false, reason: "nothing needs attention" });
  const result = await sendEmail(env.adminEmail, digest);
  return NextResponse.json({ sent: result === "sent", subject: digest.subject });
}
