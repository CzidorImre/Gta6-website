import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/next';
import { pageLocale } from '@/i18n/page-locale';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import '../globals.css';

// Bricolage Grotesque (SIL Open Font License, src/fonts/OFL.txt), self-hosted: no request to
// Google at build or run time. Variable font, Latin subset; we use weights 700-800 for headings.
const display = localFont({
  src: '../../fonts/BricolageGrotesque-latin.woff2',
  variable: '--font-bricolage',
  display: 'swap',
  weight: '200 800',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

// Namespaces used by client components. The rest stays on the server.
const CLIENT_NAMESPACES = ['nav', 'forms', 'form', 'errors', 'venuePicker', 'account', 'mfa'] as const;

export const viewport: Viewport = {
  themeColor: '#0b0b12',
  colorScheme: 'dark',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: { default: t('title'), template: `%s · Wanted Level` },
    description: t('description'),
    metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
    alternates: { languages: { en: '/en', 'nl-BE': '/nl' } },
    openGraph: { title: t('title'), description: t('description'), siteName: 'Wanted Level', type: 'website' },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = await pageLocale(params);
  const t = await getTranslations('nav');
  const messages = await getMessages();
  const clientMessages = Object.fromEntries(CLIENT_NAMESPACES.map((ns) => [ns, (messages as Record<string, unknown>)[ns]]));

  return (
    <html lang={locale} className={display.variable}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only-focusable btn btn-primary fixed left-3 top-3 z-[1000]">
          {t('skipToContent')}
        </a>
        <NextIntlClientProvider messages={clientMessages}>
          <Header />
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
        {/* Cookieless Vercel Web Analytics. Its script only exists on Vercel deployments. */}
        {process.env.VERCEL === '1' ? <Analytics /> : null}
      </body>
    </html>
  );
}
