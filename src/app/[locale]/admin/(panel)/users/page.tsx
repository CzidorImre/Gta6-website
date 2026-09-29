import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { pageLocale } from '@/i18n/page-locale';
import { createClient } from '@/lib/supabase/server';
import { banAction } from '../../actions';
import { AdminResult, ReasonActions } from '../AdminBits';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.users');
  return { title: t('title'), robots: { index: false } };
}

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; done?: string; error?: string }>;
}) {
  await pageLocale(params);
  const query = await searchParams;
  const q = (query.q ?? '').slice(0, 100);
  const [t, format] = await Promise.all([getTranslations('admin.users'), getFormatter()]);
  const supabase = await createClient();
  const { data: users } = q ? await supabase.rpc('admin_find_users', { p_query: q }) : { data: [] };

  return (
    <>
      <h1 className="text-3xl font-extrabold">{t('title')}</h1>
      <div className="mt-4">
        <AdminResult done={query.done} error={query.error} />
      </div>
      <form method="get" className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end" role="search">
        <div className="flex-1">
          <label htmlFor="q" className="field-label">
            {t('search')}
          </label>
          <input id="q" name="q" type="search" className="input" defaultValue={q} placeholder={t('searchPlaceholder')} />
        </div>
        <button type="submit" className="btn btn-secondary">
          {t('searchButton')}
        </button>
      </form>
      {q && (users ?? []).length === 0 ? <p className="mt-6 text-muted">{t('noResults')}</p> : null}
      <ul className="mt-6 flex flex-col gap-4">
        {(users ?? []).map((u) => (
          <li key={u.id} className="card p-5">
            <p className="text-lg font-bold">
              {u.display_name} <span className="text-muted">({u.role})</span>
            </p>
            <p className="break-all">{u.email}</p>
            <p className="text-sm text-muted">{t('joined', { date: format.dateTime(new Date(u.created_at), { dateStyle: 'medium' }) })}</p>
            {u.banned_at ? <p className="mt-2 font-semibold text-danger">{t('bannedSince', { date: format.dateTime(new Date(u.banned_at), { dateStyle: 'medium' }), reason: u.ban_reason ?? '' })}</p> : null}
            {u.role !== 'admin' ? (
              <div className="mt-4">
                <ReasonActions
                  action={banAction}
                  hidden={{ id: u.id, banned: u.banned_at ? 'off' : 'on', q }}
                  reasonId={`ban-${u.id}`}
                  buttons={[{ name: 'confirm', value: '1', label: u.banned_at ? t('unban') : t('ban'), variant: u.banned_at ? 'secondary' : 'danger' }]}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
