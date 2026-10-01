import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { LogoMark } from "@/components/chrome";
import { requireAdmin } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const TABS = [
  ["/admin", "Review"],
  ["/admin/listings", "Listings"],
  ["/admin/reports", "Reported names"],
  ["/admin/sources", "Sources"],
  ["/admin/import", "CSV import"],
  ["/admin/qr", "QR codes"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2 font-display text-lg font-semibold">
            <LogoMark className="h-7 w-7" /> Admin
          </Link>
          <nav aria-label="Admin" className="no-scrollbar flex flex-1 gap-1 overflow-x-auto text-sm font-bold">
            {TABS.map(([href, label]) => (
              <Link key={href} href={href} className="shrink-0 rounded-full px-3 py-2 text-ink-soft hover:bg-bg hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="rounded-full px-3 py-2 font-bold text-ink-soft hover:text-ink">
              View site
            </Link>
            <form action={logoutAction}>
              <button className="rounded-full border border-line px-3 py-2 font-bold">Log out</button>
            </form>
          </div>
        </div>
      </header>
      {!isSupabaseConfigured() && (
        <p className="bg-butter-soft px-4 py-2 text-center text-sm font-bold text-butter-ink">
          Preview mode: changes are kept in memory only and vanish when the server restarts.
        </p>
      )}
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
