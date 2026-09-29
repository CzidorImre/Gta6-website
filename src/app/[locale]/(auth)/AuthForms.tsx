'use client';

import { useActionState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { Turnstile } from '@/components/Turnstile';
import { type AuthFormState, loginAction, signupAction } from './actions';

function FieldError({ id, error }: { id: string; error?: string }) {
  const t = useTranslations('form.errors');
  if (!error) return null;
  return (
    <span id={id} className="field-error">
      {t(error as 'email')}
    </span>
  );
}

export function SignupForm({ next, turnstileSiteKey, maxDate }: { next: string; turnstileSiteKey?: string; maxDate: string }) {
  const t = useTranslations('forms.signup');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const [state, action] = useActionState<AuthFormState, FormData>(signupAction, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error === 'UNDER_13' ? (
        <Notice variant="error">
          <p className="font-bold">{t('under13Title')}</p>
          <p className="mt-1">{t('under13Body')}</p>
        </Notice>
      ) : state.error ? (
        <Notice variant="error">{tErrors(state.error)}</Notice>
      ) : null}
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
          autoComplete="nickname"
          defaultValue={state.values?.displayName ?? ''}
          aria-invalid={fe.displayName ? true : undefined}
          aria-describedby={`displayName-hint${fe.displayName ? ' displayName-error' : ''}`}
        />
        <span id="displayName-hint" className="field-hint">
          {t('displayNameHint')}
        </span>
        <FieldError id="displayName-error" error={fe.displayName} />
      </div>
      <div>
        <label htmlFor="dateOfBirth" className="field-label">
          {t('dateOfBirth')}
        </label>
        <input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          className="input"
          required
          min="1900-01-01"
          max={maxDate}
          autoComplete="bday"
          aria-invalid={fe.dateOfBirth ? true : undefined}
          aria-describedby={`dateOfBirth-hint${fe.dateOfBirth ? ' dateOfBirth-error' : ''}`}
        />
        <span id="dateOfBirth-hint" className="field-hint">
          {t('dateOfBirthHint')}
        </span>
        <FieldError id="dateOfBirth-error" error={fe.dateOfBirth} />
      </div>
      <div>
        <label htmlFor="email" className="field-label">
          {t('email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          required
          autoComplete="email"
          inputMode="email"
          defaultValue={state.values?.email ?? ''}
          aria-invalid={fe.email ? true : undefined}
          aria-describedby={fe.email ? 'email-error' : undefined}
        />
        <FieldError id="email-error" error={fe.email} />
      </div>
      <Turnstile siteKey={turnstileSiteKey} language={locale} resetKey={state} />
      <p className="text-sm text-muted">
        {t.rich('legal', {
          terms: (chunks) => (
            <Link href="/terms" className="link">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" className="link">
              {chunks}
            </Link>
          ),
        })}
      </p>
      <SubmitButton pendingLabel={t('sending')}>{t('submit')}</SubmitButton>
    </form>
  );
}

export function LoginForm({ next, turnstileSiteKey }: { next: string; turnstileSiteKey?: string }) {
  const t = useTranslations('forms.login');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const [state, action] = useActionState<AuthFormState, FormData>(loginAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error && state.error !== 'UNDER_13' ? <Notice variant="error">{tErrors(state.error)}</Notice> : null}
      <div>
        <label htmlFor="email" className="field-label">
          {t('email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          required
          autoComplete="email"
          inputMode="email"
          defaultValue={state.values?.email ?? ''}
          aria-invalid={fe.email ? true : undefined}
          aria-describedby={fe.email ? 'email-error' : undefined}
        />
        <FieldError id="email-error" error={fe.email} />
      </div>
      <Turnstile siteKey={turnstileSiteKey} language={locale} resetKey={state} />
      <SubmitButton pendingLabel={t('sending')}>{t('submit')}</SubmitButton>
    </form>
  );
}
