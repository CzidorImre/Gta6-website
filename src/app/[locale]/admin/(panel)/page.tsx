import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return { title: t('title'), robots: { index: false } };
}

export default async function AdminHome({ params }: { params: Promise<{ locale: string }> }) {
  await pageLocale(params);
  const t = await getTranslations('admin');
  const supabase = await createClient();
  const [reports, safety, applications, events, hidden] = await Promise.all([
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open').eq('category', 'safety'),
    supabase.from('organizer_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('events').select('id', { count: 'exact', head: true }).not('hidden_at', 'is', null),
  ]);
  const tiles = [
    { href: '/admin/reports', label: t('overview.safety'), count: safety.count ?? 0, urgent: (safety.count ?? 0) > 0 },
    { href: '/admin/reports', label: t('overview.reports'), count: reports.count ?? 0, urgent: false },
    { href: '/admin/applications', label: t('overview.applications'), count: applications.count ?? 0, urgent: false },
    { href: '/admin/events', label: t('overview.events'), count: events.count ?? 0, urgent: false },
    { href: '/admin/events', label: t('overview.hidden'), count: hidden.count ?? 0, urgent: false },
  ] as const;
  return (
    <>
      <h1 className="text-4xl font-extrabold">{t('title')}</h1>
      <p className="mt-2 text-muted">{t('overview.lead')}</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link href={tile.href} className={`card block p-5 no-underline ${tile.urgent ? 'border-danger' : ''}`}>
              <span className={`block font-display text-4xl font-extrabold ${tile.urgent ? 'text-danger' : 'text-accent'}`}>{tile.count}</span>
              <span className="mt-1 block font-semibold">{tile.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-muted">{t('overview.docs')}</p>
    </>
  );
}
