import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { supabaseForUser } from "@/lib/supabase";

// Where the magic-link email lands. Supports both the recommended
// token_hash link (works even if the email opens in a different browser)
// and the default PKCE ?code= link.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const rawNext = url.searchParams.get("next") ?? "/classes";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/classes";
  const fail = NextResponse.redirect(new URL(`/account?error=link&next=${encodeURIComponent(next)}`, url.origin));
  if (!isSupabaseConfigured()) return fail;

  const supabase = await supabaseForUser();
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return fail;
}
