import type { Metadata } from 'next';
import { getFormatter, getTranslations } from 'next-intl/server';
import { pageLocale } from '@/i18n/page-locale';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.log');
  return { title: t('title'), robots: { index: false } };
}

export default async function AdminLogPage({ params }: { params: Promise<{ locale: string }> }) {
  await pageLocale(params);
  const [t, format] = await Promise.all([getTranslations('admin.log'), getFormatter()]);
  const supabase = await createClient();
  const { data: actions } = await supabase
    .from('moderation_actions')
    .select('id, action, target_type, target_id, reason, created_at, admin:profiles!moderation_actions_admin_id_fkey ( display_name ), target:profiles!moderation_actions_target_user_id_fkey ( display_name )')
    .order('created_at', { ascending: false })
    .limit(200);
  return (
    <>
      <h1 className="text-3xl font-extrabold">{t('title')}</h1>
      <p className="mt-2 text-muted">{t('lead')}</p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="py-2 pr-4">{t('when')}</th>
              <th scope="col" className="py-2 pr-4">{t('admin')}</th>
              <th scope="col" className="py-2 pr-4">{t('action')}</th>
              <th scope="col" className="py-2 pr-4">{t('target')}</th>
              <th scope="col" className="py-2">{t('reason')}</th>
            </tr>
          </thead>
          <tbody>
            {(actions ?? []).map((a) => (
              <tr key={a.id} className="border-b border-line align-top">
                <td className="py-2 pr-4 whitespace-nowrap">{format.dateTime(new Date(a.created_at), { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td className="py-2 pr-4">{a.admin?.display_name ?? '—'}</td>
                <td className="py-2 pr-4 font-mono text-sm">{a.action}</td>
                <td className="py-2 pr-4 text-sm">
                  {a.target_type} {a.target?.display_name ? `· ${a.target.display_name}` : ''}
                  <span className="block font-mono text-xs text-muted">{a.target_id.slice(0, 8)}</span>
                </td>
                <td className="py-2 whitespace-pre-line">{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
