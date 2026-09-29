-- Nightly retention job: 30 days after an event, RSVPs and group posts go unless there's a legal
-- hold; unconfirmed signups go after 7 days. SPEC.md §7 "Retention".
begin;
select plan(13);

create function pg_temp.new_user(p_id uuid, p_email text, p_dob date, p_name text default 'Test User', p_confirmed boolean default true, p_created timestamptz default now())
returns uuid language plpgsql as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated', p_email,
          case when p_confirmed then now() end, '{}'::jsonb,
          jsonb_build_object('display_name', p_name, 'date_of_birth', p_dob::text), p_created, p_created);
  return p_id;
end $$;
create function pg_temp.act_as(p_user uuid, p_aal text default 'aal1') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

select pg_temp.new_user('77777777-0000-4000-8000-00000000000a', 'org@t.test', '1990-01-01', 'Org');
select pg_temp.new_user('77777777-0000-4000-8000-00000000000b', 'alice@t.test', '1995-01-01', 'Alice');
select pg_temp.new_user('77777777-0000-4000-8000-00000000000c', 'stale@t.test', '1995-01-01', 'Stale', false, now() - interval '8 days');
select pg_temp.new_user('77777777-0000-4000-8000-00000000000d', 'fresh@t.test', '1995-01-01', 'Fresh', false, now() - interval '2 days');
select pg_temp.new_user('77777777-0000-4000-8000-00000000000e', 'oldconfirmed@t.test', '1995-01-01', 'Old', true, now() - interval '400 days');

insert into public.organizers (user_id, org_name) values ('77777777-0000-4000-8000-00000000000a', 'Org');
insert into public.venues (id, organizer_id, name, address, kind, lat, lng) values
  ('77777777-1111-4000-8000-000000000001', '77777777-0000-4000-8000-00000000000a', 'Bar', 'Groenplaats 1, Antwerpen', 'bar', 51.2186, 4.4006);
insert into public.events (id, organizer_id, venue_id, title, starts_at, ends_at, platforms, console_count, capacity, min_age, status, published_at) values
  ('77777777-2222-4000-8000-000000000001', '77777777-0000-4000-8000-00000000000a', '77777777-1111-4000-8000-000000000001',
   'Ended 31 days ago', now() - interval '31 days 4 hours', now() - interval '31 days', '{ps5}', 1, 10, 13, 'published', now()),
  ('77777777-2222-4000-8000-000000000002', '77777777-0000-4000-8000-00000000000a', '77777777-1111-4000-8000-000000000001',
   'Ended 31 days ago, legal hold', now() - interval '31 days 4 hours', now() - interval '31 days', '{ps5}', 1, 10, 13, 'published', now()),
  ('77777777-2222-4000-8000-000000000003', '77777777-0000-4000-8000-00000000000a', '77777777-1111-4000-8000-000000000001',
   'Ended 29 days ago', now() - interval '29 days 4 hours', now() - interval '29 days', '{ps5}', 1, 10, 13, 'published', now());
insert into public.rsvps (event_id, user_id) values
  ('77777777-2222-4000-8000-000000000001', '77777777-0000-4000-8000-00000000000b'),
  ('77777777-2222-4000-8000-000000000002', '77777777-0000-4000-8000-00000000000b'),
  ('77777777-2222-4000-8000-000000000003', '77777777-0000-4000-8000-00000000000b');
insert into public.group_posts (event_id, user_id, display_name, note) values
  ('77777777-2222-4000-8000-000000000001', '77777777-0000-4000-8000-00000000000b', 'Alice', 'old'),
  ('77777777-2222-4000-8000-000000000002', '77777777-0000-4000-8000-00000000000b', 'Alice', 'held'),
  ('77777777-2222-4000-8000-000000000003', '77777777-0000-4000-8000-00000000000b', 'Alice', 'recent');
insert into public.event_legal_holds (event_id, reason) values ('77777777-2222-4000-8000-000000000002', 'Police request');
insert into public.reports (reporter_id, target_type, event_id, category, status, resolved_at) values
  ('77777777-0000-4000-8000-00000000000b', 'event', '77777777-2222-4000-8000-000000000003', 'spam', 'dismissed', now() - interval '13 months'),
  ('77777777-0000-4000-8000-00000000000b', 'event', '77777777-2222-4000-8000-000000000003', 'other', 'open', null);
insert into public.rate_limits (bucket, window_start, hits) values ('test:old', now() - interval '3 days', 5), ('test:new', now(), 1);

select pg_temp.act_as('77777777-0000-4000-8000-00000000000b');
select throws_ok($$ select public.purge_expired_data() $$, '42501', null, 'users cannot run the purge');
reset role;

select lives_ok($$ select public.purge_expired_data() $$, 'the purge runs');

select is_empty($$ select 1 from public.rsvps where event_id = '77777777-2222-4000-8000-000000000001' $$,
  'RSVPs are deleted 30 days after the event ended');
select is_empty($$ select 1 from public.group_posts where event_id = '77777777-2222-4000-8000-000000000001' $$,
  'group posts are deleted 30 days after the event ended');
select isnt_empty($$ select 1 from public.rsvps where event_id = '77777777-2222-4000-8000-000000000002' $$,
  'RSVPs of an event under legal hold are kept');
select isnt_empty($$ select 1 from public.group_posts where event_id = '77777777-2222-4000-8000-000000000002' $$,
  'group posts of an event under legal hold are kept');
select isnt_empty($$ select 1 from public.rsvps where event_id = '77777777-2222-4000-8000-000000000003' $$,
  'RSVPs of an event that ended 29 days ago are kept');
select is_empty($$ select 1 from auth.users where id = '77777777-0000-4000-8000-00000000000c' $$,
  'unconfirmed signups older than 7 days are deleted');
select is_empty($$ select 1 from public.profiles where id = '77777777-0000-4000-8000-00000000000c' $$,
  'and their profile (with date of birth) goes with them');
select isnt_empty($$ select 1 from auth.users where id in ('77777777-0000-4000-8000-00000000000d', '77777777-0000-4000-8000-00000000000e') $$,
  'recent unconfirmed and old confirmed accounts are kept');
select results_eq($$ select status::text from public.reports where event_id = '77777777-2222-4000-8000-000000000003' $$,
  $$ values ('open'::text) $$, 'resolved reports older than 12 months are deleted, open ones kept');
select results_eq($$ select bucket from public.rate_limits where bucket like 'test:%' $$,
  $$ values ('test:new'::text) $$, 'old rate-limit windows are deleted');
select isnt_empty($$ select 1 from cron.job where jobname = 'wanted-level-nightly-purge' and schedule = '15 2 * * *' $$,
  'the purge is scheduled nightly with pg_cron');

select * from finish();
rollback;
