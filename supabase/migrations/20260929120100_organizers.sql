-- Wanted Level: organizers and organizer applications. SPEC.md §3, §4, §7 "Organizer".

create table public.organizers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  org_name text not null check (char_length(btrim(org_name)) between 2 and 80),
  social_url text check (social_url is null or public.is_valid_https_url(social_url)),
  approved_at timestamptz not null default now(),
  approved_by uuid references public.profiles (id) on delete set null
);

alter table public.organizers enable row level security;
revoke all on public.organizers from anon, authenticated;
grant select on public.organizers to anon, authenticated;
-- The public read policy ("has a visible event") is added with the events table.
create policy organizers_select_own_or_admin on public.organizers
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create table public.organizer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  org_name text not null check (char_length(btrim(org_name)) between 2 and 80),
  social_url text not null check (public.is_valid_https_url(social_url)),
  venue_name text not null check (char_length(btrim(venue_name)) between 2 and 80),
  venue_address text not null check (char_length(btrim(venue_address)) between 5 and 200),
  venue_kind public.venue_kind not null,
  message text check (message is null or char_length(message) <= 1000),
  status public.application_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now()
);

create unique index organizer_applications_one_pending_idx
  on public.organizer_applications (user_id) where status = 'pending';
create index organizer_applications_status_idx on public.organizer_applications (status, created_at);

alter table public.organizer_applications enable row level security;
revoke all on public.organizer_applications from anon, authenticated;
grant select on public.organizer_applications to authenticated;

create policy organizer_applications_select_own_or_admin on public.organizer_applications
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Called by the server with the service role, after it has verified the session and Turnstile.
-- Not granted to `authenticated`, so the Turnstile check can't be skipped with a direct API call.
create function public.submit_organizer_application(
  p_user_id uuid,
  p_org_name text,
  p_social_url text,
  p_venue_name text,
  p_venue_address text,
  p_venue_kind public.venue_kind,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_id uuid;
begin
  select * into v_profile from public.profiles where id = p_user_id;
  if not found then
    raise exception 'PROFILE_MISSING' using errcode = '42501';
  end if;
  if v_profile.banned_at is not null then
    raise exception 'BANNED' using errcode = '42501';
  end if;
  if exists (select 1 from public.organizers where user_id = p_user_id) then
    raise exception 'ALREADY_ORGANIZER';
  end if;
  if exists (select 1 from public.organizer_applications where user_id = p_user_id and status = 'pending') then
    raise exception 'APPLICATION_PENDING';
  end if;
  if not public.hit_rate_limit('application:user:' || p_user_id, 3, 86400) then
    raise exception 'RATE_LIMITED';
  end if;

  insert into public.organizer_applications
    (user_id, org_name, social_url, venue_name, venue_address, venue_kind, message)
  values
    (p_user_id, btrim(p_org_name), btrim(p_social_url), btrim(p_venue_name), btrim(p_venue_address),
     p_venue_kind, nullif(btrim(coalesce(p_message, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.submit_organizer_application(uuid, text, text, text, text, public.venue_kind, text)
  from public, anon, authenticated;
grant execute on function public.submit_organizer_application(uuid, text, text, text, text, public.venue_kind, text)
  to service_role;

-- Admin: approve (creates the organizer, role → organizer) or reject, always with a reason.
-- Returns the applicant's user id so the server can email them.
create function public.admin_review_application(p_application_id uuid, p_approve boolean, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_app public.organizer_applications;
begin
  select * into v_app from public.organizer_applications where id = p_application_id for update;
  if not found then
    raise exception 'APPLICATION_NOT_FOUND';
  end if;
  if v_app.status <> 'pending' then
    raise exception 'APPLICATION_ALREADY_REVIEWED';
  end if;

  update public.organizer_applications
  set status = case when p_approve then 'approved'::public.application_status else 'rejected'::public.application_status end,
      reviewed_by = v_admin,
      reviewed_at = now(),
      review_reason = btrim(p_reason)
  where id = p_application_id;

  if p_approve then
    insert into public.organizers (user_id, org_name, social_url, approved_by)
    values (v_app.user_id, v_app.org_name, v_app.social_url, v_admin)
    on conflict (user_id) do update
      set org_name = excluded.org_name, social_url = excluded.social_url,
          approved_at = now(), approved_by = excluded.approved_by;
    update public.profiles set role = 'organizer' where id = v_app.user_id and role = 'user';
    perform public.log_moderation_action('application_approved', 'application', p_application_id, v_app.user_id, p_reason);
  else
    perform public.log_moderation_action('application_rejected', 'application', p_application_id, v_app.user_id, p_reason);
  end if;

  return v_app.user_id;
end;
$$;

revoke execute on function public.admin_review_application(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_application(uuid, boolean, text) to authenticated;
