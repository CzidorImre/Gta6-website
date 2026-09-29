'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { VenuePicker } from '@/components/VenuePicker';
import { EVENT_MIN_AGES, PLATFORMS, VENUE_KINDS } from '@/lib/constants';
import { type OrganizerFormState, geocodeAction, saveEventAction } from './actions';

export interface VenueOption {
  id: string;
  name: string;
  address: string;
  verified: boolean;
}

export interface EventFormDefaults {
  eventId?: string;
  venueId?: string;
  title?: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  platforms?: string[];
  consoleCount?: number;
  capacity?: number;
  minAge?: number;
  published?: boolean;
}

export function EventForm({
  venues,
  defaults,
  tileUrl,
  attribution,
  suggestedVenue,
  minDate,
}: {
  venues: VenueOption[];
  defaults: EventFormDefaults;
  tileUrl: string | null;
  attribution: string;
  suggestedVenue?: { name: string; address: string; kind: string };
  minDate: string;
}) {
  const t = useTranslations('forms.event');
  const tf = useTranslations('form.errors');
  const tKinds = useTranslations('forms.venueKinds');
  const tErrors = useTranslations('errors');
  const [state, action] = useActionState<OrganizerFormState, FormData>(saveEventAction, {});
  const [venueId, setVenueId] = useState(defaults.venueId ?? venues[0]?.id ?? 'new');
  const fe = state.fieldErrors ?? {};
  const err = (name: string) =>
    fe[name] ? (
      <span id={`${name}-error`} className="field-error">
        {tf(fe[name] as 'title')}
      </span>
    ) : null;

  return (
    <form action={action} className="flex flex-col gap-8">
      {defaults.eventId ? <input type="hidden" name="eventId" value={defaults.eventId} /> : null}
      {state.error ? <Notice variant="error">{tErrors(state.error)}</Notice> : null}
      {Object.keys(fe).length > 0 ? <Notice variant="error">{t('fixErrors')}</Notice> : null}
      {defaults.published ? <Notice variant="warning">{t('editPublishedWarning')}</Notice> : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="text-2xl font-extrabold">{t('venueHeading')}</legend>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={t('venueChoice')}>
          {venues.map((v) => (
            <label key={v.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-input p-3 has-[:checked]:border-accent">
              <input type="radio" name="venueId" value={v.id} checked={venueId === v.id} onChange={() => setVenueId(v.id)} className="mt-1 h-5 w-5 accent-[var(--color-accent)]" />
              <span>
                <span className="block font-bold">{v.name}</span>
                <span className="block text-sm text-muted">{v.address}</span>
              </span>
            </label>
          ))}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-input p-3 has-[:checked]:border-accent">
            <input type="radio" name="venueId" value="new" checked={venueId === 'new'} onChange={() => setVenueId('new')} className="mt-1 h-5 w-5 accent-[var(--color-accent)]" />
            <span className="font-bold">{t('newVenue')}</span>
          </label>
          {err('venueId')}
        </div>

        {venueId === 'new' ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-line p-4">
            <div>
              <label htmlFor="venueName" className="field-label">
                {t('venueName')}
              </label>
              <input id="venueName" name="venueName" className="input" required maxLength={80} defaultValue={suggestedVenue?.name ?? ''} aria-invalid={fe.venueName ? true : undefined} />
              {err('venueName')}
            </div>
            <div>
              <label htmlFor="venueAddress" className="field-label">
                {t('venueAddress')}
              </label>
              <input
                id="venueAddress"
                name="venueAddress"
                className="input"
                required
                maxLength={200}
                autoComplete="street-address"
                defaultValue={suggestedVenue?.address ?? ''}
                aria-invalid={fe.venueAddress ? true : undefined}
              />
              {err('venueAddress')}
            </div>
            <div>
              <label htmlFor="venueKind" className="field-label">
                {t('venueKind')}
              </label>
              <select id="venueKind" name="venueKind" className="input" required defaultValue={suggestedVenue?.kind ?? ''}>
                <option value="" disabled>
                  {t('choose')}
                </option>
                {VENUE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {tKinds(kind)}
                  </option>
                ))}
              </select>
              {err('venueKind')}
            </div>
            <VenuePicker tileUrl={tileUrl} attribution={attribution} addressInputId="venueAddress" geocode={geocodeAction} error={fe.location} />
          </div>
        ) : null}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-2xl font-extrabold">{t('detailsHeading')}</legend>
        <div>
          <label htmlFor="title" className="field-label">
            {t('title')}
          </label>
          <input id="title" name="title" className="input" required minLength={3} maxLength={80} defaultValue={defaults.title ?? ''} aria-invalid={fe.title ? true : undefined} />
          {err('title')}
        </div>
        <div>
          <label htmlFor="description" className="field-label">
            {t('description')}
          </label>
          <textarea id="description" name="description" rows={5} maxLength={2000} className="input" defaultValue={defaults.description ?? ''} aria-describedby="description-hint" />
          <span id="description-hint" className="field-hint">
            {t('descriptionHint')}
          </span>
          {err('description')}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="date" className="field-label">
              {t('date')}
            </label>
            <input id="date" name="date" type="date" className="input" required min={minDate} defaultValue={defaults.date ?? ''} aria-invalid={fe.date ? true : undefined} />
            {err('date')}
          </div>
          <div>
            <label htmlFor="startTime" className="field-label">
              {t('startTime')}
            </label>
            <input id="startTime" name="startTime" type="time" className="input" required defaultValue={defaults.startTime ?? '20:00'} aria-invalid={fe.startTime ? true : undefined} />
            {err('startTime')}
          </div>
          <div>
            <label htmlFor="endTime" className="field-label">
              {t('endTime')}
            </label>
            <input id="endTime" name="endTime" type="time" className="input" required defaultValue={defaults.endTime ?? '02:00'} aria-describedby="endTime-hint" aria-invalid={fe.endTime ? true : undefined} />
            <span id="endTime-hint" className="field-hint">
              {t('endTimeHint')}
            </span>
            {err('endTime')}
          </div>
        </div>
        <p className="text-sm text-muted">{t('timezone')}</p>
        <fieldset>
          <legend className="field-label">{t('platforms')}</legend>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <label key={p} className="chip">
                <input type="checkbox" name="platforms" value={p} defaultChecked={defaults.platforms?.includes(p) ?? true} className="h-5 w-5 accent-[var(--color-accent)]" />
                {p === 'ps5' ? 'PS5' : 'Xbox Series X|S'}
              </label>
            ))}
          </div>
          {err('platforms')}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="consoleCount" className="field-label">
              {t('consoleCount')}
            </label>
            <input id="consoleCount" name="consoleCount" type="number" min={1} max={100} className="input" required defaultValue={defaults.consoleCount ?? 2} aria-invalid={fe.consoleCount ? true : undefined} />
            {err('consoleCount')}
          </div>
          <div>
            <label htmlFor="capacity" className="field-label">
              {t('capacity')}
            </label>
            <input id="capacity" name="capacity" type="number" min={1} max={500} className="input" required defaultValue={defaults.capacity ?? 20} aria-invalid={fe.capacity ? true : undefined} />
            {err('capacity')}
          </div>
          <div>
            <label htmlFor="minAge" className="field-label">
              {t('minAge')}
            </label>
            <select id="minAge" name="minAge" className="input" defaultValue={String(defaults.minAge ?? 16)}>
              {EVENT_MIN_AGES.map((age) => (
                <option key={age} value={age}>
                  {t('minAgeOption', { age })}
                </option>
              ))}
            </select>
            <span className="field-hint">{t('minAgeHint')}</span>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="publicVenue" required className="mt-1 h-6 w-6 accent-[var(--color-accent)]" />
          <span>{t('publicVenue')}</span>
        </label>
        {err('publicVenue')}
      </div>

      <div className="flex flex-col gap-2">
        <SubmitButton pendingLabel={t('saving')}>{defaults.eventId ? t('saveChanges') : t('submit')}</SubmitButton>
        <p className="text-sm text-muted">{t('reviewNote')}</p>
      </div>
    </form>
  );
}
