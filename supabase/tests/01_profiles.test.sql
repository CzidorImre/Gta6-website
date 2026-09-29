-- Profiles and the signup trigger: the under-13 gate, DOB stored only in profiles, and who can
-- read or change what. SPEC.md §3 profiles, §4.
begin;
select plan(23);

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

-- Signup trigger ------------------------------------------------------------------------------
select lives_ok(
  $$ select pg_temp.new_user('11111111-0000-4000-8000-000000000001', 'adult@t.test', date '2000-02-29', 'Adult') $$,
  'an adult can sign up');
select is(
  (select date_of_birth from public.profiles where id = '11111111-0000-4000-8000-000000000001'),
  date '2000-02-29', 'the profile stores the date of birth');
select ok(
  not ((select raw_user_meta_data from auth.users where id = '11111111-0000-4000-8000-000000000001') ? 'date_of_birth'),
  'the date of birth is stripped from auth.users metadata');

select throws_ok(
  format($$ select pg_temp.new_user(gen_random_uuid(), 'kid@t.test', %L::date) $$,
         (public.brussels_today() - interval '13 years' + interval '1 day')::date),
  '23514', 'UNDER_MINIMUM_AGE', 'someone one day short of 13 is rejected');
select is_empty($$ select 1 from auth.users where email = 'kid@t.test' $$, 'no auth user is left behind for an under-13 signup');
select lives_ok(
  format($$ select pg_temp.new_user('11111111-0000-4000-8000-000000000002', 'thirteen@t.test', %L::date, 'Thirteen') $$,
         (public.brussels_today() - interval '13 years')::date),
  'someone turning 13 today can sign up');
select throws_ok(
  $$ insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
     values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'nodob@t.test',
             '{"display_name":"No DOB"}', now(), now()) $$,
  '23514', 'DATE_OF_BIRTH_REQUIRED', 'a signup without a date of birth (raw Auth API) is rejected');
select throws_ok(
  $$ select pg_temp.new_user(gen_random_uuid(), 'future@t.test', (current_date + 30)::date) $$,
  '23514', 'DATE_OF_BIRTH_INVALID', 'a date of birth in the future is rejected');

update auth.users set raw_user_meta_data = raw_user_meta_data || '{"date_of_birth":"1990-01-01"}'
  where id = '11111111-0000-4000-8000-000000000001';
select ok(
  not ((select raw_user_meta_data from auth.users where id = '11111111-0000-4000-8000-000000000001') ? 'date_of_birth'),
  'writing a date of birth into auth metadata later (auth.updateUser) is stripped too');

-- Fixtures: an admin
select pg_temp.new_user('11111111-0000-4000-8000-000000000003', 'admin@t.test', date '1985-05-05', 'Admin');
update public.profiles set role = 'admin' where id = '11111111-0000-4000-8000-000000000003';

-- Anonymous ------------------------------------------------------------------------------------
select pg_temp.act_as_anon();
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles at all');

-- Regular user ---------------------------------------------------------------------------------
select pg_temp.act_as('11111111-0000-4000-8000-000000000001');
select results_eq($$ select id from public.profiles $$,
  $$ values ('11111111-0000-4000-8000-000000000001'::uuid) $$, 'a user sees only their own profile');
select is_empty($$ select date_of_birth from public.profiles where id = '11111111-0000-4000-8000-000000000002' $$,
  'a user cannot read another user''s date of birth');
select lives_ok($$ update public.profiles set display_name = 'Adult Renamed', social_url = 'https://example.com/me'
                  where id = '11111111-0000-4000-8000-000000000001' $$, 'a user can edit their display name and link');
select throws_ok($$ update public.profiles set role = 'admin' where id = '11111111-0000-4000-8000-000000000001' $$,
  '42501', null, 'a user cannot make themselves admin');
select throws_ok($$ update public.profiles set date_of_birth = '1980-01-01' where id = '11111111-0000-4000-8000-000000000001' $$,
  '42501', null, 'a user cannot change their date of birth');
select throws_ok($$ update public.profiles set banned_at = null where id = '11111111-0000-4000-8000-000000000001' $$,
  '42501', null, 'a user cannot clear a ban');
update public.profiles set display_name = 'Hacked' where id = '11111111-0000-4000-8000-000000000002';
select throws_ok($$ insert into public.profiles (id, display_name, date_of_birth) values (gen_random_uuid(), 'x', '2000-01-01') $$,
  '42501', null, 'a user cannot insert profiles');
select lives_ok($$ select public.accept_community_rules() $$, 'a user can accept the community rules');
select throws_ok($$ select public.check_rate_limit('x', 1, 60) $$, '42501', null,
  'users cannot call the service-role rate limiter');

reset role;
select is((select display_name from public.profiles where id = '11111111-0000-4000-8000-000000000002'), 'Thirteen',
  'a user cannot edit someone else''s profile');
select is((select rules_version from public.profiles where id = '11111111-0000-4000-8000-000000000001'),
  public.current_rules_version(), 'accepting the rules stores the current rules version with a timestamp');

-- Admin needs MFA ------------------------------------------------------------------------------
select pg_temp.act_as('11111111-0000-4000-8000-000000000003', 'aal1');
select results_eq($$ select count(*)::int from public.profiles $$, $$ values (1) $$,
  'an admin without MFA (aal1) is treated as a regular user');
select pg_temp.act_as('11111111-0000-4000-8000-000000000003', 'aal2');
select ok((select count(*) from public.profiles) >= 3, 'an admin with MFA (aal2) can read all profiles');

reset role;
select * from finish();
rollback;
