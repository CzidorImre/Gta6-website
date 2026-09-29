-- Wanted Level: data retention. SPEC.md §7 "Retention". Runs nightly via pg_cron.
-- Keep the privacy policy (src/content/legal/privacy.*.tsx) in sync with these periods.

create function public.purge_expired_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rsvps integer := 0;
  v_posts integer := 0;
  v_reports integer := 0;
  v_rate_limits integer := 0;
  v_unconfirmed integer := 0;
begin
  -- RSVPs and group posts: 30 days after the event ended, unless an admin set a legal hold.
  delete from public.rsvps r
    using public.events e
    where r.event_id = e.id
      and e.ends_at < now() - interval '30 days'
      and not exists (select 1 from public.event_legal_holds h where h.event_id = e.id);
  get diagnostics v_rsvps = row_count;

  delete from public.group_posts p
    using public.events e
    where p.event_id = e.id
      and e.ends_at < now() - interval '30 days'
      and not exists (select 1 from public.event_legal_holds h where h.event_id = e.id);
  get diagnostics v_posts = row_count;

  -- Resolved reports: 12 months after resolution, unless the event is on legal hold.
  delete from public.reports r
    where r.status <> 'open'
      and r.resolved_at < now() - interval '12 months'
      and not exists (select 1 from public.event_legal_holds h where h.event_id = r.event_id);
  get diagnostics v_reports = row_count;

  delete from public.rate_limits where window_start < now() - interval '2 days';
  get diagnostics v_rate_limits = row_count;

  -- Signups whose email was never confirmed, after 7 days (cascades to their profile and DOB).
  -- Wrapped so a permission change on the auth schema can't stop the steps above from running.
  begin
    delete from auth.users
      where email_confirmed_at is null
        and created_at < now() - interval '7 days';
    get diagnostics v_unconfirmed = row_count;
  exception when insufficient_privilege then
    raise warning 'purge_expired_data: no permission to delete unconfirmed auth users';
  end;

  return jsonb_build_object(
    'rsvps', v_rsvps, 'group_posts', v_posts, 'reports', v_reports,
    'rate_limits', v_rate_limits, 'unconfirmed_users', v_unconfirmed);
end;
$$;

revoke execute on function public.purge_expired_data() from public, anon, authenticated;
grant execute on function public.purge_expired_data() to service_role;

-- 02:15 UTC every night (03:15 or 04:15 in Antwerp). cron.schedule upserts by job name.
select cron.schedule('wanted-level-nightly-purge', '15 2 * * *', 'select public.purge_expired_data();');
