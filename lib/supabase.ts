import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "./env";

/** Client acting as the signed-in visitor. Row-level security applies. */
export async function supabaseForUser(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // proxy.ts refreshes the session cookie instead.
        }
      },
    },
  });
}

/** Anonymous client for public reads (approved listings, counts). */
export function supabasePublic(): SupabaseClient {
  return createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let service: SupabaseClient | null = null;

/**
 * Service-role client: bypasses row-level security. Only used by the
 * password-protected admin page, server actions that need it, and collectors.
 */
export function supabaseService(): SupabaseClient {
  if (!env.supabaseServiceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  service ??= createClient(env.supabaseUrl!, env.supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return service;
}
