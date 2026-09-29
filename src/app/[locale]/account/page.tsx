import type { Metadata } from 'next';
import { getNow, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAppFormatter } from '@/i18n/format';
import { pageLocale } from '@/i18n/page-locale';
import { Notice } from '@/components/Notice';
import { SubmitButton } from '@/components/SubmitButton';
import { requireViewer } from '@/lib/auth';
import { RULES_VERSION } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from '../(auth)/actions';
import { deleteAccountAction, updateLocaleAction } from './actions';
import { ProfileForm } from './ProfileForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account');
  return { title: t('title'), robots: { index: false } };
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; delete?: string }>;
}) {
  const locale = await pageLocale(params);
  const query = await searchParams;
  const viewer = await requireViewer('/account');
  const [t, format, now] = await Promise.all([getTranslations('account'), getAppFormatter(), getNow()]);
  const supabase = await createClient();
  const { data: rsvps } = await supabase
    .from('rsvps')
    .select('event:events ( id, title, starts_at, status )')
    .eq('user_id', viewer.userId);
  const upcoming = (rsvps ?? [])
    .map((r) => r.event)
    .filter((e): e is NonNullable<typeof e> => e !== null && new Date(e.starts_at).getTime() > now.getTime() - 12 * 3600 * 1000)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const rulesAccepted = viewer.profile.rules_accepted_at && viewer.profile.rules_version === RULES_VERSION;

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-4xl font-extrabold">{t('title')}</h1>
      <p className="mt-2 text-muted">{t('signedInAs', { email: viewer.email ?? '' })}</p>

      <div className="mt-6 flex flex-col gap-3">
        {query.saved === 'locale' ? <Notice variant="success">{t('localeSaved')}</Notice> : null}
        {viewer.profile.banned_at ? <Notice variant="warning">{t('bannedNotice')}</Notice> : null}
      </div>

      <section aria-labelledby="going-heading" className="card mt-6 p-5">
        <h2 id="going-heading" className="text-2xl font-extrabold">
          {t('goingHeading')}
        </h2>
        {upcoming.length === 0 ? (
          <p className="mt-3 text-muted">
            {t('goingEmpty')}{' '}
            <Link href="/" className="link">
              {t('findEvent')}
            </Link>
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {upcoming.map((e) => (
              <li key={e.id}>
                <Link href={`/events/${e.id}`} className="link font-semibold">
                  {e.title}
                </Link>{' '}
                <span className="text-muted">
                  · {format.dateTime(new Date(e.starts_at), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="profile-heading" className="card mt-6 p-5">
        <h2 id="profile-heading" className="text-2xl font-extrabold">
          {t('profileHeading')}
        </h2>
        <p className="mt-2 text-sm text-muted">{t('profilePrivacy')}</p>
        <div className="mt-4">
          <ProfileForm displayName={viewer.profile.display_name} socialUrl={viewer.profile.social_url ?? ''} />
        </div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-muted">{t('dateOfBirth')}</dt>
            <dd>{format.dateTime(new Date(`${viewer.profile.date_of_birth}T12:00:00Z`), { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
          </div>
          <div>
            <dt className="font-semibold text-muted">{t('rules')}</dt>
            <dd>
              {rulesAccepted && viewer.profile.rules_accepted_at ? (
                t('rulesAcceptedOn', { date: format.dateTime(new Date(viewer.profile.rules_accepted_at), { day: 'numeric', month: 'long', year: 'numeric' }) })
              ) : (
                <Link href="/rules" className="link">
                  {t('rulesNotAccepted')}
                </Link>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="language-heading" className="card mt-6 p-5">
        <h2 id="language-heading" className="text-2xl font-extrabold">
          {t('languageHeading')}
        </h2>
        <form action={updateLocaleAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="locale" className="field-label">
              {t('languageLabel')}
            </label>
            <select id="locale" name="locale" className="input" defaultValue={locale}>
              <option value="en">English</option>
              <option value="nl-BE">Nederlands</option>
            </select>
          </div>
          <SubmitButton variant="secondary" pendingLabel={t('saving')}>
            {t('saveLanguage')}
          </SubmitButton>
        </form>
      </section>

      <section aria-labelledby="organize-heading" className="card mt-6 p-5">
        <h2 id="organize-heading" className="text-2xl font-extrabold">
          {t('organizeHeading')}
        </h2>
        <p className="mt-2">
          <Link href="/organizer" className="link">
            {viewer.isOrganizer ? t('organizerDashboard') : t('organizerApply')}
          </Link>
        </p>
      </section>

      <form action={signOutAction} className="mt-6">
        <SubmitButton variant="secondary" pendingLabel={t('saving')}>
          {t('signOut')}
        </SubmitButton>
      </form>

      <section aria-labelledby="delete-heading" className="mt-10 rounded-[var(--radius-card)] border-2 border-danger p-5">
        <h2 id="delete-heading" className="text-2xl font-extrabold text-danger">
          {t('deleteHeading')}
        </h2>
        <p className="mt-2">{t('deleteBody')}</p>
        {query.delete === 'confirm' ? (
          <div className="mt-3">
            <Notice variant="error">{t('deleteConfirmMissing')}</Notice>
          </div>
        ) : null}
        {query.delete === 'error' ? (
          <div className="mt-3">
            <Notice variant="error">{t('deleteError')}</Notice>
          </div>
        ) : null}
        <form action={deleteAccountAction} className="mt-4 flex flex-col gap-4">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="confirm" required className="mt-1 h-6 w-6 accent-[var(--color-danger)]" />
            <span>{t('deleteConfirm')}</span>
          </label>
          <SubmitButton variant="danger" pendingLabel={t('deleting')}>
            {t('deleteButton')}
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
