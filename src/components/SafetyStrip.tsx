import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Star } from './Star';

/** The three safety promises, visible on the homepage and every event page. */
export async function SafetyStrip({ compact = false }: { compact?: boolean }) {
  const t = await getTranslations('safety');
  const items = [t('publicVenues'), t('reviewed'), t('reportInstantly')];
  return (
    <aside aria-label={t('label')} className={`card ${compact ? 'p-4' : 'p-5'}`}>
      <ul className={`grid gap-3 ${compact ? '' : 'md:grid-cols-3'}`}>
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <Star className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/rules" className="link font-semibold">
          {t('rulesLink')}
        </Link>
      </p>
    </aside>
  );
}
