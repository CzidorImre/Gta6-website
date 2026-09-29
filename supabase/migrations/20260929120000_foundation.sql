-- Wanted Level: foundation
-- Enums, shared helpers, rate limiting, the moderation audit log and profiles.
-- See SPEC.md §3–§5. Every table: RLS on, privileges revoked from anon/authenticated, then granted
-- explicitly, so behaviour does not depend on the project's "auto-expose new tables" setting.

create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------------------------
create type public.user_role as enum ('user', 'organizer', 'admin');
create type public.platform as enum ('ps5', 'xbox');
create type public.venue_kind as enum ('bar', 'gaming_cafe', 'student_association', 'other_public');
create type public.event_status as enum ('pending', 'published', 'rejected', 'cancelled', 'removed');
create type public.application_status as enum ('pending', 'approved', 'rejected');
create type public.report_category as enum ('safety', 'spam', 'wrong_info', 'other');
create type public.report_target as enum ('event', 'group_post');
create type public.report_status as enum ('open', 'actioned', 'dismissed');
create type public.moderation_action_type as enum (
  'application_approved', 'application_rejected',
  'event_published', 'event_rejected', 'event_removed', 'event_hidden', 'event_restored',
  'group_post_removed', 'group_post_hidden', 'group_post_restored',
  'report_dismissed', 'report_actioned',
  'user_banned', 'user_unbanned',
  'legal_hold_set', 'legal_hold_released',
  'venue_verified', 'venue_unverified'
);

-- Supabase grants anon/authenticated execute on new functions in public by default; remove that.
-- Postgres also grants PUBLIC execute on every new function, which schema-level defaults can't
-- undo, so every function below revokes from public explicitly and grants only what it needs.
-- supabase/tests/09_privileges.test.sql fails if a function is exposed that shouldn't be.
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------------------------

-- Whole years between a birth date and a day. Leap-day birthdays turn a year older on 1 March
-- in non-leap years, which is what `age()` does.
create function public.age_on(p_date_of_birth date, p_on date)
returns integer
language sql
immutable
set search_path = ''
as $$
  select extract(year from age(p_on, p_date_of_birth))::integer;
$$;

-- Today's date in Antwerp.
create function public.brussels_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Brussels')::date;
$$;

-- Version of the community and safety rules users must accept before their first RSVP.
-- Keep in sync with RULES_VERSION in src/lib/constants.ts. Bumping it asks everyone to re-accept.
create function public.current_rules_version()
returns text
language sql
immutable
set search_path = ''
as $$
  select '2026-10'::text;
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- https:// only, short enough to display. Used for organizer and profile links.
create function public.is_valid_https_url(p_url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_url ~ '^https://[^\s/$.?#][^\s]*$' and char_length(p_url) <= 200;
$$;

grant execute on function public.age_on(date, date) to anon, authenticated, service_role;
grant execute on function public.brussels_today() to anon, authenticated, service_role;
grant execute on function public.current_rules_version() to anon, authenticated, service_role;
grant execute on function public.is_valid_https_url(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Rate limiting (fixed windows, Postgres-backed so no extra service is needed)
-- ---------------------------------------------------------------------------------------------
create table public.rate_limits (
  bucket text not null check (char_length(bucket) <= 200),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Counts one hit and returns true while the bucket is within its limit. Internal: called by other
-- security definer functions and, through check_rate_limit, by the server with the service role.
-- Note: when the calling transaction later fails, the hit is rolled back with it.
create function public.hit_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits integer;
begin
  if p_max < 1 or p_window_seconds < 1 then
    raise exception 'INVALID_RATE_LIMIT';
  end if;
  v_window := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits as rl (bucket, window_start, hits)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start) do update set hits = rl.hits + 1
  returning rl.hits into v_hits;
  return v_hits <= p_max;
end;
$$;

-- Server entry point (service role only). Used for IP- and email-keyed limits on auth forms and
-- geocoding, where there is no database function doing the work.
create function public.check_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.hit_rate_limit(p_bucket, p_max, p_window_seconds);
$$;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  date_of_birth date not null check (date_of_birth >= date '1900-01-01'),
  social_url text check (social_url is null or public.is_valid_https_url(social_url)),
  locale text not null default 'en' check (locale in ('en', 'nl-BE')),
  role public.user_role not null default 'user',
  rules_accepted_at timestamptz,
  rules_version text,
  banned_at timestamptz,
  ban_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- Users may only change these three columns. Role, DOB, rules and ban fields go through functions.
grant update (display_name, social_url, locale) on public.profiles to authenticated;

-- True only for an admin whose current session passed MFA (aal2). SPEC.md §2.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
     and exists (
       select 1 from public.profiles p
       where p.id = (select auth.uid()) and p.role = 'admin'
     );
$$;

create function public.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'ADMIN_MFA_REQUIRED' using errcode = '42501';
  end if;
  return auth.uid();
end;
$$;

-- The signed-in user's profile, raising if they are signed out or banned. Used by write functions.
create function public.require_active_user()
returns public.profiles
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  select * into v_profile from public.profiles where id = auth.uid();
  if not found then
    raise exception 'PROFILE_MISSING' using errcode = '42501';
  end if;
  if v_profile.banned_at is not null then
    raise exception 'BANNED' using errcode = '42501';
  end if;
  return v_profile;
end;
$$;

grant execute on function public.is_admin() to anon, authenticated, service_role;
revoke execute on function public.require_admin() from public, anon;
grant execute on function public.require_admin() to authenticated;
revoke execute on function public.require_active_user() from public, anon;
grant execute on function public.require_active_user() to authenticated;

create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Creates the profile when Supabase Auth creates a user. This is the enforcement point for the
-- minimum signup age (13, Belgium's age of digital consent): it runs for every signup, including
-- direct calls to the Auth API that skip our forms. After copying the date of birth into
-- profiles, it strips it from auth metadata so it isn't duplicated in auth.users or the JWT.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  v_dob_text text := new.raw_user_meta_data ->> 'date_of_birth';
  v_locale text := coalesce(new.raw_user_meta_data ->> 'locale', 'en');
  v_dob date;
begin
  if v_dob_text is null or v_dob_text !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'DATE_OF_BIRTH_REQUIRED' using errcode = '23514';
  end if;
  begin
    v_dob := v_dob_text::date;
  exception when others then
    raise exception 'DATE_OF_BIRTH_INVALID' using errcode = '23514';
  end;
  if v_dob > public.brussels_today() or v_dob < date '1900-01-01' then
    raise exception 'DATE_OF_BIRTH_INVALID' using errcode = '23514';
  end if;
  if public.age_on(v_dob, public.brussels_today()) < 13 then
    raise exception 'UNDER_MINIMUM_AGE' using errcode = '23514';
  end if;
  if char_length(v_name) not between 2 and 40 then
    raise exception 'DISPLAY_NAME_INVALID' using errcode = '23514';
  end if;
  if v_locale not in ('en', 'nl-BE') then
    v_locale := 'en';
  end if;

  insert into public.profiles (id, display_name, date_of_birth, locale)
  values (new.id, v_name, v_dob, v_locale);

  update auth.users
  set raw_user_meta_data = raw_user_meta_data - 'date_of_birth'
  where id = new.id;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Supabase Auth re-saves the user during signup from its in-memory copy (which still has the date
-- of birth), and users can write their own metadata with auth.updateUser(). This keeps the DOB out
-- of auth.users on every write, so it only ever lives in profiles.
create function public.strip_dob_from_auth_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ? 'date_of_birth' then
    new.raw_user_meta_data := new.raw_user_meta_data - 'date_of_birth';
  end if;
  return new;
end;
$$;

revoke execute on function public.strip_dob_from_auth_metadata() from public, anon, authenticated;

create trigger strip_dob_from_auth_metadata
  before update on auth.users
  for each row execute function public.strip_dob_from_auth_metadata();

-- Supabase Auth also copies signup metadata into the email identity's identity_data.
create function public.strip_dob_from_identity_data()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.identity_data ? 'date_of_birth' then
    new.identity_data := new.identity_data - 'date_of_birth';
  end if;
  return new;
end;
$$;

revoke execute on function public.strip_dob_from_identity_data() from public, anon, authenticated;

create trigger strip_dob_from_identity_data
  before insert or update on auth.identities
  for each row execute function public.strip_dob_from_identity_data();

-- Users accept the current rules once (again only if the version changes).
create function public.accept_community_rules()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  update public.profiles
  set rules_accepted_at = v_now, rules_version = public.current_rules_version()
  where id = auth.uid();
  if not found then
    raise exception 'PROFILE_MISSING' using errcode = '42501';
  end if;
  return v_now;
end;
$$;

revoke execute on function public.accept_community_rules() from public, anon;
grant execute on function public.accept_community_rules() to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Moderation audit log (append-only). Admin functions in later migrations write to it.
-- ---------------------------------------------------------------------------------------------
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  action public.moderation_action_type not null,
  target_type text not null check (target_type in ('application', 'event', 'group_post', 'report', 'user', 'venue')),
  target_id uuid not null,
  target_user_id uuid references public.profiles (id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  created_at timestamptz not null default now()
);

create index moderation_actions_created_at_idx on public.moderation_actions (created_at desc);
create index moderation_actions_target_user_idx on public.moderation_actions (target_user_id);
create index moderation_actions_admin_idx on public.moderation_actions (admin_id);

alter table public.moderation_actions enable row level security;
revoke all on public.moderation_actions from anon, authenticated;
grant select on public.moderation_actions to authenticated;

create policy moderation_actions_select_admin on public.moderation_actions
  for select to authenticated
  using ((select public.is_admin()));

create function public.log_moderation_action(
  p_action public.moderation_action_type,
  p_target_type text,
  p_target_id uuid,
  p_target_user_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_reason is null or char_length(btrim(p_reason)) < 3 then
    raise exception 'REASON_REQUIRED' using errcode = '23514';
  end if;
  insert into public.moderation_actions (admin_id, action, target_type, target_id, target_user_id, reason)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_target_user_id, btrim(p_reason))
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.log_moderation_action(public.moderation_action_type, text, uuid, uuid, text)
  from public, anon, authenticated;
