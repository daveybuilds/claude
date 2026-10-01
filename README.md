# Little SF

A calm, mobile-first website for new moms in San Francisco (babies 0–2). It
lists baby-friendly classes across the city and lets moms quietly signal
**“I'll say hi”**, so they know they won't be the only new face at the 10am
class. Moms who tap meet by the class entrance after it ends. There's no
matching, no messaging and no profiles.

Class times are collected automatically each night, checked by you in a
password-protected admin page, and only then shown publicly.

- **Site:** Next.js 16 + Tailwind CSS 4, deployed on Vercel
- **Data:** Supabase (Postgres, email magic-link sign-in, row-level security)
- **Listings pipeline:** collectors for ICS, APIs, HTML and JavaScript pages,
  with the Claude API turning messy page text into structured listings

---

## 1. Try it on your computer (2 minutes, no accounts needed)

You need [Node.js 22](https://nodejs.org) installed.

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no settings the site runs in **preview mode**:

- The starting listings are shown (see “Starting data” below).
- “I'll say hi” works with a pretend sign-in: type any email and you're in. Use
  a second browser (or a private window) as a second mom to see first names appear.
- The admin page is at http://localhost:3000/admin, and the password is `admin`.
- Nothing is saved: everything resets when you stop the server.

To see the site on your phone, connect it to the same Wi-Fi and open the
`Network:` address that `npm run dev` prints.

---

## 2. Set up Supabase (about 15 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. **Create the tables.** In the Supabase dashboard open **SQL Editor → New
   query**, paste the whole of `supabase/migrations/20261001000000_init.sql`
   and click **Run**. (If you use the Supabase CLI: `supabase db push`.)
3. **Copy your keys.** In **Project Settings → API** copy the Project URL, the
   `anon` key and the `service_role` key. Copy `.env.example` to `.env.local`
   and paste them in. Also set `ADMIN_PASSWORD`.
4. **Load the starting data:** `npm run seed`
5. **Sign-in emails.** In **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (later your real domain)
   - Redirect URLs: add `http://localhost:3000/**` and `https://YOUR-DOMAIN/**`

   In **Authentication → Emails**, edit both the **Magic Link** and the
   **Confirm signup** templates (a mom's very first sign-in uses the second
   one) and replace the link with the line below. It makes links work even when the email opens
   in a different browser from the one where the mom tapped (common on phones):

   ```html
   <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Sign in to Little SF</a>
   ```

   Supabase's built-in email is rate-limited and meant for testing. Before
   launch, add your own email provider under **Authentication → Emails → SMTP
   Settings** (Resend, Postmark, etc.).

Restart `npm run dev`. The yellow “Preview mode” banner disappears and
everything is now real and saved.

---

## 3. Deploy to Vercel

1. Push this repository to GitHub.
2. At [vercel.com/new](https://vercel.com/new), import the repository. Keep the
   default build settings.
3. Under **Environment Variables**, add every value from your `.env.local`, plus:
   - `NEXT_PUBLIC_SITE_URL`: your real address, e.g. `https://littlesf.com`
   - `CRON_SECRET`: any long random string
   - `ANTHROPIC_API_KEY`: from [console.anthropic.com](https://console.anthropic.com)
   - `ADMIN_EMAIL` and `CONTACT_EMAIL`: where the daily digest goes, and the
     email collectors show to websites
   - `RESEND_API_KEY` (optional): to actually send the daily digest
4. Click **Deploy**. Then add your domain to Supabase's Site URL and Redirect URLs.

`vercel.json` schedules two jobs (times are UTC):

| Job | When (SF time) | What it does |
| --- | --- | --- |
| `/api/cron/nightly` | ~3:15am | Collects every source that's due (except Playwright ones), then deletes first names from past classes and taps older than 30 days |
| `/api/cron/digest` | ~7:45am | Emails you if sources need attention, listings await review, or names were reported. Skipped on quiet days |

**Playwright sources** need a real browser, which Vercel functions don't have.
`.github/workflows/collect-browser-sources.yml` runs them nightly on GitHub
Actions instead. Add `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`ANTHROPIC_API_KEY` and `CONTACT_EMAIL` as repository secrets (**Settings →
Secrets and variables → Actions**). You can also run it by hand from the
**Actions** tab, optionally for a single source.

---

## 4. Using the admin page (`/admin`)

| Tab | What it's for |
| --- | --- |
| **Review** | New listings from collectors (approve, edit or reject), changes the collectors spotted (shown as before → after; the live listing doesn't change until you accept), and listings that vanished from their source |
| **Listings** | Every listing. Edit any field, tick “I checked these times today” to refresh its verified date, archive old ones, see each listing's change history |
| **Reported names** | Names moms reported. They're hidden immediately; remove them for good or restore them |
| **Sources** | Health of every source: last success, last error, how many listings it found. “Run now” collects one source on the spot |
| **CSV import** | Update manual sources (e.g. Instagram-only studios) in bulk |
| **QR codes** | A printable QR code per neighborhood, opening the finder already filtered to that area (`/marina`, `/richmond` …) |

---

## 5. Add a new source in five minutes

A source is one row in the `sources` table. The easiest way to add one is
**Admin → Sources → Add a source**.

1. **Open the provider's schedule page and pick a method**, best first:

   | Method | Use when | URL to enter |
   | --- | --- | --- |
   | `ics` | There's a calendar feed (“Subscribe”, “iCal”, “Add to Google Calendar”, a link ending `.ics`) | The feed URL |
   | `api` | There's a JSON feed: a booking widget's public endpoint, or Eventbrite | The JSON URL |
   | `html` | An ordinary web page that shows the schedule as text | The page URL |
   | `playwright` | The schedule only appears after JavaScript loads (Mindbody, Momence, Jackrabbit widgets) | The page URL |
   | `manual` | Instagram/Facebook-only, needs a login, or the site's terms forbid scraping | Their website (for the “Check times” link) |

   Never use anything but `manual` for Instagram, Facebook or other logged-in
   or social platforms (the admin page won't let you).

2. **Fill in the rest:** a name; a *provider* (sources with the same provider
   share de-duplication); a default neighborhood; how often to check.

3. **Options (JSON), only if needed:**

   | Method | Useful options |
   | --- | --- |
   | `ics` | `{"categories": ["Babies", "Toddlers", "Families"]}` keeps only those categories; `{"keywords": ["baby", "storytime"]}` keeps events mentioning a word |
   | `api` (JSON) | `{"kind": "json", "itemsPath": "data.events", "fields": {"name": "title", "start": "starts_at", "end": "ends_at", "location": "venue.name", "price": "price", "url": "link"}}` |
   | `api` (Eventbrite) | `{"kind": "eventbrite", "organizerIds": ["1234567"], "keywords": ["baby"]}` and set `EVENTBRITE_TOKEN` |
   | `html` | `{"startMarker": "Fall classes", "endMarker": "Contact us"}` reads only part of a long page |
   | `playwright` | `{"waitFor": ".schedule-row", "selector": "#schedule", "nextButton": ".next-week", "pages": 2}` |

4. **Trusted?** Only tick “Trusted” for `ics`/`api` feeds you know are
   reliable. Trusted feeds can auto-approve new, complete listings and apply
   harmless updates (description, availability) without you.

5. **Test it without saving anything:**

   ```bash
   npm run collect -- --source your-slug --dry-run
   ```

   It prints every listing it would create. Happy? Run it for real with
   **Run now** in the admin page (or drop `--dry-run`), then approve the new
   listings on the Review tab.

Prefer SQL? This is the same thing:

```sql
insert into sources (slug, name, provider, url, neighborhood, method, options)
values ('noe-library', 'SFPL — Noe Valley', 'SFPL', 'https://sfpl.org/locations/noe-valley',
        'noe-valley', 'html', '{"keywords": ["storytime", "baby"]}');
```

### Command-line collector

```bash
npm run collect -- --list                          # every source and its health
npm run collect -- --source sfpl-marina            # run one source now
npm run collect -- --source sfpl-marina --dry-run  # show results, save nothing
npm run collect -- --due                           # every source that's due
npm run collect -- --all --method playwright       # all active Playwright sources
npm run collect -- --due --digest                  # …then email the digest
```

---

## 6. How the listings pipeline decides things

1. **Collect.** Each method has an adapter in `lib/pipeline/adapters/`. HTML
   pages are checked for schema.org event data first (structured, no AI needed);
   otherwise the page text goes to Claude with strict instructions: copy facts
   exactly, use null for anything not on the page, never guess times or prices,
   and write a short factual summary in its own words instead of copying text.
2. **Double-check.** Every time and price Claude returns is looked for in the
   page text. Anything not found is removed and noted for you.
3. **Normalise and de-duplicate** on provider + name + day (or date) + start
   time. A class renamed at the same time and place is treated as the same class.
4. **Review queue.** New listings wait as *pending*. Changes to live listings are
   stored as *proposed changes*; the public keeps seeing the old version until
   you accept. If times or prices changed, the old ones aren't re-verified.
   Every change is written to `listing_history`.
5. **Auto-approve** only when a *trusted* ICS/API feed returned a complete
   listing (name, day/date, start time) and the run looks normal (not more
   than double last time's count).
6. **Freshness.** Every listing stores `last_verified_at` and its source URL. If
   a listing hasn't been verified for 14 days, the site hides its time, shows
   “Check times” with a link, and switches off “I'll say hi” for it.
7. **Failures.** If a source errors, or returns fewer than half the listings of
   its last good run, nothing is changed, the source is flagged in admin, and
   it's in the next morning's digest.

**Being a good citizen:** collectors obey robots.txt (and treat an unreachable
robots.txt as “keep out”), honour `Crawl-delay`, wait at least 3 seconds
between requests to the same site, identify themselves as
`LittleSFBot/1.0 (+contact: CONTACT_EMAIL)`, and time out slow pages.

---

## 7. Privacy and safety design

- Stored: email, the taps (which class, which date), and an optional first name
  per tap. Nothing else: no profiles, photos, surnames, messages or location.
- Counts are public. Who tapped is never public.
- First names are visible **only** to signed-in moms who have tapped “I'll say
  hi” for the same class on the same date. This is enforced by Postgres
  row-level security (`say_hi_names` policies), not by hiding it on screen.
- Names are letters only, max 20, checked against a block-list in the app *and*
  in the database. React escapes all names on output.
- Report (⋯ next to a name) hides it immediately and puts it in the admin page.
- Names are deleted the day after the class; taps 30 days after.
- “Delete my account” (on `/account`) removes the account, all taps, names and
  any Friday-list subscription at once.
- The meeting point is always the class entrance, after the session, in public.

---

## 8. Tests

```bash
npm test          # collectors (one per method, using saved sample pages), pipeline rules, times, moderation
npm run test:db   # applies the migration to a throwaway Postgres and tests every privacy rule
npm run lint
npm run typecheck
```

`npm run test:db` needs Postgres 15+ installed locally (`initdb`, `pg_ctl`,
`psql`) and must not run as the root user. The Playwright test runs a real
headless Chromium and is skipped if none is installed.

Lighthouse (mobile, simulated slow 4G) on the production build: performance
94–97, accessibility 96–100, best practices 100, SEO 100 across `/`,
`/classes`, `/marina` and `/privacy`.

---

## 9. Your photos

There are no stock photos. Image slots show soft painted shapes until you add
your own: put files in `public/images/` and set their paths and descriptions in
`lib/photos.ts`.

---

## Starting data

Seed listings (from `lib/seed.ts`) are marked verified on Oct 1, 2026, and will
switch to “Check times” after 14 days unless a collector or you re-verify them:

- Family Storytime, Marina Branch Library: Tuesdays 10:30–11:00, free
- Preschool Storytime, Marina Branch Library: Fridays 3:00–3:30, free
- Baby & Me Yoga, JCC San Francisco: Wednesdays 10:00–11:20, Sep 9 to Dec 9, $180 per 6 weeks
- Music Together, Fort Mason Building C (C230): Mondays 5:00–5:45pm, Oct 19 to Dec 14, ~$273–298, full/waitlist
- Storytime for Babies, Anza Branch Library: Saturdays 10:30–11:30, free
- “Check times” only: JAMaROO Kids, Sprout San Francisco, The Pad Studios,
  Kinspace Mama + Babe, Natural Resources, Community Well, Outer Village, Music
  Together's other locations

### SF Public Library branches (added Oct 1, 2026)

15 more SFPL branches are set up as sources, one per branch, so each runs its
own nightly check. Twelve storytimes found on their branch pages (via web
search) are waiting in **Admin → Review** as *pending*: confirm each one on
sfpl.org, then approve. Five branches where only older schedules turned up
(Bernal Heights, Ortega, Sunset, Potrero, Mission) appear with “Check times”.

| Neighborhood | Branch | Found |
| --- | --- | --- |
| Laurel & Presidio Heights | Presidio | Babies, Thu 10:15–10:45 |
| Cow Hollow | Golden Gate Valley | Families, Fri 1:15–1:45pm |
| Richmond | Richmond | Babies, Mon 11:00–12:00 |
| Sunset | Parkside | Babies, Thu 10:30–11:15 |
| Haight & Cole Valley | Park | Babies, Sat 11:00–12:00 |
| Western Addition | Western Addition | Families Mon 10:15; Toddlers Tue 11:00; Babies Tue 11:45 |
| North Beach | North Beach | Babies (English & Español), Tue 10:15–10:45 |
| Noe Valley & Castro | Noe Valley; Eureka Valley | Babies Thu 10:15–10:45; Babies Wed 11:00–11:30 |
| SoMa & Mission Bay | Mission Bay | Babies, Thu 10:30–11:15 |

Each SFPL branch is its own *provider* (e.g. “SFPL Presidio”), because
different branches run identically named storytimes at the same time.

### Starting sources: what still needs a human look

The build environment couldn't reach these websites, so each method below is a
best guess, written into the source's notes. Run each with `--dry-run` once and
adjust:

| Source | Method | Status |
| --- | --- | --- |
| SFPL Marina / Anza branch pages | html | Active. Look for an iCal export on sfpl.org/events/calendar; if there is one, switch to `ics` with `categories` |
| SF Music Together classes page | html | Active |
| JCC SF Playdate | html | Active, checked weekly |
| Kinspace Mama + Babe | html | Active, checked weekly |
| Sprout San Francisco | html | **Off**: events page URL not confirmed |
| The Pad Studios | playwright | **Off**: reportedly moved to Momence; set the schedule URL, or switch to manual |
| JAMaROO Kids | manual | Bookings run through Care.com, which we don't scrape |
| Natural Resources, Community Well, Outer Village | manual | Booking systems not confirmed |
| Eventbrite | api | **Off**: needs organiser IDs and `EVENTBRITE_TOKEN` (their API no longer has city-wide search) |
| Meetup | — | Not added: Meetup's API needs a paid Pro account and OAuth |

---

## Project layout

```
app/                    pages: home, /classes, /[hood] landing pages, /account, /privacy
app/admin/              password-protected admin (review, listings, reports, sources, CSV, QR)
app/api/cron/           nightly collection + clean-up, morning digest
components/             UI: listing card, “I'll say hi”, filters, share button…
lib/data/               reads/writes for the site and admin (Supabase or preview store)
lib/pipeline/           collectors: adapters/, Claude extraction, normalising, run rules
scripts/                collect.ts, seed.ts, test-db.sh
supabase/migrations/    schema, row-level security, functions
supabase/tests/         database privacy tests
tests/                  collector and pipeline tests, with saved sample pages in fixtures/
```
