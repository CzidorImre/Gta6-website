import type messages from '../../messages/en.json';
import type { routing } from '@/i18n/routing';

// Type-checks every translation key against messages/en.json. tests/unit/messages.test.ts checks
// that nl-BE.json has exactly the same keys.
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
