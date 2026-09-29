import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// Every admin page: admins only (404 otherwise), and only with an MFA (aal2) session.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const t = await getTranslations('admin');
  const supabase = await createClient();
  const [applications, events, reports] = await Promise.all([
    supabase.from('organizer_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);
  const links = [
    { href: '/admin', label: t('nav.overview') },
    { href: '/admin/reports', label: t('nav.reports', { count: reports.count ?? 0 }) },
    { href: '/admin/applications', label: t('nav.applications', { count: applications.count ?? 0 }) },
    { href: '/admin/events', label: t('nav.events', { count: events.count ?? 0 }) },
    { href: '/admin/users', label: t('nav.users') },
    { href: '/admin/log', label: t('nav.log') },
  ] as const;
  return (
    <div className="container-page py-8">
      <nav aria-label={t('nav.label')} className="mb-8 overflow-x-auto">
        <ul className="flex gap-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="chip whitespace-nowrap">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
