-- Wanted Level: venues, events, legal holds and RSVPs. SPEC.md §3–§5.

-- The Antwerp area box. Keep in sync with ANTWERP_BOUNDS in src/lib/constants.ts.
create function public.in_antwerp_area(p_lat double precision, p_lng double precision)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_lat between 51.05 and 51.40 and p_lng between 4.15 and 4.65;
$$;

grant execute on function public.in_antwerp_area(double precision, double precision) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Venues
-- ---------------------------------------------------------------------------------------------
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers (user_id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  address text not null check (char_length(btrim(address)) between 5 and 200),
  kind public.venue_kind not null,
  lat double precision not null,
  lng double precision not null,
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint venues_in_antwerp_area check (public.in_antwerp_area(lat, lng))
);

create index venues_organizer_idx on public.venues (organizer_id);

create trigger venues_set_updated_at
  before update on public.venues
  for each row execute function public.set_updated_at();

alter table public.venues enable row level security;
revoke all on public.venues from anon, authenticated;
grant select on public.venues to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers (user_id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  platforms public.platform[] not null check (cardinality(platforms) between 1 and 2),
  console_count integer not null check (console_count between 1 and 100),
  capacity integer not null check (capacity between 1 and 500),
  min_age integer not null check (min_age in (13, 16, 18)),
  rsvp_count integer not null default 0 check (rsvp_count >= 0),
  status public.event_status not null default 'pending',
  hidden_at timestamptz,
  hidden_reason text,
  published_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_order check (ends_at > starts_at and ends_at <= starts_at + interval '24 hours'),
  constraint events_capacity_covers_rsvps check (rsvp_count <= capacity)
);

create index events_status_starts_idx on public.events (status, starts_at);
create index events_organizer_idx on public.events (organizer_id);
create index events_venue_idx on public.events (venue_id);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;
grant select on public.events to anon, authenticated;

-- Legal holds live in their own admin-only table so an organizer never learns their event is held.
create table public.event_legal_holds (
  event_id uuid primary key references public.events (id) on delete cascade,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  set_by uuid references public.profiles (id) on delete set null,
  set_at timestamptz not null default now()
);

alter table public.event_legal_holds enable row level security;
revoke all on public.event_legal_holds from anon, authenticated;
grant select on public.event_legal_holds to authenticated;

create policy event_legal_holds_select_admin on public.event_legal_holds
  for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------------------------
-- RSVPs
-- ---------------------------------------------------------------------------------------------
create table public.rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index rsvps_user_idx on public.rsvps (user_id);

alter table public.rsvps enable row level security;
revoke all on public.rsvps from anon, authenticated;
grant select on public.rsvps to authenticated;

create policy rsvps_select_own_or_admin on public.rsvps
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Keeps events.rsvp_count exact for every insert and delete, including cascades from account
-- deletion. Security definer because cascades can run as the auth service role.
create function public.rsvps_maintain_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.events set rsvp_count = rsvp_count + 1 where id = new.event_id;
    return new;
  else
    update public.events set rsvp_count = greatest(rsvp_count - 1, 0) where id = old.event_id;
    return old;
  end if;
end;
$$;

revoke execute on function public.rsvps_maintain_count() from public, anon, authenticated;

create trigger rsvps_count_insert after insert on public.rsvps
  for each row execute function public.rsvps_maintain_count();
create trigger rsvps_count_delete after delete on public.rsvps
  for each row execute function public.rsvps_maintain_count();

create function public.has_rsvp(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.rsvps r
    where r.event_id = p_event_id and r.user_id = (select auth.uid())
  );
$$;

grant execute on function public.has_rsvp(uuid) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Read policies (events first; venues and organizers reuse the events policy via EXISTS)
-- ---------------------------------------------------------------------------------------------

-- Public: published or cancelled, and not hidden. People who RSVPed keep access while a published
-- event they're going to is back in review after an edit. Organizers see their own, admins all.
create policy events_select_visible on public.events
  for select to anon, authenticated
  using (
    (hidden_at is null and status in ('published', 'cancelled'))
    or (hidden_at is null and status = 'pending' and published_at is not null and public.has_rsvp(id))
    or organizer_id = (select auth.uid())
    or (select public.is_admin())
  );

-- A venue is public only while an event you can see uses it.
create policy venues_select_visible on public.venues
  for select to anon, authenticated
  using (
    organizer_id = (select auth.uid())
    or (select public.is_admin())
    or exists (select 1 from public.events e where e.venue_id = venues.id)
  );

create policy organizers_select_with_visible_event on public.organizers
  for select to anon, authenticated
  using (exists (select 1 from public.events e where e.organizer_id = organizers.user_id));

-- ---------------------------------------------------------------------------------------------
-- Organizer write functions
-- ---------------------------------------------------------------------------------------------
create function public.require_organizer()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := public.require_active_user();
begin
  if not exists (select 1 from public.organizers where user_id = v_profile.id) then
    raise exception 'NOT_ORGANIZER' using errcode = '42501';
  end if;
  return v_profile.id;
end;
$$;

revoke execute on function public.require_organizer() from public, anon;
grant execute on function public.require_organizer() to authenticated;

-- Create (no p_venue_id) or update a venue. Moving a venue or changing its address clears the
-- verified badge and sends its upcoming published events back to review, so an approved event
-- can't be quietly moved somewhere else.
create function public.save_venue(
  p_name text,
  p_address text,
  p_kind public.venue_kind,
  p_lat double precision,
  p_lng double precision,
  p_venue_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_organizer();
  v_old public.venues;
  v_id uuid;
begin
  if p_lat is null or p_lng is null or not public.in_antwerp_area(p_lat, p_lng) then
    raise exception 'VENUE_OUTSIDE_AREA' using errcode = '23514';
  end if;

  if p_venue_id is null then
    insert into public.venues (organizer_id, name, address, kind, lat, lng)
    values (v_uid, btrim(p_name), btrim(p_address), p_kind, p_lat, p_lng)
    returning id into v_id;
    return v_id;
  end if;

  select * into v_old from public.venues where id = p_venue_id and organizer_id = v_uid for update;
  if not found then
    raise exception 'VENUE_NOT_FOUND';
  end if;

  update public.venues
  set name = btrim(p_name), address = btrim(p_address), kind = p_kind, lat = p_lat, lng = p_lng
  where id = p_venue_id;

  if v_old.address is distinct from btrim(p_address)
     or abs(v_old.lat - p_lat) > 0.0005 or abs(v_old.lng - p_lng) > 0.0005 then
    update public.venues set verified_at = null, verified_by = null where id = p_venue_id;
    update public.events set status = 'pending'
      where venue_id = p_venue_id and status = 'published' and ends_at > now();
  end if;
  return p_venue_id;
end;
$$;

revoke execute on function public.save_venue(text, text, public.venue_kind, double precision, double precision, uuid) from public, anon;
grant execute on function public.save_venue(text, text, public.venue_kind, double precision, double precision, uuid) to authenticated;

-- Create (no p_event_id) or edit an event. Always leaves it `pending`: organizers can never
-- publish, and an edit to a published event sends it back to admin review.
create function public.save_event(
  p_venue_id uuid,
  p_title text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_platforms public.platform[],
  p_console_count integer,
  p_capacity integer,
  p_min_age integer,
  p_event_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_organizer();
  v_platforms public.platform[];
  v_old public.events;
  v_id uuid;
begin
  if not exists (select 1 from public.venues where id = p_venue_id and organizer_id = v_uid) then
    raise exception 'VENUE_NOT_FOUND';
  end if;
  if p_starts_at is null or p_starts_at <= now() then
    raise exception 'EVENT_IN_PAST' using errcode = '23514';
  end if;
  select coalesce(array_agg(distinct p order by p), '{}') into v_platforms from unnest(p_platforms) as p;
  if not public.hit_rate_limit('event_save:user:' || v_uid, 20, 86400) then
    raise exception 'RATE_LIMITED';
  end if;

  if p_event_id is null then
    insert into public.events
      (organizer_id, venue_id, title, description, starts_at, ends_at, platforms, console_count, capacity, min_age)
    values
      (v_uid, p_venue_id, btrim(p_title), btrim(coalesce(p_description, '')), p_starts_at, p_ends_at,
       v_platforms, p_console_count, p_capacity, p_min_age)
    returning id into v_id;
    return v_id;
  end if;

  select * into v_old from public.events where id = p_event_id and organizer_id = v_uid for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if v_old.status not in ('pending', 'published', 'rejected') then
    raise exception 'EVENT_NOT_EDITABLE';
  end if;
  if v_old.starts_at <= now() then
    raise exception 'EVENT_STARTED';
  end if;
  if p_capacity < v_old.rsvp_count then
    raise exception 'CAPACITY_BELOW_RSVPS' using errcode = '23514';
  end if;

  update public.events
  set venue_id = p_venue_id, title = btrim(p_title), description = btrim(coalesce(p_description, '')),
      starts_at = p_starts_at, ends_at = p_ends_at, platforms = v_platforms,
      console_count = p_console_count, capacity = p_capacity, min_age = p_min_age,
      status = 'pending'
  where id = p_event_id;
  return p_event_id;
end;
$$;

revoke execute on function public.save_event(uuid, text, text, timestamptz, timestamptz, public.platform[], integer, integer, integer, uuid) from public, anon;
grant execute on function public.save_event(uuid, text, text, timestamptz, timestamptz, public.platform[], integer, integer, integer, uuid) to authenticated;

-- Organizer cancels their own upcoming event. Cancelled events stay reachable by link.
create function public.cancel_event(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  v_uid := auth.uid();
  update public.events
  set status = 'cancelled', cancelled_at = now()
  where id = p_event_id and organizer_id = v_uid and status in ('pending', 'published') and ends_at > now();
  if not found then
    raise exception 'EVENT_NOT_CANCELLABLE';
  end if;
  return p_event_id;
end;
$$;

revoke execute on function public.cancel_event(uuid) from public, anon;
grant execute on function public.cancel_event(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- RSVP functions. Capacity and minimum age are enforced here, not only in the UI.
-- ---------------------------------------------------------------------------------------------
create function public.rsvp_event(p_event_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := public.require_active_user();
  v_event public.events;
begin
  if v_profile.rules_accepted_at is null
     or v_profile.rules_version is distinct from public.current_rules_version() then
    raise exception 'RULES_NOT_ACCEPTED';
  end if;
  if not public.hit_rate_limit('rsvp:user:' || v_profile.id, 30, 600) then
    raise exception 'RATE_LIMITED';
  end if;

  -- Lock the event row so two people can't take the last spot at the same time.
  select * into v_event from public.events where id = p_event_id for update;
  if not found or v_event.status <> 'published' or v_event.hidden_at is not null then
    raise exception 'EVENT_NOT_AVAILABLE';
  end if;
  if v_event.starts_at <= now() then
    raise exception 'EVENT_STARTED';
  end if;
  if exists (select 1 from public.rsvps where event_id = p_event_id and user_id = v_profile.id) then
    return 'already_going';
  end if;
  if public.age_on(v_profile.date_of_birth, (v_event.starts_at at time zone 'Europe/Brussels')::date) < v_event.min_age then
    raise exception 'UNDER_EVENT_MIN_AGE';
  end if;
  if v_event.rsvp_count >= v_event.capacity then
    raise exception 'EVENT_FULL';
  end if;

  insert into public.rsvps (event_id, user_id) values (p_event_id, v_profile.id);
  return 'going';
end;
$$;

revoke execute on function public.rsvp_event(uuid) from public, anon;
grant execute on function public.rsvp_event(uuid) to authenticated;

-- Cancelling also removes the user's group board post for that event (if the group_posts table
-- exists yet; it is created in the next migration). Banned users may cancel.
create function public.cancel_rsvp(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if not public.hit_rate_limit('rsvp:user:' || v_uid, 30, 600) then
    raise exception 'RATE_LIMITED';
  end if;
  delete from public.group_posts where event_id = p_event_id and user_id = v_uid;
  delete from public.rsvps where event_id = p_event_id and user_id = v_uid;
  return found;
end;
$$;

revoke execute on function public.cancel_rsvp(uuid) from public, anon;
grant execute on function public.cancel_rsvp(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Admin functions for events and venues
-- ---------------------------------------------------------------------------------------------

-- p_action: publish | reject | remove | hide | restore. Returns the organizer's user id.
create function public.admin_review_event(p_event_id uuid, p_action text, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_event public.events;
  v_log public.moderation_action_type;
begin
  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  case p_action
    when 'publish' then
      if v_event.status not in ('pending', 'rejected') then
        raise exception 'INVALID_TRANSITION';
      end if;
      update public.events
      set status = 'published', published_at = coalesce(published_at, now())
      where id = p_event_id;
      v_log := 'event_published';
    when 'reject' then
      if v_event.status <> 'pending' then
        raise exception 'INVALID_TRANSITION';
      end if;
      update public.events set status = 'rejected' where id = p_event_id;
      v_log := 'event_rejected';
    when 'remove' then
      if v_event.status = 'removed' then
        raise exception 'INVALID_TRANSITION';
      end if;
      update public.events set status = 'removed' where id = p_event_id;
      v_log := 'event_removed';
    when 'hide' then
      update public.events set hidden_at = now(), hidden_reason = 'admin' where id = p_event_id;
      v_log := 'event_hidden';
    when 'restore' then
      update public.events set hidden_at = null, hidden_reason = null where id = p_event_id;
      v_log := 'event_restored';
    else
      raise exception 'INVALID_ACTION';
  end case;

  perform public.log_moderation_action(v_log, 'event', p_event_id, v_event.organizer_id, p_reason);
  return v_event.organizer_id;
end;
$$;

revoke execute on function public.admin_review_event(uuid, text, text) from public, anon;
grant execute on function public.admin_review_event(uuid, text, text) to authenticated;

create function public.admin_set_legal_hold(p_event_id uuid, p_hold boolean, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
begin
  if not exists (select 1 from public.events where id = p_event_id) then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if p_hold then
    insert into public.event_legal_holds (event_id, reason, set_by)
    values (p_event_id, btrim(p_reason), v_admin)
    on conflict (event_id) do update set reason = excluded.reason, set_by = excluded.set_by, set_at = now();
    -- The organizer is deliberately not recorded as the affected user: no email goes out for a hold.
    perform public.log_moderation_action('legal_hold_set', 'event', p_event_id, null, p_reason);
  else
    delete from public.event_legal_holds where event_id = p_event_id;
    perform public.log_moderation_action('legal_hold_released', 'event', p_event_id, null, p_reason);
  end if;
  return p_event_id;
end;
$$;

revoke execute on function public.admin_set_legal_hold(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_legal_hold(uuid, boolean, text) to authenticated;

create function public.admin_set_venue_verified(p_venue_id uuid, p_verified boolean, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_venue public.venues;
begin
  select * into v_venue from public.venues where id = p_venue_id for update;
  if not found then
    raise exception 'VENUE_NOT_FOUND';
  end if;
  if p_verified then
    update public.venues set verified_at = now(), verified_by = v_admin where id = p_venue_id;
    perform public.log_moderation_action('venue_verified', 'venue', p_venue_id, v_venue.organizer_id, p_reason);
  else
    update public.venues set verified_at = null, verified_by = null where id = p_venue_id;
    perform public.log_moderation_action('venue_unverified', 'venue', p_venue_id, v_venue.organizer_id, p_reason);
  end if;
  return v_venue.organizer_id;
end;
$$;

revoke execute on function public.admin_set_venue_verified(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_venue_verified(uuid, boolean, text) to authenticated;
