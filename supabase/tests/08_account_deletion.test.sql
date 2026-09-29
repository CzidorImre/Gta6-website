-- Account deletion cascades to all of a user's personal data. SPEC.md §7.
-- The app deletes the auth user through the Supabase Auth admin API; the Playwright test
-- e2e/account-deletion.spec.ts covers that real path end to end. Here we delete the auth.users row
-- directly to check every cascade.
begin;
select plan(14);

create function pg_temp.new_user(p_id uuid, p_email text, p_dob date, p_name text default 'Test User')
returns uuid language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email, now(), '{}'::jsonb,
          jsonb_build_object('display_name', p_name, 'date_of_birth', p_dob::text), now(), now());
  return p_id;
end $$;

select pg_temp.new_user('88888888-0000-4000-8000-00000000000a', 'org@t.test', '1990-01-01', 'Org');
select pg_temp.new_user('88888888-0000-4000-8000-00000000000b', 'alice@t.test', '1995-01-01', 'Alice');
select pg_temp.new_user('88888888-0000-4000-8000-00000000000c', 'bob@t.test', '1995-01-01', 'Bob');
select pg_temp.new_user('88888888-0000-4000-8000-00000000000d', 'admin@t.test', '1985-01-01', 'Admin');
update public.profiles set role = 'admin' where id = '88888888-0000-4000-8000-00000000000d';
insert into public.organizers (user_id, org_name) values ('88888888-0000-4000-8000-00000000000a', 'Org');
insert into public.venues (id, organizer_id, name, address, kind, lat, lng) values
  ('88888888-1111-4000-8000-000000000001', '88888888-0000-4000-8000-00000000000a', 'Bar', 'Groenplaats 1, Antwerpen', 'bar', 51.2186, 4.4006);
insert into public.events (id, organizer_id, venue_id, title, starts_at, ends_at, platforms, console_count, capacity, min_age, status, published_at) values
  ('88888888-2222-4000-8000-000000000001', '88888888-0000-4000-8000-00000000000a', '88888888-1111-4000-8000-000000000001',
   'Deletion test', now() + interval '5 days', now() + interval '5 days 4 hours', '{ps5}', 1, 10, 13, 'published', now());
insert into public.rsvps (event_id, user_id) values
  ('88888888-2222-4000-8000-000000000001', '88888888-0000-4000-8000-00000000000b'),
  ('88888888-2222-4000-8000-000000000001', '88888888-0000-4000-8000-00000000000c');
insert into public.group_posts (event_id, user_id, display_name, note, discord_handle) values
  ('88888888-2222-4000-8000-000000000001', '88888888-0000-4000-8000-00000000000b', 'Alice', 'hi', 'alice_gg');
insert into public.organizer_applications (user_id, org_name, social_url, venue_name, venue_address, venue_kind) values
  ('88888888-0000-4000-8000-00000000000b', 'Alice Org', 'https://alice.test', 'Alice Bar', 'Street 1, Antwerpen', 'bar');
insert into public.reports (reporter_id, target_type, event_id, category, details) values
  ('88888888-0000-4000-8000-00000000000b', 'event', '88888888-2222-4000-8000-000000000001', 'wrong_info', 'Wrong start time');
insert into public.moderation_actions (admin_id, action, target_type, target_id, target_user_id, reason) values
  ('88888888-0000-4000-8000-00000000000d', 'user_unbanned', 'user', '88888888-0000-4000-8000-00000000000b',
   '88888888-0000-4000-8000-00000000000b', 'Appeal accepted');

delete from auth.users where id = '88888888-0000-4000-8000-00000000000b';

select is_empty($$ select 1 from public.profiles where id = '88888888-0000-4000-8000-00000000000b' $$,
  'the profile (with date of birth) is deleted');
select is_empty($$ select 1 from public.rsvps where user_id = '88888888-0000-4000-8000-00000000000b' $$, 'RSVPs are deleted');
select is_empty($$ select 1 from public.group_posts where user_id = '88888888-0000-4000-8000-00000000000b' $$,
  'group posts (with Discord handle) are deleted');
select is_empty($$ select 1 from public.organizer_applications where user_id = '88888888-0000-4000-8000-00000000000b' $$,
  'organizer applications are deleted');
select is_empty($$ select 1 from auth.identities where user_id = '88888888-0000-4000-8000-00000000000b' $$,
  'auth identities are deleted');
select results_eq($$ select reporter_id from public.reports where details = 'Wrong start time' $$,
  $$ values (null::uuid) $$, 'reports filed by the user stay, but are unlinked from them');
select results_eq($$ select target_user_id from public.moderation_actions where reason = 'Appeal accepted' $$,
  $$ values (null::uuid) $$, 'moderation log rows stay, unlinked from the user');
select is((select rsvp_count from public.events where id = '88888888-2222-4000-8000-000000000001'), 1,
  'the event''s spots-left count is corrected');

-- Delete the organizer: their venues and events go, and so do attendees' RSVPs for those events.
delete from auth.users where id = '88888888-0000-4000-8000-00000000000a';

select is_empty($$ select 1 from public.organizers where user_id = '88888888-0000-4000-8000-00000000000a' $$, 'the organizer record is deleted');
select is_empty($$ select 1 from public.venues where organizer_id = '88888888-0000-4000-8000-00000000000a' $$, 'their venues are deleted');
select is_empty($$ select 1 from public.events where organizer_id = '88888888-0000-4000-8000-00000000000a' $$, 'their events are deleted');
select is_empty($$ select 1 from public.rsvps where event_id = '88888888-2222-4000-8000-000000000001' $$,
  'RSVPs to their events are deleted');
select is_empty($$ select 1 from public.reports where event_id = '88888888-2222-4000-8000-000000000001' $$,
  'reports about their deleted events are deleted');
select isnt_empty($$ select 1 from public.profiles where id = '88888888-0000-4000-8000-00000000000c' $$,
  'other users are untouched');

select * from finish();
rollback;
