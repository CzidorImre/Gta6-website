-- RSVPs: capacity and minimum age enforced in rsvp_event(), rules acceptance, bans, and privacy of
-- who is going. SPEC.md §3 rsvps, §4, §5.
begin;
select plan(27);

-- ---- helpers (session-local, rolled back) ----------------------------------------------------
create function pg_temp.new_user(p_id uuid, p_email text, p_dob date, p_name text default 'Test User')
returns uuid language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email, now(), '{}'::jsonb,
          jsonb_build_object('display_name', p_name, 'date_of_birth', p_dob::text), now(), now());
  return p_id;
end $$;
create function pg_temp.act_as(p_user uuid, p_aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;
create function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end $$;
-- -----------------------------------------------------------------------------------------------

-- The age-limited event starts on this Brussels date at 20:00.
create temp table fx on commit drop as
  select (public.brussels_today() + 10) as event_day;
grant select on fx to authenticated, anon;

select pg_temp.new_user('44444444-0000-4000-8000-00000000000a', 'org@t.test', '1990-01-01', 'Org');
select pg_temp.new_user('44444444-0000-4000-8000-00000000000b', 'alice@t.test', '1995-01-01', 'Alice');
select pg_temp.new_user('44444444-0000-4000-8000-00000000000c', 'bob@t.test', '1995-01-01', 'Bob');
select pg_temp.new_user('44444444-0000-4000-8000-00000000000d', 'teen@t.test',
  ((select event_day from fx) - interval '15 years')::date, 'Teen15');
select pg_temp.new_user('44444444-0000-4000-8000-00000000000e', 'sixteen@t.test',
  ((select event_day from fx) - interval '16 years')::date, 'Turns16OnTheDay');
select pg_temp.new_user('44444444-0000-4000-8000-00000000000f', 'norules@t.test', '1995-01-01', 'NoRules');
select pg_temp.new_user('44444444-0000-4000-8000-000000000010', 'banned@t.test', '1995-01-01', 'Banned');
select pg_temp.new_user('44444444-0000-4000-8000-000000000011', 'admin@t.test', '1985-01-01', 'Admin');
update public.profiles set role = 'admin' where id = '44444444-0000-4000-8000-000000000011';
update public.profiles set rules_accepted_at = now(), rules_version = public.current_rules_version()
  where id <> '44444444-0000-4000-8000-00000000000f' and id::text like '44444444-%';
update public.profiles set banned_at = now(), ban_reason = 'test' where id = '44444444-0000-4000-8000-000000000010';

insert into public.organizers (user_id, org_name) values ('44444444-0000-4000-8000-00000000000a', 'Org');
insert into public.venues (id, organizer_id, name, address, kind, lat, lng) values
  ('44444444-1111-4000-8000-000000000001', '44444444-0000-4000-8000-00000000000a', 'Bar', 'Groenplaats 1, Antwerpen', 'bar', 51.2186, 4.4006);
insert into public.events (id, organizer_id, venue_id, title, starts_at, ends_at, platforms, console_count, capacity, min_age, status, published_at) values
  -- E1: one spot
  ('44444444-2222-4000-8000-000000000001', '44444444-0000-4000-8000-00000000000a', '44444444-1111-4000-8000-000000000001',
   'One spot', now() + interval '5 days', now() + interval '5 days 4 hours', '{ps5}', 1, 1, 13, 'published', now()),
  -- E2: 16+, on event_day at 20:00 Brussels
  ('44444444-2222-4000-8000-000000000002', '44444444-0000-4000-8000-00000000000a', '44444444-1111-4000-8000-000000000001',
   'Sixteen plus', ((select event_day from fx) + time '20:00') at time zone 'Europe/Brussels',
   ((select event_day from fx) + time '23:00') at time zone 'Europe/Brussels', '{ps5}', 1, 20, 16, 'published', now()),
  -- E3: pending
  ('44444444-2222-4000-8000-000000000003', '44444444-0000-4000-8000-00000000000a', '44444444-1111-4000-8000-000000000001',
   'Pending', now() + interval '5 days', now() + interval '5 days 4 hours', '{ps5}', 1, 20, 13, 'pending', null),
  -- E4: already started
  ('44444444-2222-4000-8000-000000000004', '44444444-0000-4000-8000-00000000000a', '44444444-1111-4000-8000-000000000001',
   'Started', now() - interval '1 hour', now() + interval '3 hours', '{ps5}', 1, 20, 13, 'published', now()),
  -- E5: 18+
  ('44444444-2222-4000-8000-000000000005', '44444444-0000-4000-8000-00000000000a', '44444444-1111-4000-8000-000000000001',
   'Eighteen plus', now() + interval '5 days', now() + interval '5 days 4 hours', '{xbox}', 1, 20, 18, 'published', now());

-- Who may RSVP ----------------------------------------------------------------------------------
select pg_temp.act_as_anon();
select throws_ok($$ select public.rsvp_event('44444444-2222-4000-8000-000000000001') $$, '42501', null,
  'anonymous visitors cannot RSVP');
select pg_temp.act_as('44444444-0000-4000-8000-00000000000f');
select throws_ok($$ select public.rsvp_event('44444444-2222-4000-8000-000000000001') $$, 'P0001', 'RULES_NOT_ACCEPTED',
  'users must accept the community rules before their first RSVP');
select pg_temp.act_as('44444444-0000-4000-8000-000000000010');
select throws_ok($$ select public.rsvp_event('44444444-2222-4000-8000-000000000001') $$, '42501', 'BANNED',
  'banned users cannot RSVP');
select pg_temp.act_as('44444444-0000-4000-8000-00000000000b');
select throws_ok($$ insert into public.rsvps (event_id, user_id) values ('44444444-2222-4000-8000-000000000001', '44444444-0000-4000-8000-00000000000b') $$,
  '42501', null, 'RSVPs cannot be inserted directly (bypassing capacity and age checks)');

-- Capacity ---------------------------------------------------------------------------------------
select is(public.rsvp_event('44444444-2222-4000-8000-000000000001'), 'going', 'Alice takes the last spot');
select is(public.rsvp_event('44444444-2222-4000-8000-000000000001'), 'already_going', 'RSVPing twice is harmless');
select is((select rsvp_count from public.events where id = '44444444-2222-4000-8000-000000000001'), 1,
  'the RSVP count is maintained');
select pg_temp.act_as('44444444-0000-4000-8000-00000000000c');
select throws_ok($$ select public.rsvp_event('44444444-2222-4000-8000-000000000001') $$, 'P0001', 'EVENT_FULL',
  'Bob is blocked when the event is full');

-- Minimum age, measured on the event date ---------------------------------------------------------
select pg_temp.act_as('44444444-0000-4000-8000-00000000000d');
select throws_ok($$ select public.rsvp_event('44444444-2222-4000-8000-000000000002') $$, 'P0001', 'UNDER_EVENT_MIN_AGE',
  'a 15-year-old is blocked from a 16+ event');
select throws_ok($$ select public.rsvp_event('44444444-2222-4000-8000-000000000005') $$, 'P0001', 'UNDER_EVENT_MIN_AGE',
  'a 15-year-old is blocked from an 18+ event');
select pg_temp.act_as('44444444-0000-4000-8000-00000000000e');
select is(public.rsvp_event('44444444-2222-4000-8000-000000000002'), 'going',
  'someone who turns 16 on the event date may join a 16+ event');
select throws_ok($$ select public.rsvp_event('44444444-2222-4000-8000-000000000005') $$, 'P0001', 'UNDER_EVENT_MIN_AGE',
  'but not an 18+ one');

-- Event state ------------------------------------------------------------------------------------
select pg_temp.act_as('44444444-0000-4000-8000-00000000000b');
select throws_ok($$ select public.rsvp_event('44444444-2222-4000-8000-000000000003') $$, 'P0001', 'EVENT_NOT_AVAILABLE',
  'pending events cannot be joined');
select throws_ok($$ select public.rsvp_event('44444444-2222-4000-8000-000000000004') $$, 'P0001', 'EVENT_STARTED',
  'events that already started cannot be joined');
select throws_ok($$ select public.rsvp_event(gen_random_uuid()) $$, 'P0001', 'EVENT_NOT_AVAILABLE',
  'unknown events cannot be joined');

-- Who can see RSVPs --------------------------------------------------------------------------------
select pg_temp.act_as('44444444-0000-4000-8000-00000000000b');
select results_eq($$ select user_id from public.rsvps $$, $$ values ('44444444-0000-4000-8000-00000000000b'::uuid) $$,
  'users see only their own RSVPs');
select pg_temp.act_as('44444444-0000-4000-8000-00000000000c');
select is_empty($$ select 1 from public.rsvps where user_id = '44444444-0000-4000-8000-00000000000b' $$,
  'users cannot read other users'' RSVPs');
select pg_temp.act_as('44444444-0000-4000-8000-00000000000a');
select is_empty($$ select 1 from public.rsvps $$, 'organizers cannot see who RSVPed (only the count)');
select pg_temp.act_as_anon();
select throws_ok($$ select 1 from public.rsvps $$, '42501', null, 'anon cannot read RSVPs');
select pg_temp.act_as('44444444-0000-4000-8000-000000000011', 'aal1');
select is_empty($$ select 1 from public.rsvps where user_id <> '44444444-0000-4000-8000-000000000011' $$,
  'admins without MFA cannot read other people''s RSVPs');
select pg_temp.act_as('44444444-0000-4000-8000-000000000011', 'aal2');
select isnt_empty($$ select 1 from public.rsvps where event_id = '44444444-2222-4000-8000-000000000001' $$,
  'admins with MFA can read RSVPs');

-- Cancel ----------------------------------------------------------------------------------------
select pg_temp.act_as('44444444-0000-4000-8000-00000000000b');
select ok(public.cancel_rsvp('44444444-2222-4000-8000-000000000001'), 'Alice cancels');
select is((select rsvp_count from public.events where id = '44444444-2222-4000-8000-000000000001'), 0,
  'cancelling frees the spot');
select pg_temp.act_as('44444444-0000-4000-8000-00000000000c');
select is(public.rsvp_event('44444444-2222-4000-8000-000000000001'), 'going', 'Bob gets the freed spot');

-- Attendees keep access while an edited event is back in review -----------------------------------
reset role;
update public.events set status = 'pending' where id = '44444444-2222-4000-8000-000000000001';
select pg_temp.act_as('44444444-0000-4000-8000-00000000000c');
select isnt_empty($$ select 1 from public.events where id = '44444444-2222-4000-8000-000000000001' $$,
  'people going can still open an event that is back in review');
select pg_temp.act_as('44444444-0000-4000-8000-00000000000b');
select is_empty($$ select 1 from public.events where id = '44444444-2222-4000-8000-000000000001' $$,
  'people not going cannot');

-- Capacity can't drop below the number of people going --------------------------------------------
select pg_temp.act_as('44444444-0000-4000-8000-00000000000b');
select public.rsvp_event('44444444-2222-4000-8000-000000000002');
reset role;
select throws_ok($$ update public.events set capacity = 1 where id = '44444444-2222-4000-8000-000000000002' $$,
  '23514', 'new row for relation "events" violates check constraint "events_capacity_covers_rsvps"',
  'capacity can never be lower than the RSVP count');

select * from finish();
rollback;
