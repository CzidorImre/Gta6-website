-- Venues, events and legal holds: organizers can create but never publish; the public only sees
-- visible events; legal holds are admin-only. SPEC.md §3 venues/events/event_legal_holds, §4, §5.
begin;
select plan(34);

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

-- Fixtures: organizer O, second organizer O2, user U, admin A.
select pg_temp.new_user('33333333-0000-4000-8000-00000000000a', 'org@t.test', '1990-01-01', 'Org');
select pg_temp.new_user('33333333-0000-4000-8000-00000000000b', 'org2@t.test', '1990-01-01', 'Org Two');
select pg_temp.new_user('33333333-0000-4000-8000-00000000000c', 'user@t.test', '1990-01-01', 'User');
select pg_temp.new_user('33333333-0000-4000-8000-00000000000d', 'admin@t.test', '1990-01-01', 'Admin');
update public.profiles set role = 'admin' where id = '33333333-0000-4000-8000-00000000000d';
update public.profiles set role = 'organizer' where id in ('33333333-0000-4000-8000-00000000000a', '33333333-0000-4000-8000-00000000000b');
insert into public.organizers (user_id, org_name) values
  ('33333333-0000-4000-8000-00000000000a', 'Org A'), ('33333333-0000-4000-8000-00000000000b', 'Org B');
insert into public.venues (id, organizer_id, name, address, kind, lat, lng) values
  ('33333333-1111-4000-8000-000000000001', '33333333-0000-4000-8000-00000000000a', 'Bar A', 'Groenplaats 1, Antwerpen', 'bar', 51.2186, 4.4006),
  ('33333333-1111-4000-8000-000000000002', '33333333-0000-4000-8000-00000000000b', 'Café B', 'Keyserlei 1, Antwerpen', 'gaming_cafe', 51.2180, 4.4173);

-- Venues ----------------------------------------------------------------------------------------
select pg_temp.act_as('33333333-0000-4000-8000-00000000000c');
select throws_ok($$ select public.save_venue('My House', 'Somewhere 1, Antwerpen', 'bar', 51.21, 4.40, null) $$,
  '42501', 'NOT_ORGANIZER', 'regular users cannot create venues');
select throws_ok($$ insert into public.venues (organizer_id, name, address, kind, lat, lng)
                    values ('33333333-0000-4000-8000-00000000000c', 'X', 'Street 1, X', 'bar', 51.21, 4.40) $$,
  '42501', null, 'venues cannot be inserted directly');

select pg_temp.act_as('33333333-0000-4000-8000-00000000000a');
select throws_ok($$ select public.save_venue('Brussels Bar', 'Grote Markt 1, Brussel', 'bar', 50.8467, 4.3525, null) $$,
  '23514', 'VENUE_OUTSIDE_AREA', 'venues must be in the Antwerp area');
select lives_ok($$ select public.save_venue('Second Bar', 'Meir 1, 2000 Antwerpen', 'bar', 51.2177, 4.4096, null) $$,
  'organizers can create a venue in Antwerp');
select throws_ok($$ select public.save_venue('Stolen', 'Keyserlei 1, Antwerpen', 'bar', 51.218, 4.417, '33333333-1111-4000-8000-000000000002') $$,
  'P0001', 'VENUE_NOT_FOUND', 'organizers cannot edit another organizer''s venue');

-- Events: creation is always pending ------------------------------------------------------------
select throws_ok(
  $$ insert into public.events (organizer_id, venue_id, title, starts_at, ends_at, platforms, console_count, capacity, min_age, status)
     values ('33333333-0000-4000-8000-00000000000a', '33333333-1111-4000-8000-000000000001', 'Direct', now() + interval '2 days',
             now() + interval '2 days 3 hours', '{ps5}', 2, 10, 16, 'published') $$,
  '42501', null, 'organizers cannot insert events directly (e.g. as published)');
select lives_ok(
  $$ select public.save_event('33333333-1111-4000-8000-000000000001', 'Launch Night A', 'Come play',
       now() + interval '10 days', now() + interval '10 days 5 hours', '{ps5,xbox,ps5}', 4, 20, 16, null) $$,
  'organizers create events through save_event');
select throws_ok(
  $$ select public.save_event('33333333-1111-4000-8000-000000000002', 'Not my venue', '',
       now() + interval '10 days', now() + interval '10 days 5 hours', '{ps5}', 1, 5, 16, null) $$,
  'P0001', 'VENUE_NOT_FOUND', 'organizers can only use their own venues');
select throws_ok(
  $$ select public.save_event('33333333-1111-4000-8000-000000000001', 'Past', '',
       now() - interval '1 day', now() - interval '20 hours', '{ps5}', 1, 5, 16, null) $$,
  '23514', 'EVENT_IN_PAST', 'events must start in the future');
select throws_ok(
  $$ select public.save_event('33333333-1111-4000-8000-000000000001', 'Weird age', '',
       now() + interval '3 days', now() + interval '3 days 2 hours', '{ps5}', 1, 5, 15, null) $$,
  '23514', null, 'minimum age must be 13, 16 or 18');

reset role;
select results_eq(
  $$ select status::text, platforms::text from public.events where title = 'Launch Night A' $$,
  $$ values ('pending'::text, '{ps5,xbox}'::text) $$,
  'a new event is pending, with platforms de-duplicated');

-- Users cannot publish their own events --------------------------------------------------------
select pg_temp.act_as('33333333-0000-4000-8000-00000000000a');
select throws_ok($$ update public.events set status = 'published' where title = 'Launch Night A' $$,
  '42501', null, 'organizers cannot update event status directly');
select throws_ok($$ select public.admin_review_event((select id from public.events where title = 'Launch Night A'), 'publish', 'please') $$,
  '42501', 'ADMIN_MFA_REQUIRED', 'organizers cannot call the admin publish function');
select isnt_empty($$ select 1 from public.events where title = 'Launch Night A' $$, 'organizers see their own pending event');

select pg_temp.act_as_anon();
select is_empty($$ select 1 from public.events where title = 'Launch Night A' $$, 'anon cannot see a pending event');
select pg_temp.act_as('33333333-0000-4000-8000-00000000000c');
select is_empty($$ select 1 from public.events where title = 'Launch Night A' $$, 'other users cannot see a pending event');

select pg_temp.act_as('33333333-0000-4000-8000-00000000000d', 'aal1');
select throws_ok($$ select public.admin_review_event((select id from public.events where title = 'Launch Night A'), 'publish', 'ok') $$,
  '42501', 'ADMIN_MFA_REQUIRED', 'admins need MFA to publish');
select pg_temp.act_as('33333333-0000-4000-8000-00000000000d', 'aal2');
select is(public.admin_review_event((select id from public.events where title = 'Launch Night A'), 'publish', 'Venue checked'),
  '33333333-0000-4000-8000-00000000000a'::uuid, 'an admin with MFA publishes and gets the organizer id back');

-- Public visibility of a published event, its venue and organizer --------------------------------
select pg_temp.act_as_anon();
select isnt_empty($$ select 1 from public.events where title = 'Launch Night A' $$, 'anon sees a published event');
select isnt_empty($$ select 1 from public.venues where id = '33333333-1111-4000-8000-000000000001' $$,
  'the venue of a published event is public');
select isnt_empty($$ select 1 from public.organizers where user_id = '33333333-0000-4000-8000-00000000000a' $$,
  'the organizer of a published event is public');
select is_empty($$ select 1 from public.venues where id = '33333333-1111-4000-8000-000000000002' $$,
  'a venue without a visible event is not public');

-- Editing a published event sends it back to review ----------------------------------------------
select pg_temp.act_as('33333333-0000-4000-8000-00000000000a');
select lives_ok(
  $$ select public.save_event('33333333-1111-4000-8000-000000000001',
       'Launch Night A (edited)', 'Now with pizza', now() + interval '10 days', now() + interval '10 days 6 hours', '{ps5}', 4, 20, 18, (select id from public.events where title = 'Launch Night A')) $$,
  'organizers can edit their published event');
reset role;
select is((select status::text from public.events where title = 'Launch Night A (edited)'), 'pending',
  'an edited published event goes back to pending');
select pg_temp.act_as_anon();
select is_empty($$ select 1 from public.events where title = 'Launch Night A (edited)' $$,
  'an event back in review is not public');

-- Hidden and cancelled --------------------------------------------------------------------------
reset role;
update public.events set status = 'published', hidden_at = now(), hidden_reason = 'safety_report' where title = 'Launch Night A (edited)';
select pg_temp.act_as_anon();
select is_empty($$ select 1 from public.events where title = 'Launch Night A (edited)' $$, 'hidden events are not public');
select pg_temp.act_as('33333333-0000-4000-8000-00000000000a');
select isnt_empty($$ select 1 from public.events where title = 'Launch Night A (edited)' $$, 'the organizer still sees their hidden event');
reset role;
update public.events set hidden_at = null, hidden_reason = null where title = 'Launch Night A (edited)';
select pg_temp.act_as('33333333-0000-4000-8000-00000000000a');
select lives_ok($$ select public.cancel_event((select id from public.events where title = 'Launch Night A (edited)')) $$,
  'organizers can cancel their event');
select pg_temp.act_as_anon();
select isnt_empty($$ select 1 from public.events where title = 'Launch Night A (edited)' and status = 'cancelled' $$,
  'a cancelled event stays reachable so people with the link see it is off');

-- Legal holds are admin-only ----------------------------------------------------------------------
select pg_temp.act_as('33333333-0000-4000-8000-00000000000d', 'aal2');
select lives_ok($$ select public.admin_set_legal_hold((select id from public.events where title = 'Launch Night A (edited)'), true, 'Police request ref 123') $$,
  'admins can set a legal hold');
select isnt_empty($$ select 1 from public.event_legal_holds $$, 'admins see legal holds');
select pg_temp.act_as('33333333-0000-4000-8000-00000000000a');
select is_empty($$ select 1 from public.event_legal_holds $$, 'the organizer cannot see a legal hold on their event');
select pg_temp.act_as_anon();
select throws_ok($$ select 1 from public.event_legal_holds $$, '42501', null, 'anon cannot read legal holds');

-- Moving a venue clears the badge and sends its published events back to review ------------------
reset role;
update public.venues set verified_at = now() where id = '33333333-1111-4000-8000-000000000001';
update public.events set status = 'published' where title = 'Launch Night A (edited)';
select pg_temp.act_as('33333333-0000-4000-8000-00000000000a');
select public.save_venue('Bar A', 'Somewhere else 5, 2018 Antwerpen', 'bar', 51.2000, 4.4200, '33333333-1111-4000-8000-000000000001');
reset role;
select results_eq(
  $$ select v.verified_at is null, e.status::text from public.venues v join public.events e on e.venue_id = v.id
     where v.id = '33333333-1111-4000-8000-000000000001' $$,
  $$ values (true, 'pending'::text) $$,
  'moving a venue clears its verified badge and sends its published events back to review');

select * from finish();
rollback;
