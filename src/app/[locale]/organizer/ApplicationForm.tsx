'use client';

import { useActionState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { Turnstile } from '@/components/Turnstile';
import { VENUE_KINDS } from '@/lib/constants';
import { type OrganizerFormState, applyAction } from './actions';

export function ApplicationForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const t = useTranslations('forms.apply');
  const tf = useTranslations('form.errors');
  const tKinds = useTranslations('forms.venueKinds');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const [state, action] = useActionState<OrganizerFormState, FormData>(applyAction, {});
  const fe = state.fieldErrors ?? {};

  const field = (name: 'orgName' | 'socialUrl' | 'venueName' | 'venueAddress', opts: { type?: string; autoComplete?: string; max: number }) => (
    <div>
      <label htmlFor={name} className="field-label">
        {t(`${name}.label`)}
      </label>
      <input
        id={name}
        name={name}
        type={opts.type ?? 'text'}
        className="input"
        required
        maxLength={opts.max}
        autoComplete={opts.autoComplete ?? 'off'}
        aria-invalid={fe[name] ? true : undefined}
        aria-describedby={`${name}-hint${fe[name] ? ` ${name}-error` : ''}`}
      />
      <span id={`${name}-hint`} className="field-hint">
        {t(`${name}.hint`)}
      </span>
      {fe[name] ? (
        <span id={`${name}-error`} className="field-error">
          {tf(name)}
        </span>
      ) : null}
    </div>
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error ? <Notice variant="error">{tErrors(state.error)}</Notice> : null}
      {field('orgName', { max: 80, autoComplete: 'organization' })}
      {field('socialUrl', { type: 'url', max: 200 })}
      {field('venueName', { max: 80 })}
      {field('venueAddress', { max: 200, autoComplete: 'street-address' })}
      <div>
        <label htmlFor="venueKind" className="field-label">
          {t('venueKind')}
        </label>
        <select id="venueKind" name="venueKind" className="input" required defaultValue="">
          <option value="" disabled>
            {t('choose')}
          </option>
          {VENUE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {tKinds(kind)}
            </option>
          ))}
        </select>
        {fe.venueKind ? <span className="field-error">{tf('venueKind')}</span> : null}
      </div>
      <div>
        <label htmlFor="message" className="field-label">
          {t('message')}
        </label>
        <textarea id="message" name="message" rows={4} maxLength={1000} className="input" aria-describedby="message-hint" />
        <span id="message-hint" className="field-hint">
          {t('messageHint')}
        </span>
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="publicVenue" required className="mt-1 h-6 w-6 accent-[var(--color-accent)]" aria-describedby={fe.publicVenue ? 'publicVenue-error' : undefined} />
        <span>{t('publicVenue')}</span>
      </label>
      {fe.publicVenue ? (
        <span id="publicVenue-error" className="field-error">
          {tf('publicVenue')}
        </span>
      ) : null}
      <Turnstile siteKey={turnstileSiteKey} language={locale} resetKey={state} />
      <SubmitButton pendingLabel={t('sending')}>{t('submit')}</SubmitButton>
    </form>
  );
}
