import type { Source } from "../types";
import type { RunSummary } from "./run";
import type { PipelineStore } from "./store";

const STALE_AFTER_DAYS = { daily: 2, weekly: 9, monthly: 35 } as const;

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function sourcesNeedingAttention(sources: Source[], now: Date = new Date()): { source: Source; reason: string }[] {
  const out: { source: Source; reason: string }[] = [];
  for (const s of sources) {
    if (!s.active || s.method === "manual") continue;
    if (s.needs_attention) {
      out.push({ source: s, reason: s.last_error ?? "Last run failed" });
      continue;
    }
    const limit = STALE_AFTER_DAYS[s.check_frequency] ?? 2;
    const age = s.last_success_at ? (now.getTime() - Date.parse(s.last_success_at)) / 86_400_000 : Infinity;
    if (age > limit) out.push({ source: s, reason: s.last_success_at ? `No successful run for ${Math.floor(age)} days` : "Never collected successfully" });
  }
  return out;
}

export interface Digest {
  subject: string;
  html: string;
  text: string;
  hasNews: boolean;
}

export async function buildDigest(store: PipelineStore, siteUrl: string, runs: RunSummary[] = []): Promise<Digest> {
  const sources = await store.listSources();
  const attention = sourcesNeedingAttention(sources);
  const pending = await store.countPending();
  const hasNews = attention.length > 0 || pending.listings > 0 || pending.reports > 0;

  const lines = [
    `${pending.listings} listing${pending.listings === 1 ? "" : "s"} waiting for review`,
    `${pending.reports} reported name${pending.reports === 1 ? "" : "s"} to check`,
    attention.length ? `${attention.length} source${attention.length === 1 ? "" : "s"} need attention:` : "All sources healthy.",
    ...attention.map((a) => `  • ${a.source.name}: ${a.reason}`),
    ...(runs.length ? ["", "Last night's runs:", ...runs.map((r) => `  • ${r.source}: ${r.ok ? `${r.found} found, ${r.created} new, ${r.proposed} changed` : `failed — ${r.error}`}`)] : []),
    "",
    `Review: ${siteUrl}/admin`,
  ];

  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#3b2f35">
<h2 style="font-family:Georgia,serif;font-weight:500">Little SF — daily check</h2>
<p><strong>${pending.listings}</strong> listings waiting for review<br><strong>${pending.reports}</strong> reported names to check</p>
${attention.length ? `<h3>Sources needing attention</h3><ul>${attention.map((a) => `<li><strong>${escapeHtml(a.source.name)}</strong> — ${escapeHtml(a.reason)}</li>`).join("")}</ul>` : "<p>All sources healthy.</p>"}
<p><a href="${escapeHtml(siteUrl)}/admin">Open the admin page</a></p></div>`;

  return {
    subject: attention.length ? `Little SF: ${attention.length} source${attention.length === 1 ? "" : "s"} need attention` : `Little SF: ${pending.listings} to review`,
    html,
    text: lines.join("\n"),
    hasNews,
  };
}

/** Send with Resend if configured; otherwise just log it. */
export async function sendEmail(to: string | undefined, d: Digest, log: (m: string) => void = console.log): Promise<"sent" | "logged"> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) {
    log(`[digest] ${d.subject}\n${d.text}`);
    return "logged";
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Little SF <onboarding@resend.dev>",
      to: [to],
      subject: d.subject,
      html: d.html,
      text: d.text,
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  return "sent";
}
