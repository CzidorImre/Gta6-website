'use client';

import { useActionState, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { type MfaState, startEnrollmentAction, verifyMfaAction } from '../actions';

function CodeForm({ initial }: { initial: MfaState }) {
  const t = useTranslations('mfa');
  const [state, action] = useActionState<MfaState, FormData>(verifyMfaAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="factorId" value={state.factorId ?? ''} />
      {state.error ? <Notice variant="error">{t('invalid')}</Notice> : null}
      <div>
        <label htmlFor="code" className="field-label">
          {t('code')}
        </label>
        <input
          id="code"
          name="code"
          className="input max-w-48 text-2xl tracking-[0.3em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
        />
      </div>
      <SubmitButton pendingLabel={t('verifying')}>{t('verify')}</SubmitButton>
    </form>
  );
}

export function MfaVerify({ factorId }: { factorId: string }) {
  return <CodeForm initial={{ factorId }} />;
}

export function MfaEnroll() {
  const t = useTranslations('mfa');
  const [enrollment, setEnrollment] = useState<MfaState | null>(null);
  const [pending, start] = useTransition();
  if (!enrollment?.factorId) {
    return (
      <div className="flex flex-col gap-4">
        {enrollment?.error ? <Notice variant="error">{t('enrollFailed')}</Notice> : null}
        <button type="button" className="btn btn-primary" disabled={pending} onClick={() => start(async () => setEnrollment(await startEnrollmentAction()))}>
          {pending ? t('working') : t('startEnroll')}
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <ol className="list-decimal space-y-2 pl-5">
        <li>{t('step1')}</li>
        <li>{t('step2')}</li>
      </ol>
      {enrollment.qrCode ? (
        // eslint-disable-next-line @next/next/no-img-element -- data: URI SVG from Supabase Auth
        <img src={enrollment.qrCode} alt={t('qrAlt')} width={200} height={200} className="rounded-xl bg-white p-2" />
      ) : null}
      <p className="text-sm">
        {t('manual')} <code className="break-all rounded bg-raised px-2 py-1 font-mono">{enrollment.secret}</code>
      </p>
      <CodeForm initial={{ factorId: enrollment.factorId }} />
    </div>
  );
}
