-- Wanted Level: reports and the remaining admin functions. SPEC.md §3–§5, §7 "Report", "Ban".

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  -- Set null (not cascade) so a report survives, unlinked, if the reporter deletes their account.
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  event_id uuid not null references public.events (id) on delete cascade,
  group_post_id uuid references public.group_posts (id) on delete set null,
  -- For post reports: the reported text, kept so moderators can review it if the author deletes it.
  target_snapshot jsonb,
  category public.report_category not null,
  details text check (details is null or char_length(details) <= 1000),
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  constraint reports_post_only_for_post_target check (target_type = 'group_post' or group_post_id is null)
);

create index reports_status_idx on public.reports (status, created_at);
create index reports_event_idx on public.reports (event_id);
create index reports_post_idx on public.reports (group_post_id);
create index reports_reporter_idx on public.reports (reporter_id);

alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;

create policy reports_select_own_or_admin on public.reports
  for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));

-- Called by the server with the service role after verifying the session and Turnstile.
-- A `safety` report hides the event or post in the same transaction, before any human looks at it.
-- Returns what the server needs to email the admins.
create function public.submit_report(
  p_reporter_id uuid,
  p_target_type public.report_target,
  p_target_id uuid,
  p_category public.report_category,
  p_details text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_event public.events;
  v_post public.group_posts;
  v_existing uuid;
  v_report_id uuid;
  v_hidden boolean := false;
begin
  select * into v_profile from public.profiles where id = p_reporter_id;
  if not found then
    raise exception 'PROFILE_MISSING' using errcode = '42501';
  end if;
  if v_profile.banned_at is not null then
    raise exception 'BANNED' using errcode = '42501';
  end if;
  if not public.hit_rate_limit('report:user:' || p_reporter_id, 10, 3600)
     or not public.hit_rate_limit('report_day:user:' || p_reporter_id, 30, 86400) then
    raise exception 'RATE_LIMITED';
  end if;

  if p_target_type = 'event' then
    select * into v_event from public.events where id = p_target_id for update;
    if not found or v_event.status in ('rejected', 'removed') then
      raise exception 'TARGET_NOT_FOUND';
    end if;
    -- Pending events are only reportable by people who can see them (organizer or attendees).
    if v_event.status = 'pending' and v_event.organizer_id <> p_reporter_id
       and not exists (select 1 from public.rsvps where event_id = v_event.id and user_id = p_reporter_id) then
      raise exception 'TARGET_NOT_FOUND';
    end if;
    select id into v_existing from public.reports
      where reporter_id = p_reporter_id and target_type = 'event' and event_id = v_event.id
        and category = p_category and status = 'open';
  else
    select * into v_post from public.group_posts where id = p_target_id for update;
    if not found then
      raise exception 'TARGET_NOT_FOUND';
    end if;
    -- Only people who can see the board (attendees) can report a post on it.
    if not exists (select 1 from public.rsvps where event_id = v_post.event_id and user_id = p_reporter_id) then
      raise exception 'TARGET_NOT_FOUND';
    end if;
    select id into v_existing from public.reports
      where reporter_id = p_reporter_id and group_post_id = v_post.id
        and category = p_category and status = 'open';
  end if;

  -- The same person reporting the same thing twice doesn't create a second report or email.
  if v_existing is not null then
    return jsonb_build_object('report_id', v_existing, 'duplicate', true, 'hidden', false);
  end if;

  if p_target_type = 'event' then
    insert into public.reports (reporter_id, target_type, event_id, category, details)
    values (p_reporter_id, 'event', v_event.id, p_category, nullif(btrim(coalesce(p_details, '')), ''))
    returning id into v_report_id;
    if p_category = 'safety' and v_event.hidden_at is null then
      update public.events set hidden_at = now(), hidden_reason = 'safety_report' where id = v_event.id;
      v_hidden := true;
    end if;
    return jsonb_build_object(
      'report_id', v_report_id, 'duplicate', false, 'hidden', v_hidden,
      'event_id', v_event.id, 'target_user_id', v_event.organizer_id);
  end if;

  insert into public.reports (reporter_id, target_type, event_id, group_post_id, target_snapshot, category, details)
  values (
    p_reporter_id, 'group_post', v_post.event_id, v_post.id,
    jsonb_build_object('note', v_post.note, 'discord_handle', v_post.discord_handle, 'display_name', v_post.display_name),
    p_category, nullif(btrim(coalesce(p_details, '')), '')
  )
  returning id into v_report_id;
  if p_category = 'safety' and v_post.hidden_at is null then
    update public.group_posts set hidden_at = now(), hidden_reason = 'safety_report' where id = v_post.id;
    v_hidden := true;
  end if;
  return jsonb_build_object(
    'report_id', v_report_id, 'duplicate', false, 'hidden', v_hidden,
    'event_id', v_post.event_id, 'target_user_id', v_post.user_id);
end;
$$;

revoke execute on function public.submit_report(uuid, public.report_target, uuid, public.report_category, text)
  from public, anon, authenticated;
grant execute on function public.submit_report(uuid, public.report_target, uuid, public.report_category, text)
  to service_role;

-- Admin: resolve an open report.
--   dismiss → report dismissed; the target is un-hidden if a safety report hid it and no other
--             open safety report remains on it.
--   remove  → the event becomes `removed` / the post is deleted; every open report on the same
--             target is closed as actioned.
--   resolve → report actioned, target left as it is (e.g. wrong info fixed with the organizer).
-- Returns jsonb with the affected user so the server can email them.
create function public.admin_resolve_report(p_report_id uuid, p_outcome text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_report public.reports;
  v_target_user uuid;
  v_status public.report_status;
  v_restored boolean := false;
begin
  select * into v_report from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'REPORT_NOT_FOUND';
  end if;
  if v_report.status <> 'open' then
    raise exception 'REPORT_ALREADY_RESOLVED';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 then
    raise exception 'REASON_REQUIRED' using errcode = '23514';
  end if;

  if v_report.target_type = 'event' then
    select organizer_id into v_target_user from public.events where id = v_report.event_id;
  else
    select user_id into v_target_user from public.group_posts where id = v_report.group_post_id;
  end if;

  case p_outcome
    when 'dismiss' then
      v_status := 'dismissed';
    when 'remove', 'resolve' then
      v_status := 'actioned';
    else
      raise exception 'INVALID_ACTION';
  end case;

  update public.reports
  set status = v_status, resolved_by = v_admin, resolved_at = now(), resolution_note = btrim(p_reason)
  where id = p_report_id;

  if p_outcome = 'dismiss' then
    if v_report.target_type = 'event' then
      if not exists (
        select 1 from public.reports r
        where r.event_id = v_report.event_id and r.target_type = 'event'
          and r.category = 'safety' and r.status = 'open'
      ) then
        update public.events set hidden_at = null, hidden_reason = null
          where id = v_report.event_id and hidden_reason = 'safety_report';
        v_restored := found;
      end if;
    elsif v_report.group_post_id is not null then
      if not exists (
        select 1 from public.reports r
        where r.group_post_id = v_report.group_post_id and r.category = 'safety' and r.status = 'open'
      ) then
        update public.group_posts set hidden_at = null, hidden_reason = null
          where id = v_report.group_post_id and hidden_reason = 'safety_report';
        v_restored := found;
      end if;
    end if;
    perform public.log_moderation_action('report_dismissed', 'report', p_report_id, v_target_user, p_reason);
  elsif p_outcome = 'remove' then
    perform public.log_moderation_action('report_actioned', 'report', p_report_id, v_target_user, p_reason);
    if v_report.target_type = 'event' then
      update public.events set status = 'removed' where id = v_report.event_id;
      update public.reports
        set status = 'actioned', resolved_by = v_admin, resolved_at = now(), resolution_note = btrim(p_reason)
        where event_id = v_report.event_id and target_type = 'event' and status = 'open';
      perform public.log_moderation_action('event_removed', 'event', v_report.event_id, v_target_user, p_reason);
    elsif v_report.group_post_id is not null then
      update public.reports
        set status = 'actioned', resolved_by = v_admin, resolved_at = now(), resolution_note = btrim(p_reason)
        where group_post_id = v_report.group_post_id and status = 'open';
      perform public.log_moderation_action('group_post_removed', 'group_post', v_report.group_post_id, v_target_user, p_reason);
      delete from public.group_posts where id = v_report.group_post_id;
    end if;
  else
    perform public.log_moderation_action('report_actioned', 'report', p_report_id, v_target_user, p_reason);
  end if;

  return jsonb_build_object(
    'report_id', p_report_id, 'status', v_status, 'restored', v_restored,
    'target_type', v_report.target_type, 'event_id', v_report.event_id,
    'target_user_id', v_target_user);
end;
$$;

revoke execute on function public.admin_resolve_report(uuid, text, text) from public, anon;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;

-- Admin: ban or unban a user. Banned users keep read access and can delete their account, but
-- lose every write action. A ban also removes their upcoming RSVPs (so they can't turn up at an
-- event), hides their group posts, and hides upcoming events they organize until an admin
-- reviews them. Admins can't be banned (remove the role in SQL first).
create function public.admin_set_ban(p_user_id uuid, p_banned boolean, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_target public.profiles;
begin
  select * into v_target from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;
  if v_target.id = v_admin or v_target.role = 'admin' then
    raise exception 'CANNOT_BAN_ADMIN' using errcode = '42501';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 then
    raise exception 'REASON_REQUIRED' using errcode = '23514';
  end if;

  if p_banned then
    update public.profiles set banned_at = now(), ban_reason = btrim(p_reason) where id = p_user_id;
    delete from public.rsvps r
      using public.events e
      where r.event_id = e.id and r.user_id = p_user_id and e.ends_at > now();
    update public.group_posts
      set hidden_at = coalesce(hidden_at, now()), hidden_reason = coalesce(hidden_reason, 'user_banned')
      where user_id = p_user_id;
    update public.events
      set hidden_at = coalesce(hidden_at, now()), hidden_reason = coalesce(hidden_reason, 'organizer_banned')
      where organizer_id = p_user_id and ends_at > now();
    perform public.log_moderation_action('user_banned', 'user', p_user_id, p_user_id, p_reason);
  else
    update public.profiles set banned_at = null, ban_reason = null where id = p_user_id;
    perform public.log_moderation_action('user_unbanned', 'user', p_user_id, p_user_id, p_reason);
  end if;
  return p_user_id;
end;
$$;

revoke execute on function public.admin_set_ban(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_ban(uuid, boolean, text) to authenticated;
