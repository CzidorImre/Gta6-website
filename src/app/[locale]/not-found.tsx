import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <div className="container-page py-16">
      <h1 className="text-3xl font-extrabold">{t('title')}</h1>
      <p className="mt-3 max-w-prose text-muted">{t('body')}</p>
      <Link href="/" className="btn btn-primary mt-6">
        {t('back')}
      </Link>
    </div>
  );
}
