import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/forms";
import { LogoMark } from "@/components/chrome";
import { adminPassword, isAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLogin() {
  if (await isAdmin()) redirect("/admin");
  const enabled = !!adminPassword();
  return (
    <main id="main" className="mx-auto w-full max-w-sm flex-1 px-4 pt-20">
      <LogoMark className="h-10 w-10" />
      <h1 className="mt-4 text-3xl font-semibold">Little SF admin</h1>
      {enabled ? (
        <div className="mt-6">
          <LoginForm />
          {process.env.NODE_ENV !== "production" && !process.env.ADMIN_PASSWORD && (
            <p className="mt-4 text-sm text-ink-soft">Local development: the password is “admin” until you set ADMIN_PASSWORD.</p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-ink-soft">Set ADMIN_PASSWORD in your environment variables to switch the admin page on.</p>
      )}
    </main>
  );
}
