import { createFormatter } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { TIME_ZONE } from '@/lib/constants';
import type { Locale } from './routing';

/**
 * Date/number formatter for the current page. English uses British conventions (9 Oct, 22:00),
 * which is what people in Belgium expect; Dutch is nl-BE. Times are always Europe/Brussels.
 */
export async function getAppFormatter() {
  const locale = await getLocale();
  // The app's locale type only knows the routing locales; Intl itself accepts any BCP 47 tag.
  const intlLocale = (locale === 'en' ? 'en-GB' : locale) as Locale;
  return createFormatter({ locale: intlLocale, timeZone: TIME_ZONE });
}
