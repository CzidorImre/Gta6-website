import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { pageLocale } from '@/i18n/page-locale';
import { getViewer } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { MfaEnroll, MfaVerify } from './MfaForms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('mfa');
  return { title: t('title'), robots: { index: false } };
}

export default async function MfaPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await pageLocale(params);
  const viewer = await getViewer();
  if (!viewer || viewer.profile.role !== 'admin') notFound();
  if (viewer.aal === 'aal2') redirect({ href: '/admin', locale });
  const t = await getTranslations('mfa');
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp.find((f) => f.status === 'verified');
  return (
    <div className="container-page max-w-xl py-10">
      <h1 className="text-4xl font-extrabold">{t('title')}</h1>
      <p className="mt-3 text-muted">{factor ? t('verifyLead') : t('enrollLead')}</p>
      <div className="card mt-6 p-5">{factor ? <MfaVerify factorId={factor.id} /> : <MfaEnroll />}</div>
    </div>
  );
}
