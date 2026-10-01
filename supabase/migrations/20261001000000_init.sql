-- Little SF — initial schema.
--
-- Privacy model in one paragraph:
--   * Listings are public once approved. Everything else about the pipeline
--     (sources, history, pending edits) is visible only to the service role
--     used by the admin page and collectors.
--   * A "say hi" tap stores only (user, listing, date). Anyone can read the
--     COUNT through say_hi_counts(); nobody can read anyone else's tap.
--   * An optional first name lives in say_hi_names. Row-level security only
--     returns those rows to a signed-in mom who has herself tapped "I'll say
--     hi" for the same class on the same date. The rows carry no user id.
--   * Names are deleted after the class date by purge_expired() (nightly).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.source_method as enum ('ics', 'api', 'html', 'playwright', 'manual');
create type public.listing_status as enum ('pending', 'approved', 'rejected', 'archived');
create type public.class_type as enum ('music', 'yoga', 'storytime', 'support', 'play');

-- San Francisco "today", used by policies and clean-up.
create or replace function public.sf_today() returns date
language sql stable as $$ select (now() at time zone 'America/Los_Angeles')::date $$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- Source registry: add a row to add a source.
-- ---------------------------------------------------------------------------
create table public.sources (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name             text not null,
  provider         text not null,               -- groups listings for de-duplication
  url              text not null,
  neighborhood     text,
  method           public.source_method not null,
  trusted          boolean not null default false, -- only matters for ics/api auto-approve
  active           boolean not null default true,
  options          jsonb not null default '{}'::jsonb,
  parser_notes     text,
  check_frequency  text not null default 'daily' check (check_frequency in ('daily', 'weekly', 'monthly')),
  last_run_at      timestamptz,
  last_success_at  timestamptz,
  last_error       text,
  last_count       integer,
  needs_attention  boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger sources_updated before update on public.sources
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Listings
-- ---------------------------------------------------------------------------
create table public.listings (
  id               uuid primary key default gen_random_uuid(),
  source_id        uuid references public.sources(id) on delete set null,
  provider         text not null,
  dedupe_key       text not null unique,        -- provider|name|day|time
  name             text not null check (char_length(name) <= 160),
  type             public.class_type,
  day_of_week      smallint check (day_of_week between 0 and 6),
  date             date,
  start_time       time,
  end_time         time,
  series_start     date,
  series_end       date,
  location_name    text,
  address          text,
  neighborhood     text,
  ages_text        text,
  age_min_months   smallint,
  age_max_months   smallint,
  is_free          boolean,
  price            text,
  price_details    text,
  availability     text check (availability in ('open', 'waitlist', 'full')),
  description      text check (char_length(description) <= 400),
  url              text,
  status           public.listing_status not null default 'pending',
  pending_changes  jsonb,                        -- proposed edits waiting for review
  review_note      text,
  last_verified_at timestamptz,
  last_seen_at     timestamptz,
  missing_since    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index listings_status_idx on public.listings (status);
create index listings_source_idx on public.listings (source_id);
create trigger listings_updated before update on public.listings
  for each row execute function public.touch_updated_at();

create table public.listing_history (
  id          bigint generated always as identity primary key,
  listing_id  uuid not null references public.listings(id) on delete cascade,
  action      text not null,   -- created | updated | change_proposed | approved | rejected | edited | verified
  actor       text not null,   -- "collector:<slug>" or "admin"
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);
create index listing_history_listing_idx on public.listing_history (listing_id, created_at desc);

-- ---------------------------------------------------------------------------
-- "I'll say hi"
-- ---------------------------------------------------------------------------
create table public.say_hi (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  listing_id       uuid not null references public.listings(id) on delete cascade,
  occurrence_date  date not null,
  created_at       timestamptz not null default now(),
  unique (user_id, listing_id, occurrence_date)   -- one per person per class occurrence
);
create index say_hi_occurrence_idx on public.say_hi (listing_id, occurrence_date);

create table public.say_hi_names (
  say_hi_id        uuid primary key references public.say_hi(id) on delete cascade,
  listing_id       uuid not null references public.listings(id) on delete cascade,
  occurrence_date  date not null,
  first_name       text not null check (first_name ~ '^[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]{1,20}$'),
  hidden           boolean not null default false,   -- set when reported
  created_at       timestamptz not null default now()
);
create index say_hi_names_occurrence_idx on public.say_hi_names (listing_id, occurrence_date);

create table public.blocked_words (
  word   text primary key,
  exact  boolean not null default false   -- true: whole name must match
);

create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  name_id          uuid references public.say_hi_names(say_hi_id) on delete set null,
  listing_id       uuid references public.listings(id) on delete cascade,
  occurrence_date  date not null,
  first_name       text not null,            -- snapshot so the admin can judge it
  reason           text check (char_length(reason) <= 200),
  reporter_id      uuid references auth.users(id) on delete set null,
  status           text not null default 'open' check (status in ('open', 'removed', 'restored')),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Friday list
-- ---------------------------------------------------------------------------
create table public.subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  neighborhoods     text[] not null default '{}',
  age_bands         text[] not null default '{}',
  unsubscribe_token uuid not null default gen_random_uuid(),
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer = run with the owner's rights, so they
-- can look across rows that RLS would otherwise hide; each one only returns
-- what it is meant to.)
-- ---------------------------------------------------------------------------

-- Is the current user saying hi at this class on this date?
create or replace function public.is_attending(p_listing uuid, p_date date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.say_hi
    where user_id = auth.uid() and listing_id = p_listing and occurrence_date = p_date
  )
$$;

-- Public counts: never who, only how many.
create or replace function public.say_hi_counts(p_listing_ids uuid[])
returns table (listing_id uuid, occurrence_date date, count bigint)
language sql stable security definer set search_path = public as $$
  select s.listing_id, s.occurrence_date, count(*)
  from public.say_hi s
  where s.listing_id = any(p_listing_ids) and s.occurrence_date >= public.sf_today()
  group by s.listing_id, s.occurrence_date
$$;

-- Block-list check for first names.
create or replace function public.check_first_name() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.blocked_words b
    where (b.exact and lower(new.first_name) = b.word)
       or (not b.exact and position(b.word in lower(new.first_name)) > 0)
  ) then
    raise exception 'name_not_allowed' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger say_hi_names_check before insert or update of first_name on public.say_hi_names
  for each row execute function public.check_first_name();

-- Report a first name. Only possible for someone who can see it (i.e. is
-- attending the same occurrence). The name is hidden straight away and
-- waits in the admin page for a decision.
create or replace function public.report_name(p_name_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare n public.say_hi_names;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into n from public.say_hi_names where say_hi_id = p_name_id;
  if n is null or not public.is_attending(n.listing_id, n.occurrence_date) then
    raise exception 'not_allowed';
  end if;
  insert into public.reports (name_id, listing_id, occurrence_date, first_name, reason, reporter_id)
  values (n.say_hi_id, n.listing_id, n.occurrence_date, n.first_name, left(p_reason, 200), auth.uid());
  update public.say_hi_names set hidden = true where say_hi_id = p_name_id;
end $$;

-- Nightly clean-up: names go the day after the class; taps after 30 days.
create or replace function public.purge_expired() returns jsonb
language plpgsql security definer set search_path = public as $$
declare names_deleted int; taps_deleted int;
begin
  delete from public.say_hi_names where occurrence_date < public.sf_today();
  get diagnostics names_deleted = row_count;
  delete from public.say_hi where occurrence_date < public.sf_today() - 30;
  get diagnostics taps_deleted = row_count;
  return jsonb_build_object('names_deleted', names_deleted, 'taps_deleted', taps_deleted);
end $$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.sources          enable row level security;
alter table public.listings         enable row level security;
alter table public.listing_history  enable row level security;
alter table public.say_hi           enable row level security;
alter table public.say_hi_names     enable row level security;
alter table public.blocked_words    enable row level security;
alter table public.reports          enable row level security;
alter table public.subscribers      enable row level security;
-- sources, listing_history, blocked_words, reports, subscribers: no policies,
-- so only the service role (admin page, collectors, server actions) can use them.

-- Listings: approved rows only, and only the public columns.
revoke all on public.listings from anon, authenticated;
grant select (
  id, provider, name, type, day_of_week, date, start_time, end_time, series_start, series_end,
  location_name, address, neighborhood, ages_text, age_min_months, age_max_months, is_free,
  price, price_details, availability, description, url, status, last_verified_at, updated_at
) on public.listings to anon, authenticated;
create policy "approved listings are public" on public.listings
  for select to anon, authenticated using (status = 'approved');

-- say_hi: you only ever see, add or remove your own taps.
revoke all on public.say_hi from anon;
grant select, insert, delete on public.say_hi to authenticated;
create policy "read own taps" on public.say_hi
  for select to authenticated using (user_id = auth.uid());
create policy "add own tap for an upcoming approved class" on public.say_hi
  for insert to authenticated with check (
    user_id = auth.uid()
    and occurrence_date between public.sf_today() and public.sf_today() + 14
    and exists (select 1 from public.listings l where l.id = listing_id and l.status = 'approved')
  );
create policy "remove own tap" on public.say_hi
  for delete to authenticated using (user_id = auth.uid());

-- say_hi_names: visible only to moms attending the same class occurrence.
revoke all on public.say_hi_names from anon;
grant select, insert, delete on public.say_hi_names to authenticated;
create policy "names visible to fellow attendees" on public.say_hi_names
  for select to authenticated using (
    (not hidden and public.is_attending(listing_id, occurrence_date))
    or exists (select 1 from public.say_hi s where s.id = say_hi_id and s.user_id = auth.uid())
  );
create policy "show own name on own tap" on public.say_hi_names
  for insert to authenticated with check (
    not hidden
    and exists (
      select 1 from public.say_hi s
      where s.id = say_hi_id and s.user_id = auth.uid()
        and s.listing_id = say_hi_names.listing_id
        and s.occurrence_date = say_hi_names.occurrence_date
    )
  );
create policy "hide own name" on public.say_hi_names
  for delete to authenticated using (
    exists (select 1 from public.say_hi s where s.id = say_hi_id and s.user_id = auth.uid())
  );

-- Functions callable from the browser / user session.
revoke execute on function public.say_hi_counts(uuid[]) from public;
grant execute on function public.say_hi_counts(uuid[]) to anon, authenticated;
revoke execute on function public.is_attending(uuid, date) from public;
grant execute on function public.is_attending(uuid, date) to authenticated;
revoke execute on function public.report_name(uuid, text) from public;
grant execute on function public.report_name(uuid, text) to authenticated;
revoke execute on function public.purge_expired() from public, anon, authenticated;
