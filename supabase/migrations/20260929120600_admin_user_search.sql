-- Wanted Level: admin user search for the ban screen. Emails live in auth.users, which the API
-- can't read, so this security definer function does the join after checking is_admin() (aal2).

create function public.admin_find_users(p_query text)
returns table (
  id uuid,
  email text,
  display_name text,
  role public.user_role,
  banned_at timestamptz,
  ban_reason text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := btrim(coalesce(p_query, ''));
  v_pattern text;
begin
  perform public.require_admin();
  v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return query
    select p.id, u.email::text, p.display_name, p.role, p.banned_at, p.ban_reason, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where v_query = ''
       or u.email ilike v_pattern
       or p.display_name ilike v_pattern
       or p.id::text = v_query
    order by p.created_at desc
    limit 50;
end;
$$;

revoke execute on function public.admin_find_users(text) from public, anon;
grant execute on function public.admin_find_users(text) to authenticated;
