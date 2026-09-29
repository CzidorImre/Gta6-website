'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { type ProfileFormState, updateProfileAction } from './actions';

export function ProfileForm({ displayName, socialUrl }: { displayName: string; socialUrl: string }) {
  const t = useTranslations('account');
  const tf = useTranslations('form.errors');
  const [state, action] = useActionState<ProfileFormState, FormData>(updateProfileAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.ok ? <Notice variant="success">{t('profileSaved')}</Notice> : null}
      {state.error ? <Notice variant="error">{t('profileError')}</Notice> : null}
      <div>
        <label htmlFor="displayName" className="field-label">
          {t('displayName')}
        </label>
        <input
          id="displayName"
          name="displayName"
          className="input"
          required
          minLength={2}
          maxLength={40}
          defaultValue={displayName}
          aria-invalid={fe.displayName ? true : undefined}
          aria-describedby={fe.displayName ? 'displayName-error' : 'displayName-hint'}
        />
        <span id="displayName-hint" className="field-hint">
          {t('displayNameHint')}
        </span>
        {fe.displayName ? (
          <span id="displayName-error" className="field-error">
            {tf('displayName')}
          </span>
        ) : null}
      </div>
      <div>
        <label htmlFor="socialUrl" className="field-label">
          {t('socialUrl')}
        </label>
        <input
          id="socialUrl"
          name="socialUrl"
          type="url"
          className="input"
          placeholder="https://"
          maxLength={200}
          defaultValue={socialUrl}
          aria-invalid={fe.socialUrl ? true : undefined}
          aria-describedby={fe.socialUrl ? 'socialUrl-error' : 'socialUrl-hint'}
        />
        <span id="socialUrl-hint" className="field-hint">
          {t('socialUrlHint')}
        </span>
        {fe.socialUrl ? (
          <span id="socialUrl-error" className="field-error">
            {tf('socialUrl')}
          </span>
        ) : null}
      </div>
      <SubmitButton pendingLabel={t('saving')}>{t('saveProfile')}</SubmitButton>
    </form>
  );
}
