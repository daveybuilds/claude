// Minimal robots.txt support: user-agent groups, Allow/Disallow with the
// longest-match rule (RFC 9309), `*` and `$` wildcards, and Crawl-delay.

export interface RobotsRules {
  isAllowed(path: string): boolean;
  crawlDelaySeconds: number | null;
}

interface Group {
  agents: string[];
  rules: { allow: boolean; pattern: string }[];
  crawlDelay: number | null;
}

export function parseRobots(text: string, userAgent: string): RobotsRules {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [], crawlDelay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      if (value) current.rules.push({ allow: key === "allow", pattern: value });
    } else if (key === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n)) current.crawlDelay = n;
    }
  }

  const token = userAgent.split("/")[0].toLowerCase();
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && token.includes(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  const rules = chosen.flatMap((g) => g.rules);
  const crawlDelay = chosen.map((g) => g.crawlDelay).find((d) => d != null) ?? null;

  return {
    crawlDelaySeconds: crawlDelay,
    isAllowed(path: string) {
      let best: { allow: boolean; len: number } | null = null;
      for (const r of rules) {
        if (!matches(r.pattern, path)) continue;
        const len = r.pattern.length;
        if (!best || len > best.len || (len === best.len && r.allow)) best = { allow: r.allow, len };
      }
      return best ? best.allow : true;
    },
  };
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp(
    "^" + body.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""),
  );
  return re.test(path);
}
