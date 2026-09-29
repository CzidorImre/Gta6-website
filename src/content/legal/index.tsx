import type { Locale } from '@/i18n/routing';
import PrivacyEn from './privacy.en';
import PrivacyNl from './privacy.nl';
import RulesEn from './rules.en';
import RulesNl from './rules.nl';
import TermsEn from './terms.en';
import TermsNl from './terms.nl';

export function PrivacyContent({ locale }: { locale: Locale }) {
  return locale === 'nl-BE' ? <PrivacyNl /> : <PrivacyEn />;
}

export function TermsContent({ locale }: { locale: Locale }) {
  return locale === 'nl-BE' ? <TermsNl /> : <TermsEn />;
}

export function RulesContent({ locale }: { locale: Locale }) {
  return locale === 'nl-BE' ? <RulesNl /> : <RulesEn />;
}
