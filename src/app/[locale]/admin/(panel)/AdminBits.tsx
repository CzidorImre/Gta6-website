import { getTranslations } from 'next-intl/server';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { type ErrorCode, KNOWN_ERROR_CODES } from '@/lib/errors';

/** Result banner after an admin action (?done=... or ?error=...). */
export async function AdminResult({ done, error }: { done?: string; error?: string }) {
  const [t, tErrors] = await Promise.all([getTranslations('admin'), getTranslations('errors')]);
  if (error) {
    const code = (KNOWN_ERROR_CODES as readonly string[]).includes(error) ? (error as ErrorCode) : 'GENERIC';
    return <Notice variant="error">{tErrors(code)}</Notice>;
  }
  if (done) return <Notice variant="success">{t('done')}</Notice>;
  return null;
}

/**
 * Reason field + one submit button per action. Every admin action needs a reason: it's logged and
 * sent to the affected person.
 */
export async function ReasonActions({
  action,
  hidden,
  buttons,
  reasonId,
  defaultReason,
}: {
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
  buttons: Array<{ name: string; value: string; label: string; variant?: 'primary' | 'secondary' | 'danger' }>;
  reasonId: string;
  defaultReason?: string;
}) {
  const t = await getTranslations('admin');
  return (
    <form action={action} className="flex flex-col gap-3">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <div>
        <label htmlFor={reasonId} className="field-label">
          {t('reason')}
        </label>
        <textarea id={reasonId} name="reason" required minLength={3} maxLength={1000} rows={2} className="input" defaultValue={defaultReason} aria-describedby={`${reasonId}-hint`} />
        <span id={`${reasonId}-hint`} className="field-hint">
          {t('reasonHint')}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <SubmitButton key={`${b.name}-${b.value}`} name={b.name} value={b.value} variant={b.variant ?? 'secondary'} pendingLabel={t('working')}>
            {b.label}
          </SubmitButton>
        ))}
      </div>
    </form>
  );
}
