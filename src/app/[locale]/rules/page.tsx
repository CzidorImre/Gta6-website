import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAppFormatter } from '@/i18n/format';
import { pageLocale } from '@/i18n/page-locale';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { RulesContent } from '@/content/legal';
import { getViewer } from '@/lib/auth';
import { RULES_VERSION } from '@/lib/constants';
import { acceptRulesAction } from './actions';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('rulesPage');
  return { title: t('title') };
}

export default async function RulesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ rsvp?: string; error?: string; accepted?: string }>;
}) {
  const locale = await pageLocale(params);
  const query = await searchParams;
  const [t, format, viewer] = await Promise.all([getTranslations('rulesPage'), getAppFormatter(), getViewer()]);
  const accepted = Boolean(viewer?.profile.rules_accepted_at && viewer.profile.rules_version === RULES_VERSION);
  const rsvpEvent = query.rsvp && /^[0-9a-f-]{36}$/i.test(query.rsvp) ? query.rsvp : null;

  return (
    <div className="container-page max-w-3xl py-10">
      {rsvpEvent && !accepted ? (
        <div className="mb-6">
          <Notice variant="info">{t('beforeRsvp')}</Notice>
        </div>
      ) : null}
      <RulesContent locale={locale} />

      <section aria-labelledby="accept-heading" className="card mt-10 p-5">
        <h2 id="accept-heading" className="text-2xl font-extrabold">
          {t('acceptHeading')}
        </h2>
        {query.accepted ? (
          <div className="mt-3">
            <Notice variant="success">{t('thanks')}</Notice>
          </div>
        ) : null}
        {query.error ? (
          <div className="mt-3">
            <Notice variant="error">{query.error === 'unchecked' ? t('unchecked') : t('failed')}</Notice>
          </div>
        ) : null}
        {!viewer ? (
          <p className="mt-3">
            {t('loginToAccept')}{' '}
            <Link href={{ pathname: '/login', query: { next: rsvpEvent ? `/rules?rsvp=${rsvpEvent}` : '/rules' } }} className="link">
              {t('login')}
            </Link>
          </p>
        ) : accepted && viewer.profile.rules_accepted_at ? (
          <p className="mt-3">
            {t('acceptedOn', { date: format.dateTime(new Date(viewer.profile.rules_accepted_at), { day: 'numeric', month: 'long', year: 'numeric' }) })}
            {rsvpEvent ? (
              <>
                {' '}
                <Link href={`/events/${rsvpEvent}#rsvp`} className="link">
                  {t('backToEvent')}
                </Link>
              </>
            ) : null}
          </p>
        ) : (
          <form action={acceptRulesAction} className="mt-4 flex flex-col gap-4">
            {rsvpEvent ? <input type="hidden" name="rsvp" value={rsvpEvent} /> : null}
            <label className="flex items-start gap-3">
              <input type="checkbox" name="accept" required className="mt-1 h-6 w-6 accent-[var(--color-accent)]" />
              <span>{t('checkbox')}</span>
            </label>
            <SubmitButton pendingLabel={t('working')}>{rsvpEvent ? t('acceptAndRsvp') : t('accept')}</SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
