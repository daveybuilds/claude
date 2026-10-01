"use client";

import { useState } from "react";

/** Opens the phone's share sheet; falls back to copying the link. */
export function ShareButton({
  className,
  children = "Share with a mom friend",
  path = "/",
}: {
  className?: string;
  children?: React.ReactNode;
  path?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, window.location.origin).toString();
    const data = {
      title: "Little SF",
      text: "Baby classes around SF — and you can see which other moms are saying hi. Want to go together?",
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        // dismissed — nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link", url);
    }
  }

  return (
    <button type="button" onClick={share} className={className}>
      <span aria-live="polite">{copied ? "Link copied" : children}</span>
    </button>
  );
}
