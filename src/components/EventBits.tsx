import { getTranslations } from 'next-intl/server';
import { spotsLeft, spotsLevel, type SpotsLevel } from '@/lib/spots';
import { Star } from './Star';

const levelStyles: Record<SpotsLevel, string> = {
  plenty: 'bg-accent/16 text-accent',
  few: 'bg-warn/16 text-warn',
  full: 'bg-fill text-text',
};

export async function SpotsPill({ capacity, rsvpCount }: { capacity: number; rsvpCount: number }) {
  const t = await getTranslations('event');
  const level = spotsLevel(capacity, rsvpCount);
  const left = spotsLeft(capacity, rsvpCount);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${levelStyles[level]}`}>
      <Star className="h-4 w-4" />
      {t('spotsLeft', { count: left })}
    </span>
  );
}

export async function PlatformTags({ platforms }: { platforms: readonly string[] }) {
  const t = await getTranslations('platforms');
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={t('label')}>
      {platforms.map((p) => (
        <li key={p} className="tag">
          {t(p as 'ps5' | 'xbox')}
        </li>
      ))}
    </ul>
  );
}

export async function VerifiedBadge() {
  const t = await getTranslations('event');
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-text">
      <Star className="h-4 w-4 text-accent" />
      {t('verifiedVenue')}
    </span>
  );
}

export async function AgeTag({ minAge }: { minAge: number }) {
  const t = await getTranslations('event');
  return <span className="tag" title={t('minAgeLong', { age: minAge })}>{t('minAgeShort', { age: minAge })}</span>;
}
