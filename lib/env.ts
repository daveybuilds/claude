// One place to read configuration. Nothing secret is ever exposed to the
// browser: only NEXT_PUBLIC_* values are, and those are safe by design.

export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  adminPassword: process.env.ADMIN_PASSWORD,
  adminEmail: process.env.ADMIN_EMAIL,
  cronSecret: process.env.CRON_SECRET,
  contactEmail: process.env.CONTACT_EMAIL ?? process.env.ADMIN_EMAIL ?? "hello@example.com",
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM ?? "Little SF <onboarding@resend.dev>",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  extractionModel: process.env.EXTRACTION_MODEL ?? "claude-opus-5-5",
  isProduction: process.env.NODE_ENV === "production",
};

/**
 * Without Supabase settings the site runs in "preview mode": seed listings,
 * an in-memory store, and a pretend sign-in. Handy for trying it locally.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}
