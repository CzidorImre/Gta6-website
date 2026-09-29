-- Reports and moderation: safety reports hide instantly; reports and the moderation log are private;
-- every admin action needs MFA and a reason and is logged. SPEC.md §3 reports/moderation_actions, §5.
begin;
select plan(30);

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
create function pg_temp.act_as_service() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('role', 'service_role', true);
end $$;
-- -----------------------------------------------------------------------------------------------

-- Fixtures: organizer O, attendees A and B, outsider C, admin M, banned X; event E; B's post P.
select pg_temp.new_user('66666666-0000-4000-8000-00000000000a', 'org@t.test', '1990-01-01', 'Org');
select pg_temp.new_user('66666666-0000-4000-8000-00000000000b', 'alice@t.test', '1995-01-01', 'Alice');
select pg_temp.new_user('66666666-0000-4000-8000-00000000000c', 'bob@t.test', '1995-01-01', 'Bob');
select pg_temp.new_user('66666666-0000-4000-8000-00000000000d', 'carol@t.test', '1995-01-01', 'Carol');
select pg_temp.new_user('66666666-0000-4000-8000-00000000000e', 'admin@t.test', '1985-01-01', 'Admin');
select pg_temp.new_user('66666666-0000-4000-8000-00000000000f', 'banned@t.test', '1995-01-01', 'Banned');
update public.profiles set role = 'admin' where id = '66666666-0000-4000-8000-00000000000e';
update public.profiles set rules_accepted_at = now(), rules_version = public.current_rules_version() where id::text like '66666666-%';
update public.profiles set banned_at = now(), ban_reason = 'test' where id = '66666666-0000-4000-8000-00000000000f';
insert into public.organizers (user_id, org_name) values ('66666666-0000-4000-8000-00000000000a', 'Org');
insert into public.venues (id, organizer_id, name, address, kind, lat, lng) values
  ('66666666-1111-4000-8000-000000000001', '66666666-0000-4000-8000-00000000000a', 'Bar', 'Groenplaats 1, Antwerpen', 'bar', 51.2186, 4.4006);
insert into public.events (id, organizer_id, venue_id, title, starts_at, ends_at, platforms, console_count, capacity, min_age, status, published_at) values
  ('66666666-2222-4000-8000-000000000001', '66666666-0000-4000-8000-00000000000a', '66666666-1111-4000-8000-000000000001',
   'Report me', now() + interval '5 days', now() + interval '5 days 4 hours', '{ps5}', 1, 10, 13, 'published', now());
insert into public.rsvps (event_id, user_id) values
  ('66666666-2222-4000-8000-000000000001', '66666666-0000-4000-8000-00000000000b'),
  ('66666666-2222-4000-8000-000000000001', '66666666-0000-4000-8000-00000000000c');
insert into public.group_posts (id, event_id, user_id, display_name, note, discord_handle) values
  ('66666666-3333-4000-8000-000000000001', '66666666-2222-4000-8000-000000000001', '66666666-0000-4000-8000-00000000000c',
   'Bob', 'DM me your address', 'bob_x');

-- Reports only through the server (Turnstile) ----------------------------------------------------
select pg_temp.act_as('66666666-0000-4000-8000-00000000000b');
select throws_ok(
  $$ insert into public.reports (reporter_id, target_type, event_id, category) values
     ('66666666-0000-4000-8000-00000000000b', 'event', '66666666-2222-4000-8000-000000000001', 'spam') $$,
  '42501', null, 'users cannot insert reports directly');
select throws_ok(
  $$ select public.submit_report('66666666-0000-4000-8000-00000000000b', 'event', '66666666-2222-4000-8000-000000000001', 'safety', null) $$,
  '42501', null, 'users cannot call submit_report (it is service-role only)');

select pg_temp.act_as_service();
select is(
  (public.submit_report('66666666-0000-4000-8000-00000000000b', 'event', '66666666-2222-4000-8000-000000000001', 'spam', 'ad for a shop') ->> 'hidden'),
  'false', 'a spam report does not hide the event');
select pg_temp.act_as_anon();
select isnt_empty($$ select 1 from public.events where id = '66666666-2222-4000-8000-000000000001' $$,
  'the event is still public after a non-safety report');

select pg_temp.act_as_service();
select is(
  (public.submit_report('66666666-0000-4000-8000-00000000000b', 'event', '66666666-2222-4000-8000-000000000001', 'safety', 'Organizer asked for home addresses') ->> 'hidden'),
  'true', 'a safety report hides the event immediately');
select is(
  (public.submit_report('66666666-0000-4000-8000-00000000000b', 'event', '66666666-2222-4000-8000-000000000001', 'safety', 'again') ->> 'duplicate'),
  'true', 'the same person reporting the same thing twice is de-duplicated');
select pg_temp.act_as_anon();
select is_empty($$ select 1 from public.events where id = '66666666-2222-4000-8000-000000000001' $$,
  'the event disappears for the public the moment it is reported for safety');
select pg_temp.act_as('66666666-0000-4000-8000-00000000000d');
select is_empty($$ select 1 from public.events where id = '66666666-2222-4000-8000-000000000001' $$,
  'and for signed-in users');

-- Post reports -------------------------------------------------------------------------------------
select pg_temp.act_as_service();
select throws_ok(
  $$ select public.submit_report('66666666-0000-4000-8000-00000000000d', 'group_post', '66666666-3333-4000-8000-000000000001', 'safety', null) $$,
  'P0001', 'TARGET_NOT_FOUND', 'people who cannot see a board cannot report its posts');
select throws_ok(
  $$ select public.submit_report('66666666-0000-4000-8000-00000000000f', 'event', '66666666-2222-4000-8000-000000000001', 'spam', null) $$,
  '42501', 'BANNED', 'banned users cannot report');
select is(
  (public.submit_report('66666666-0000-4000-8000-00000000000b', 'group_post', '66666666-3333-4000-8000-000000000001', 'safety', 'asking for addresses') ->> 'hidden'),
  'true', 'a safety report hides a group post immediately');
reset role;
select is((select target_snapshot ->> 'note' from public.reports where group_post_id = '66666666-3333-4000-8000-000000000001'),
  'DM me your address', 'the reported text is kept with the report');

-- Who can read reports -------------------------------------------------------------------------------
select pg_temp.act_as('66666666-0000-4000-8000-00000000000b');
select results_eq($$ select count(*)::int from public.reports $$, $$ values (3) $$, 'reporters see their own reports');
select pg_temp.act_as('66666666-0000-4000-8000-00000000000c');
select is_empty($$ select 1 from public.reports $$, 'users cannot read other users'' reports');
select pg_temp.act_as('66666666-0000-4000-8000-00000000000a');
select is_empty($$ select 1 from public.reports $$, 'the reported organizer cannot see who reported them');
select pg_temp.act_as_anon();
select throws_ok($$ select 1 from public.reports $$, '42501', null, 'anon cannot read reports');
select pg_temp.act_as('66666666-0000-4000-8000-00000000000b');
select throws_ok($$ update public.reports set status = 'dismissed' $$, '42501', null, 'users cannot resolve reports');

-- Resolving reports -----------------------------------------------------------------------------------
select pg_temp.act_as('66666666-0000-4000-8000-00000000000e', 'aal1');
select throws_ok(
  $$ select public.admin_resolve_report((select id from public.reports where category = 'safety' and target_type = 'event' and event_id = '66666666-2222-4000-8000-000000000001'), 'dismiss', 'fine') $$,
  '42501', 'ADMIN_MFA_REQUIRED', 'admins need MFA to resolve reports');
select pg_temp.act_as('66666666-0000-4000-8000-00000000000e', 'aal2');
select throws_ok(
  $$ select public.admin_resolve_report((select id from public.reports where category = 'safety' and target_type = 'event' and event_id = '66666666-2222-4000-8000-000000000001'), 'dismiss', '') $$,
  '23514', 'REASON_REQUIRED', 'resolving needs a reason');
select is(
  (public.admin_resolve_report((select id from public.reports where category = 'safety' and target_type = 'event' and event_id = '66666666-2222-4000-8000-000000000001'),
    'dismiss', 'Talked to the organizer, misunderstanding') ->> 'restored'),
  'true', 'dismissing the only safety report restores the event');
select results_eq(
  $$ select action::text, target_user_id from public.moderation_actions where target_id in (select id from public.reports where event_id = '66666666-2222-4000-8000-000000000001') $$,
  $$ values ('report_dismissed'::text, '66666666-0000-4000-8000-00000000000a'::uuid) $$,
  'the dismissal is logged against the affected organizer');
select is(
  (public.admin_resolve_report((select id from public.reports where group_post_id = '66666666-3333-4000-8000-000000000001'),
    'remove', 'Asking for home addresses breaks the rules') ->> 'status'),
  'actioned', 'admins can remove a reported post');
reset role;
select is_empty($$ select 1 from public.group_posts where id = '66666666-3333-4000-8000-000000000001' $$, 'the post is gone');
select isnt_empty($$ select 1 from public.reports where target_snapshot ->> 'note' = 'DM me your address' $$,
  'the report keeps the removed text for the record');

-- Moderation log privacy ----------------------------------------------------------------------------
select pg_temp.act_as('66666666-0000-4000-8000-00000000000c');
select is_empty($$ select 1 from public.moderation_actions $$, 'the affected user cannot read the moderation log');
select throws_ok(
  $$ insert into public.moderation_actions (action, target_type, target_id, reason) values ('user_banned', 'user', gen_random_uuid(), 'fake') $$,
  '42501', null, 'nobody can write to the moderation log directly');
select pg_temp.act_as_anon();
select throws_ok($$ select 1 from public.moderation_actions $$, '42501', null, 'anon cannot read the moderation log');

-- Bans ------------------------------------------------------------------------------------------------
select pg_temp.act_as('66666666-0000-4000-8000-00000000000e', 'aal2');
select throws_ok($$ select public.admin_set_ban('66666666-0000-4000-8000-00000000000e', true, 'self ban') $$,
  '42501', 'CANNOT_BAN_ADMIN', 'admins cannot be banned');
select lives_ok($$ select public.admin_set_ban('66666666-0000-4000-8000-00000000000c', true, 'Repeated harassment') $$,
  'admins can ban with a reason');
reset role;
select is_empty($$ select 1 from public.rsvps where user_id = '66666666-0000-4000-8000-00000000000c' $$,
  'a ban removes the user''s upcoming RSVPs so they cannot turn up');

select * from finish();
rollback;
