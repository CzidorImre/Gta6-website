-- "Going solo" group board: only people who RSVPed can read or post. SPEC.md §3 group_posts, §4.
begin;
select plan(19);

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

select pg_temp.new_user('55555555-0000-4000-8000-00000000000a', 'org@t.test', '1990-01-01', 'Org');
select pg_temp.new_user('55555555-0000-4000-8000-00000000000b', 'alice@t.test', '1995-01-01', 'Alice');
select pg_temp.new_user('55555555-0000-4000-8000-00000000000c', 'bob@t.test', '1995-01-01', 'Bob');
select pg_temp.new_user('55555555-0000-4000-8000-00000000000d', 'carol@t.test', '1995-01-01', 'Carol');
select pg_temp.new_user('55555555-0000-4000-8000-00000000000e', 'admin@t.test', '1985-01-01', 'Admin');
update public.profiles set role = 'admin' where id = '55555555-0000-4000-8000-00000000000e';
update public.profiles set rules_accepted_at = now(), rules_version = public.current_rules_version()
  where id::text like '55555555-%';
insert into public.organizers (user_id, org_name) values ('55555555-0000-4000-8000-00000000000a', 'Org');
insert into public.venues (id, organizer_id, name, address, kind, lat, lng) values
  ('55555555-1111-4000-8000-000000000001', '55555555-0000-4000-8000-00000000000a', 'Bar', 'Groenplaats 1, Antwerpen', 'bar', 51.2186, 4.4006);
insert into public.events (id, organizer_id, venue_id, title, starts_at, ends_at, platforms, console_count, capacity, min_age, status, published_at) values
  ('55555555-2222-4000-8000-000000000001', '55555555-0000-4000-8000-00000000000a', '55555555-1111-4000-8000-000000000001',
   'Board test', now() + interval '5 days', now() + interval '5 days 4 hours', '{ps5}', 1, 10, 13, 'published', now());
insert into public.rsvps (event_id, user_id) values
  ('55555555-2222-4000-8000-000000000001', '55555555-0000-4000-8000-00000000000b'),
  ('55555555-2222-4000-8000-000000000001', '55555555-0000-4000-8000-00000000000c');

-- Posting ----------------------------------------------------------------------------------------
select pg_temp.act_as('55555555-0000-4000-8000-00000000000d');
select throws_ok(
  $$ insert into public.group_posts (event_id, note) values ('55555555-2222-4000-8000-000000000001', 'let me in') $$,
  '42501', null, 'people without an RSVP cannot post');

select pg_temp.act_as('55555555-0000-4000-8000-00000000000b');
select throws_ok(
  $$ insert into public.group_posts (event_id, note, display_name) values ('55555555-2222-4000-8000-000000000001', 'hi', 'The Organizer') $$,
  '42501', null, 'posters cannot choose a display name (no impersonation)');
select throws_ok(
  $$ insert into public.group_posts (event_id, user_id, note) values ('55555555-2222-4000-8000-000000000001', '55555555-0000-4000-8000-00000000000c', 'hi') $$,
  '42501', null, 'posters cannot post as someone else');
select lives_ok(
  $$ insert into public.group_posts (event_id, note, discord_handle) values ('55555555-2222-4000-8000-000000000001', 'Solo, want a squad', 'alice_gg') $$,
  'an attendee can post');
select results_eq($$ select display_name, discord_handle from public.group_posts $$,
  $$ values ('Alice'::text, 'alice_gg'::text) $$, 'the display name comes from the profile');
select throws_ok(
  $$ insert into public.group_posts (event_id, note) values ('55555555-2222-4000-8000-000000000001', 'second') $$,
  '23505', null, 'one post per person per event');
select throws_ok(
  $$ update public.group_posts set discord_handle = 'bad handle with spaces' where user_id = '55555555-0000-4000-8000-00000000000b' $$,
  '23514', null, 'Discord handles are validated');

-- Reading ----------------------------------------------------------------------------------------
select pg_temp.act_as('55555555-0000-4000-8000-00000000000c');
select isnt_empty($$ select 1 from public.group_posts $$, 'other attendees can read the board');
update public.group_posts set note = 'hijacked' where user_id = '55555555-0000-4000-8000-00000000000b';
delete from public.group_posts where user_id = '55555555-0000-4000-8000-00000000000b';
select pg_temp.act_as('55555555-0000-4000-8000-00000000000d');
select is_empty($$ select 1 from public.group_posts $$, 'people without an RSVP cannot read the board');
select pg_temp.act_as('55555555-0000-4000-8000-00000000000a');
select is_empty($$ select 1 from public.group_posts $$, 'organizers without an RSVP cannot read it either');
select pg_temp.act_as_anon();
select throws_ok($$ select 1 from public.group_posts $$, '42501', null, 'anon cannot read the board');

reset role;
select is((select note from public.group_posts where user_id = '55555555-0000-4000-8000-00000000000b'), 'Solo, want a squad',
  'attendees cannot edit or delete other people''s posts');

-- Hidden posts ------------------------------------------------------------------------------------
update public.group_posts set hidden_at = now(), hidden_reason = 'safety_report' where user_id = '55555555-0000-4000-8000-00000000000b';
select pg_temp.act_as('55555555-0000-4000-8000-00000000000c');
select is_empty($$ select 1 from public.group_posts $$, 'hidden posts disappear for other attendees');
select pg_temp.act_as('55555555-0000-4000-8000-00000000000b');
select isnt_empty($$ select 1 from public.group_posts $$, 'the author still sees their hidden post');
update public.group_posts set note = 'edited after report' where user_id = '55555555-0000-4000-8000-00000000000b';
reset role;
select is((select note from public.group_posts where user_id = '55555555-0000-4000-8000-00000000000b'), 'Solo, want a squad',
  'hidden posts cannot be edited');
update public.group_posts set hidden_at = null, hidden_reason = null;

-- Admin ------------------------------------------------------------------------------------------
select pg_temp.act_as('55555555-0000-4000-8000-00000000000e', 'aal2');
select isnt_empty($$ select 1 from public.group_posts $$, 'admins with MFA can read boards');
select is(public.admin_moderate_group_post((select id from public.group_posts where user_id = '55555555-0000-4000-8000-00000000000b'), 'hide', 'Personal info in post'),
  '55555555-0000-4000-8000-00000000000b'::uuid, 'admins can hide a post and get the author back');
reset role;
update public.group_posts set hidden_at = null, hidden_reason = null;

-- Cancelling the RSVP removes the post --------------------------------------------------------------
select pg_temp.act_as('55555555-0000-4000-8000-00000000000b');
select public.cancel_rsvp('55555555-2222-4000-8000-000000000001');
reset role;
select is_empty($$ select 1 from public.group_posts where user_id = '55555555-0000-4000-8000-00000000000b' $$,
  'cancelling an RSVP removes your group post');
select pg_temp.act_as('55555555-0000-4000-8000-00000000000b');
select throws_ok(
  $$ insert into public.group_posts (event_id, note) values ('55555555-2222-4000-8000-000000000001', 'back again') $$,
  '42501', null, 'after cancelling you cannot post anymore');

reset role;
select * from finish();
rollback;
