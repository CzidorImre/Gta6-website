import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';
import { requireViewer } from '@/lib/auth';
import { mapTilerKey } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { brusselsToday } from '@/lib/time';
import { EventForm } from '../../EventForm';
import { MAP_ATTRIBUTION, tileUrlFor } from '@/lib/map';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms.event');
  return { title: t('newTitle') };
}

export default async function NewEventPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await pageLocale(params);
  const viewer = await requireViewer('/organizer/events/new');
  if (!viewer.isOrganizer) redirect({ href: '/organizer', locale });
  const t = await getTranslations('forms.event');
  const supabase = await createClient();
  const [{ data: venues }, { data: application }] = await Promise.all([
    supabase.from('venues').select('id, name, address, verified_at').eq('organizer_id', viewer.userId).order('created_at'),
    supabase.from('organizer_applications').select('venue_name, venue_address, venue_kind').eq('status', 'approved').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-4xl font-extrabold">{t('newTitle')}</h1>
      <p className="mt-3 text-muted">{t('newLead')}</p>
      <div className="card mt-6 p-5">
        <EventForm
          venues={(venues ?? []).map((v) => ({ id: v.id, name: v.name, address: v.address, verified: v.verified_at !== null }))}
          defaults={{}}
          tileUrl={tileUrlFor(mapTilerKey())}
          attribution={MAP_ATTRIBUTION}
          suggestedVenue={application ? { name: application.venue_name, address: application.venue_address, kind: application.venue_kind } : undefined}
          minDate={brusselsToday()}
        />
      </div>
    </div>
  );
}
