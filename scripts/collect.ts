/**
 * Run collectors from the command line.
 *
 *   npm run collect -- --list                     show every source and its health
 *   npm run collect -- --source sfpl-marina       run one source now
 *   npm run collect -- --source sfpl-marina --dry-run   show what it finds, save nothing
 *   npm run collect -- --due                      run every source that's due
 *   npm run collect -- --all --method playwright  run all active Playwright sources
 *   npm run collect -- --digest                   also email the daily digest
 */
import { createCollectContext, createPipelineStore } from "../lib/pipeline/context";
import { buildDigest, sendEmail } from "../lib/pipeline/digest";
import { runDueSources, runSource, type RunSummary } from "../lib/pipeline/run";
import { formatTimeRange, dayName } from "../lib/time";

try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local — fine, use the environment as is
}

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  const { store, kind } = createPipelineStore();
  const ctx = createCollectContext();
  if (kind === "memory") console.log("(Supabase not configured: using the in-memory preview store; nothing is saved.)\n");

  if (flag("list")) {
    for (const s of await store.listSources()) {
      const health = s.needs_attention ? "NEEDS ATTENTION" : s.last_success_at ? `ok ${s.last_success_at.slice(0, 10)}` : "never run";
      console.log(`${s.active ? " " : "x"} ${s.slug.padEnd(24)} ${s.method.padEnd(10)} ${health}${s.last_error ? ` — ${s.last_error}` : ""}`);
    }
    return;
  }

  const methods = value("method")?.split(",");
  let results: RunSummary[] = [];
  const slugs = value("source")?.split(",");

  if (slugs) {
    for (const slug of slugs) {
      const source = await store.getSource(slug);
      if (!source) {
        console.error(`No source "${slug}". Try --list.`);
        process.exitCode = 1;
        continue;
      }
      console.log(`Collecting ${source.slug} (${source.method}) from ${source.url}`);
      results.push(await runSource(source, store, ctx, { dryRun: flag("dry-run") }));
    }
  } else if (flag("due") || flag("all")) {
    results = await runDueSources(store, ctx, { methods, force: flag("all") });
  } else {
    console.log("Nothing to do. Use --list, --source <slug>, --due or --all.");
    return;
  }

  for (const r of results) {
    console.log(`\n${r.source}: ${r.ok ? "OK" : "FAILED"}${r.dryRun ? " (dry run)" : ""}${r.skipped ? " (manual source, skipped)" : ""}`);
    if (r.error) console.log(`  error: ${r.error}`);
    if (!r.skipped) console.log(`  found ${r.found} · new ${r.created} (auto-approved ${r.autoApproved}) · updated ${r.updated} · to review ${r.proposed} · unchanged ${r.unchanged} · missing ${r.missing}`);
    for (const n of r.notes) console.log(`  note: ${n}`);
    for (const l of r.preview ?? []) {
      const when = l.date ?? (l.day_of_week != null ? dayName(l.day_of_week, true) : "?");
      console.log(`   - ${l.name} | ${when} ${formatTimeRange(l.start_time, l.end_time) ?? "time unknown"} | ${l.location_name ?? "?"} | ${l.price ?? "price unknown"}`);
    }
  }
  if (results.some((r) => !r.ok)) process.exitCode = 1;

  if (flag("digest")) {
    const digest = await buildDigest(store, process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000", results);
    console.log(`\nDigest: ${await sendEmail(process.env.ADMIN_EMAIL, digest)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
