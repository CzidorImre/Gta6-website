-- Structural safety net: RLS is on everywhere, the API roles have exactly the table and function
-- privileges SPEC.md §4 lists, and nothing else. A new table or function that forgets its
-- revoke/grant fails here.
begin;
select plan(8);

select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'every table in public has row-level security enabled');

select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('v', 'm') $$,
  'there are no views that could bypass RLS');

select set_eq(
  $$ select table_name::text || ':' || privilege_type::text from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'anon' $$,
  array['events:SELECT', 'organizers:SELECT', 'venues:SELECT'],
  'anon can only SELECT events, venues and organizers (RLS narrows to visible ones)');

select set_eq(
  $$ select table_name::text || ':' || privilege_type::text from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'authenticated' and privilege_type <> 'SELECT' $$,
  array['group_posts:DELETE'],
  'the only table-wide write privilege for signed-in users is deleting (their own) group posts');

select set_eq(
  $$ select table_name::text || '.' || column_name::text || ':' || privilege_type::text from information_schema.column_privileges
     where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type <> 'SELECT' $$,
  array[
    'group_posts.event_id:INSERT', 'group_posts.note:INSERT', 'group_posts.discord_handle:INSERT',
    'group_posts.note:UPDATE', 'group_posts.discord_handle:UPDATE',
    'profiles.display_name:UPDATE', 'profiles.social_url:UPDATE', 'profiles.locale:UPDATE'
  ],
  'column-level writes are limited to group post text and three profile fields');

select set_eq(
  $$ select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') $$,
  array['age_on', 'brussels_today', 'current_rules_version', 'has_rsvp', 'in_antwerp_area', 'is_admin', 'is_valid_https_url'],
  'anon can only execute pure helpers');

select set_eq(
  $$ select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and has_function_privilege('authenticated', p.oid, 'execute') $$,
  array[
    'age_on', 'brussels_today', 'current_rules_version', 'has_rsvp', 'in_antwerp_area', 'is_admin', 'is_valid_https_url',
    'can_post_on_board', 'require_active_user', 'require_admin', 'require_organizer',
    'accept_community_rules', 'rsvp_event', 'cancel_rsvp', 'save_venue', 'save_event', 'cancel_event',
    'admin_review_application', 'admin_review_event', 'admin_set_legal_hold', 'admin_set_venue_verified',
    'admin_moderate_group_post', 'admin_resolve_report', 'admin_set_ban', 'admin_find_users'
  ],
  'signed-in users can execute only the documented functions (admin_* check MFA themselves)');

select set_eq(
  $$ select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in
       ('submit_report', 'submit_organizer_application', 'check_rate_limit', 'purge_expired_data')
       and has_function_privilege('service_role', p.oid, 'execute') $$,
  array['submit_report', 'submit_organizer_application', 'check_rate_limit', 'purge_expired_data'],
  'the Turnstile-gated and maintenance functions are available to the server''s service role');

select * from finish();
rollback;
