import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { pageLocale } from '@/i18n/page-locale';
import { requireViewer } from '@/lib/auth';
import { getEvent } from '@/lib/data/events';
import { mapTilerKey } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { brusselsDateKey, brusselsTimeKey, brusselsToday } from '@/lib/time';
import { EventForm } from '../../../EventForm';
import { MAP_ATTRIBUTION, tileUrlFor } from '@/lib/map';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('forms.event');
  return { title: t('editTitle') };
}

export default async function EditEventPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  await pageLocale(params);
  const { id } = await params;
  const viewer = await requireViewer(`/organizer/events/${id}/edit`);
  const event = await getEvent(id);
  if (!event || event.organizerId !== viewer.userId || !['pending', 'published', 'rejected'].includes(event.status)) notFound();
  const t = await getTranslations('forms.event');
  const supabase = await createClient();
  const { data: venues } = await supabase.from('venues').select('id, name, address, verified_at').eq('organizer_id', viewer.userId).order('created_at');
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-4xl font-extrabold">{t('editTitle')}</h1>
      <div className="card mt-6 p-5">
        <EventForm
          venues={(venues ?? []).map((v) => ({ id: v.id, name: v.name, address: v.address, verified: v.verified_at !== null }))}
          defaults={{
            eventId: event.id,
            venueId: event.venue?.id,
            title: event.title,
            description: event.description,
            date: brusselsDateKey(start),
            startTime: brusselsTimeKey(start),
            endTime: brusselsTimeKey(end),
            platforms: event.platforms,
            consoleCount: event.consoleCount,
            capacity: event.capacity,
            minAge: event.minAge,
            published: event.status === 'published',
          }}
          tileUrl={tileUrlFor(mapTilerKey())}
          attribution={MAP_ATTRIBUTION}
          minDate={brusselsToday()}
        />
      </div>
    </div>
  );
}
