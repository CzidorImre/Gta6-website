-- Wanted Level: "going solo, want a group" board. SPEC.md §3, §4, §7 "Group board".
-- Visible only to people who RSVPed to the event (and admins). One post per user per event.

create table public.group_posts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Always overwritten from the profile by the insert trigger; the default only keeps the column
  -- optional for clients (who aren't allowed to write it).
  display_name text not null default '',
  note text not null check (char_length(btrim(note)) between 1 and 280),
  -- Discord usernames: 2–32 of a-z 0-9 _ . (legacy "#1234" suffix allowed). Optional, user's choice.
  discord_handle text check (discord_handle is null or discord_handle ~ '^[A-Za-z0-9_.]{2,32}(#[0-9]{4})?$'),
  hidden_at timestamptz,
  hidden_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index group_posts_event_idx on public.group_posts (event_id);

create trigger group_posts_set_updated_at
  before update on public.group_posts
  for each row execute function public.set_updated_at();

-- The author and display name always come from the session and profile, never from the client.
create function public.group_posts_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  select p.display_name into new.display_name from public.profiles p where p.id = new.user_id;
  if new.display_name is null then
    raise exception 'PROFILE_MISSING' using errcode = '42501';
  end if;
  new.note := btrim(new.note);
  new.discord_handle := nullif(btrim(coalesce(new.discord_handle, '')), '');
  new.hidden_at := null;
  new.hidden_reason := null;
  return new;
end;
$$;

revoke execute on function public.group_posts_before_insert() from public, anon, authenticated;

create trigger group_posts_before_insert
  before insert on public.group_posts
  for each row execute function public.group_posts_before_insert();

-- True when the signed-in user may write on the board: has a profile, isn't banned, accepted rules.
create function public.can_post_on_board(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.banned_at is null
      and p.rules_accepted_at is not null
  )
  and public.has_rsvp(p_event_id)
  and exists (
    select 1 from public.events e
    where e.id = p_event_id and e.status = 'published' and e.hidden_at is null
  );
$$;

revoke execute on function public.can_post_on_board(uuid) from public, anon;
grant execute on function public.can_post_on_board(uuid) to authenticated, service_role;

alter table public.group_posts enable row level security;
revoke all on public.group_posts from anon, authenticated;
grant select, delete on public.group_posts to authenticated;
grant insert (event_id, note, discord_handle) on public.group_posts to authenticated;
grant update (note, discord_handle) on public.group_posts to authenticated;

-- Readers: the author, admins, and people with an RSVP to that event while neither the post nor
-- the event is hidden (the EXISTS goes through the events read policy).
create policy group_posts_select on public.group_posts
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or (
      hidden_at is null
      and public.has_rsvp(event_id)
      and exists (select 1 from public.events e where e.id = group_posts.event_id and e.hidden_at is null)
    )
  );

create policy group_posts_insert_own on public.group_posts
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_post_on_board(event_id));

-- Hidden posts can't be edited (the reported text stays as it was).
create policy group_posts_update_own on public.group_posts
  for update to authenticated
  using (user_id = (select auth.uid()) and hidden_at is null)
  with check (user_id = (select auth.uid()) and public.can_post_on_board(event_id));

create policy group_posts_delete_own on public.group_posts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Admin: hide, restore or remove (delete) a post. Returns the author's user id.
create function public.admin_moderate_group_post(p_post_id uuid, p_action text, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.require_admin();
  v_post public.group_posts;
begin
  select * into v_post from public.group_posts where id = p_post_id for update;
  if not found then
    raise exception 'POST_NOT_FOUND';
  end if;

  case p_action
    when 'hide' then
      update public.group_posts set hidden_at = now(), hidden_reason = 'admin' where id = p_post_id;
      perform public.log_moderation_action('group_post_hidden', 'group_post', p_post_id, v_post.user_id, p_reason);
    when 'restore' then
      update public.group_posts set hidden_at = null, hidden_reason = null where id = p_post_id;
      perform public.log_moderation_action('group_post_restored', 'group_post', p_post_id, v_post.user_id, p_reason);
    when 'remove' then
      perform public.log_moderation_action('group_post_removed', 'group_post', p_post_id, v_post.user_id, p_reason);
      delete from public.group_posts where id = p_post_id;
    else
      raise exception 'INVALID_ACTION';
  end case;
  return v_post.user_id;
end;
$$;

revoke execute on function public.admin_moderate_group_post(uuid, text, text) from public, anon;
grant execute on function public.admin_moderate_group_post(uuid, text, text) to authenticated;
