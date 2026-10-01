-- Row-level-security tests. Run with: npm run test:db
\set ON_ERROR_STOP on
set client_min_messages = warning;

insert into auth.users values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bea@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'cat@example.com');
insert into public.blocked_words values ('fuck', false), ('ass', true);
insert into public.listings (id, provider, dedupe_key, name, status, day_of_week, start_time)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'SFPL', 'k1', 'Family Storytime', 'approved', 2, '10:30'),
       ('aaaaaaaa-0000-0000-0000-000000000002', 'SFPL', 'k2', 'Secret pending', 'pending', 3, '10:00');

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid, ''), false);
end $$;

create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', label; end if;
  raise notice 'ok  %', label;
end $$;
set client_min_messages = notice;

-- Anonymous visitors -------------------------------------------------------
set role anon;
select pg_temp.as_user(null);
select pg_temp.check((select count(*) from public.listings) = 1, 'anon sees only approved listings');
select pg_temp.check((select count(*) from public.sources) = 0, 'anon cannot read sources');
do $$ begin
  perform pending_changes from public.listings;
  raise exception 'FAILED: anon read pending_changes';
exception when insufficient_privilege then raise notice 'ok  anon cannot read admin-only listing columns';
end $$;
do $$ begin
  perform * from public.say_hi;
  raise exception 'FAILED: anon read say_hi';
exception when insufficient_privilege then raise notice 'ok  anon cannot read taps';
end $$;
reset role;

-- Ana and Bea tap "I'll say hi" for Tuesday; Cat taps a different day -------
set role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
insert into public.say_hi (id, listing_id, occurrence_date) values ('5a000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', public.sf_today() + 1);
insert into public.say_hi_names (say_hi_id, listing_id, occurrence_date, first_name) values ('5a000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', public.sf_today() + 1, 'Ana');
do $$ begin
  insert into public.say_hi (listing_id, occurrence_date) values ('aaaaaaaa-0000-0000-0000-000000000001', public.sf_today() + 1);
  raise exception 'FAILED: duplicate tap allowed';
exception when unique_violation then raise notice 'ok  one tap per person per class occurrence';
end $$;
do $$ begin
  insert into public.say_hi (listing_id, occurrence_date) values ('aaaaaaaa-0000-0000-0000-000000000002', public.sf_today() + 1);
  raise exception 'FAILED: tap on pending listing allowed';
exception when insufficient_privilege then raise notice 'ok  cannot tap an unapproved listing';
end $$;
do $$ begin
  insert into public.say_hi (user_id, listing_id, occurrence_date) values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000001', public.sf_today() + 2);
  raise exception 'FAILED: tapped as someone else';
exception when insufficient_privilege then raise notice 'ok  cannot tap on behalf of someone else';
end $$;

select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.check((select count(*) from public.say_hi_names) = 0, 'Bea cannot see names before tapping');
insert into public.say_hi (id, listing_id, occurrence_date) values ('5b000000-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', public.sf_today() + 1);
select pg_temp.check((select array_agg(first_name) from public.say_hi_names) = array['Ana'], 'Bea sees Ana after tapping the same occurrence');
select pg_temp.check((select count(*) from public.say_hi) = 1, 'Bea sees only her own tap');
do $$ begin
  insert into public.say_hi_names (say_hi_id, listing_id, occurrence_date, first_name) values ('5a000000-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000001', public.sf_today() + 1, 'Fake');
  raise exception 'FAILED: wrote a name onto someone else''s tap';
exception when insufficient_privilege or unique_violation then raise notice 'ok  cannot set a name on another mom''s tap';
end $$;
delete from public.say_hi_names where say_hi_id = '5a000000-0000-0000-0000-00000000000a';
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.check((select count(*) from public.say_hi_names) = 1, 'Bea cannot delete Ana''s name');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
do $$ begin
  insert into public.say_hi_names (say_hi_id, listing_id, occurrence_date, first_name) values ('5b000000-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', public.sf_today() + 1, 'Bea Smith');
  raise exception 'FAILED: surname allowed';
exception when check_violation then raise notice 'ok  letters-only first names enforced in the database';
end $$;
do $$ begin
  insert into public.say_hi_names (say_hi_id, listing_id, occurrence_date, first_name) values ('5b000000-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', public.sf_today() + 1, 'Fuckface');
  raise exception 'FAILED: blocked word allowed';
exception when check_violation then raise notice 'ok  block-list enforced in the database';
end $$;
insert into public.say_hi_names (say_hi_id, listing_id, occurrence_date, first_name) values ('5b000000-0000-0000-0000-00000000000b', 'aaaaaaaa-0000-0000-0000-000000000001', public.sf_today() + 1, 'Cassidy');

select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
insert into public.say_hi (listing_id, occurrence_date) values ('aaaaaaaa-0000-0000-0000-000000000001', public.sf_today() + 8);
select pg_temp.check((select count(*) from public.say_hi_names) = 0, 'Cat (different date) cannot see names');
do $$ begin
  perform public.report_name('5a000000-0000-0000-0000-00000000000a', 'test');
  raise exception 'FAILED: non-attendee reported a name';
exception when raise_exception then
  if sqlerrm like 'FAILED%' then raise; end if;
  raise notice 'ok  only fellow attendees can report a name';
end $$;
reset role;

-- Counts are public, identities aren't --------------------------------------
set role anon;
select pg_temp.check(
  (select count from public.say_hi_counts(array['aaaaaaaa-0000-0000-0000-000000000001'::uuid]) where occurrence_date = public.sf_today() + 1) = 2,
  'anyone can read the count (2)');
reset role;

-- Reporting hides the name immediately ---------------------------------------
set role authenticated;
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select public.report_name('5a000000-0000-0000-0000-00000000000a', 'not a real name');
select pg_temp.check((select array_agg(first_name) from public.say_hi_names) = array['Cassidy'], 'reported name hidden from others');
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.check((select count(*) from public.say_hi_names where first_name = 'Ana') = 1, 'Ana still sees her own (hidden) entry');
select pg_temp.check((select count(*) from public.reports) = 0, 'moms cannot read reports');
reset role;
select pg_temp.check((select count(*) from public.reports where status = 'open') = 1, 'admin (service role) sees the report');

-- Clean-up and account deletion ----------------------------------------------
insert into public.say_hi (user_id, listing_id, occurrence_date) values ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-0000-0000-0000-000000000001', public.sf_today() - 1);
insert into public.say_hi_names select id, listing_id, occurrence_date, 'Old', false from public.say_hi where occurrence_date = public.sf_today() - 1;
select pg_temp.check((public.purge_expired()->>'names_deleted')::int = 1, 'names deleted after the class date');
set role authenticated;
do $$ begin
  perform public.purge_expired();
  raise exception 'FAILED: user ran purge';
exception when insufficient_privilege then raise notice 'ok  only the service role can run clean-up';
end $$;
reset role;
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select pg_temp.check((select count(*) from public.say_hi where user_id = '22222222-2222-2222-2222-222222222222') = 0, 'deleting an account deletes her taps');
select pg_temp.check((select count(*) from public.say_hi_names where first_name = 'Cassidy') = 0, '... and her names');

do $$ begin raise notice 'All row-level-security tests passed.'; end $$;
