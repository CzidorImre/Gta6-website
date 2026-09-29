-- Organizer applications and approval. SPEC.md §3 organizers/organizer_applications, §4, §7.
begin;
select plan(20);

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

select pg_temp.new_user('22222222-0000-4000-8000-000000000001', 'applicant@t.test', '1995-01-01', 'Applicant');
select pg_temp.new_user('22222222-0000-4000-8000-000000000002', 'other@t.test', '1995-01-01', 'Other');
select pg_temp.new_user('22222222-0000-4000-8000-000000000003', 'admin@t.test', '1985-01-01', 'Admin');
select pg_temp.new_user('22222222-0000-4000-8000-000000000004', 'banned@t.test', '1995-01-01', 'Banned');
update public.profiles set role = 'admin' where id = '22222222-0000-4000-8000-000000000003';
update public.profiles set banned_at = now(), ban_reason = 'test' where id = '22222222-0000-4000-8000-000000000004';

-- Applications can only be submitted through the server (service role, after Turnstile) --------
select pg_temp.act_as('22222222-0000-4000-8000-000000000001');
select throws_ok(
  $$ insert into public.organizer_applications (user_id, org_name, social_url, venue_name, venue_address, venue_kind)
     values ('22222222-0000-4000-8000-000000000001', 'Org', 'https://x.test', 'Venue', 'Street 1, Antwerpen', 'bar') $$,
  '42501', null, 'users cannot insert applications directly (would skip Turnstile)');
select throws_ok(
  $$ select public.submit_organizer_application('22222222-0000-4000-8000-000000000001', 'Org', 'https://x.test', 'Venue', 'Street 1, Antwerpen', 'bar', null) $$,
  '42501', null, 'users cannot call submit_organizer_application');

select pg_temp.act_as_service();
select lives_ok(
  $$ select public.submit_organizer_application('22222222-0000-4000-8000-000000000001', 'Pixel Club', 'https://pixel.test', 'Pixel Bar', 'Groenplaats 1, 2000 Antwerpen', 'bar', 'Hi!') $$,
  'the server can submit an application');
select throws_ok(
  $$ select public.submit_organizer_application('22222222-0000-4000-8000-000000000001', 'Pixel Club', 'https://pixel.test', 'Pixel Bar', 'Groenplaats 1, 2000 Antwerpen', 'bar', null) $$,
  'P0001', 'APPLICATION_PENDING', 'only one pending application per user');
select throws_ok(
  $$ select public.submit_organizer_application('22222222-0000-4000-8000-000000000004', 'Troll Org', 'https://troll.test', 'Troll Bar', 'Street 2, 2000 Antwerpen', 'bar', null) $$,
  '42501', 'BANNED', 'banned users cannot apply');

-- Visibility -------------------------------------------------------------------------------------
select pg_temp.act_as('22222222-0000-4000-8000-000000000001');
select results_eq($$ select org_name from public.organizer_applications $$, $$ values ('Pixel Club'::text) $$,
  'applicants see their own application');
select pg_temp.act_as('22222222-0000-4000-8000-000000000002');
select is_empty($$ select 1 from public.organizer_applications $$, 'other users cannot see applications');
select pg_temp.act_as_anon();
select throws_ok($$ select 1 from public.organizer_applications $$, '42501', null, 'anon cannot read applications');

-- Review ----------------------------------------------------------------------------------------
select pg_temp.act_as('22222222-0000-4000-8000-000000000001');
select throws_ok(
  $$ select public.admin_review_application((select id from public.organizer_applications limit 1), true, 'self approve') $$,
  '42501', 'ADMIN_MFA_REQUIRED', 'applicants cannot approve themselves');

select pg_temp.act_as('22222222-0000-4000-8000-000000000003', 'aal1');
select throws_ok(
  $$ select public.admin_review_application((select id from public.organizer_applications where user_id = '22222222-0000-4000-8000-000000000001'), true, 'looks fine') $$,
  '42501', 'ADMIN_MFA_REQUIRED', 'admins without MFA cannot review');

select pg_temp.act_as('22222222-0000-4000-8000-000000000003', 'aal2');
select throws_ok(
  $$ select public.admin_review_application((select id from public.organizer_applications where user_id = '22222222-0000-4000-8000-000000000001'), true, ' ') $$,
  '23514', 'REASON_REQUIRED', 'a reason is required');
select is(
  public.admin_review_application((select id from public.organizer_applications where user_id = '22222222-0000-4000-8000-000000000001'), true, 'Checked their socials'),
  '22222222-0000-4000-8000-000000000001'::uuid, 'an admin with MFA approves and gets the applicant id back');
select throws_ok(
  $$ select public.admin_review_application((select id from public.organizer_applications where user_id = '22222222-0000-4000-8000-000000000001'), false, 'again') $$,
  'P0001', 'APPLICATION_ALREADY_REVIEWED', 'an application is reviewed once');
select results_eq(
  $$ select action::text, reason, target_user_id from public.moderation_actions where target_user_id = '22222222-0000-4000-8000-000000000001' $$,
  $$ values ('application_approved'::text, 'Checked their socials'::text, '22222222-0000-4000-8000-000000000001'::uuid) $$,
  'the approval is logged with its reason and the affected user');

reset role;
select is((select role::text from public.profiles where id = '22222222-0000-4000-8000-000000000001'), 'organizer',
  'approval makes the user an organizer');
select is((select org_name from public.organizers where user_id = '22222222-0000-4000-8000-000000000001'), 'Pixel Club',
  'approval creates the public organizer record');

-- Organizer visibility: private until they have a visible event --------------------------------
select pg_temp.act_as_anon();
select is_empty($$ select 1 from public.organizers where user_id = '22222222-0000-4000-8000-000000000001' $$,
  'an organizer without a visible event is not public');
select pg_temp.act_as('22222222-0000-4000-8000-000000000001');
select isnt_empty($$ select 1 from public.organizers where user_id = '22222222-0000-4000-8000-000000000001' $$,
  'organizers see their own record');
select throws_ok($$ update public.organizers set org_name = 'Renamed' $$, '42501', null,
  'organizers cannot edit the approved record directly');
select pg_temp.act_as('22222222-0000-4000-8000-000000000002');
select is_empty($$ select 1 from public.moderation_actions $$, 'regular users cannot read the moderation log');

reset role;
select * from finish();
rollback;
