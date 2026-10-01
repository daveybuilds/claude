import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";

const COOKIE = "lsf_admin";
const SESSION_HOURS = 12;

/** The admin password. In local development without one set, it's "admin". */
export function adminPassword(): string | null {
  if (env.adminPassword) return env.adminPassword;
  return env.isProduction ? null : "admin";
}

function sign(value: string): string {
  const key = `${process.env.ADMIN_SESSION_SECRET ?? ""}:${adminPassword() ?? ""}`;
  return createHmac("sha256", key).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Best-effort brake on password guessing (per server instance).
const failures = new Map<string, { count: number; until: number }>();

export async function adminLogin(password: string, clientKey: string): Promise<{ ok: boolean; error?: string }> {
  const expected = adminPassword();
  if (!expected) return { ok: false, error: "ADMIN_PASSWORD isn't set, so the admin page is switched off." };
  const f = failures.get(clientKey);
  if (f && f.count >= 5 && Date.now() < f.until) return { ok: false, error: "Too many attempts. Try again in a few minutes." };
  if (!safeEqual(sign(password), sign(expected))) {
    const count = (f?.count ?? 0) + 1;
    failures.set(clientKey, { count, until: Date.now() + 10 * 60_000 });
    return { ok: false, error: "That password isn't right." };
  }
  failures.delete(clientKey);
  const exp = String(Date.now() + SESSION_HOURS * 3_600_000);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  return { ok: true };
}

export async function adminLogout(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminPassword()) return false;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}

/** Use at the top of every admin page and server action. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
