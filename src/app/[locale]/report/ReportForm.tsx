'use client';

import { useActionState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { Turnstile } from '@/components/Turnstile';
import { REPORT_CATEGORIES } from '@/lib/constants';
import { type ReportFormState, reportAction } from './actions';

export function ReportForm({ targetType, targetId, turnstileSiteKey }: { targetType: 'event' | 'group_post'; targetId: string; turnstileSiteKey?: string }) {
  const t = useTranslations('forms.report');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const [state, action] = useActionState<ReportFormState, FormData>(reportAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      {state.error ? <Notice variant="error">{tErrors(state.error)}</Notice> : null}
      <fieldset aria-describedby={fe.category ? 'category-error' : undefined}>
        <legend className="field-label">{t('categoryLegend')}</legend>
        <div className="mt-2 flex flex-col gap-3">
          {REPORT_CATEGORIES.map((category) => (
            <label key={category} className="flex cursor-pointer items-start gap-3 rounded-xl border border-input p-3 has-[:checked]:border-accent">
              <input type="radio" name="category" value={category} required className="mt-1 h-5 w-5 accent-[var(--color-accent)]" />
              <span>
                <span className="block font-bold">{t(`categories.${category}.label`)}</span>
                <span className="block text-sm text-muted">{t(`categories.${category}.hint`)}</span>
              </span>
            </label>
          ))}
        </div>
        {fe.category ? (
          <span id="category-error" className="field-error">
            {t('categoryError')}
          </span>
        ) : null}
      </fieldset>
      <div>
        <label htmlFor="details" className="field-label">
          {t('details')}
        </label>
        <textarea id="details" name="details" rows={4} maxLength={1000} className="input" aria-describedby="details-hint" />
        <span id="details-hint" className="field-hint">
          {t('detailsHint')}
        </span>
      </div>
      <Turnstile siteKey={turnstileSiteKey} language={locale} />
      <SubmitButton pendingLabel={t('sending')}>{t('submit')}</SubmitButton>
    </form>
  );
}
