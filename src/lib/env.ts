import 'server-only';

/**
 * Server environment. Read at request time (not inlined at build), so one build works for preview
 * and production. See .env.example for what each variable does.
 */
function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : undefined;
}

function required(name: string): string {
  const value = read(name);
  if (!value) throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  return value;
}

/** True on the Vercel production deployment. Previews and local runs are not production. */
export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === 'production';
}

export function siteUrl(): string {
  const explicit = read('SITE_URL');
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = read('VERCEL_URL');
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export function supabaseEnv() {
  return {
    url: required('SUPABASE_URL'),
    publishableKey: required('SUPABASE_PUBLISHABLE_KEY'),
  };
}

export function supabaseSecretKey(): string {
  return required('SUPABASE_SECRET_KEY');
}

export function mapTilerKey(): string | undefined {
  return read('MAPTILER_API_KEY');
}

export function turnstileSiteKey(): string | undefined {
  return read('TURNSTILE_SITE_KEY');
}

export function turnstileSecretKey(): string | undefined {
  return read('TURNSTILE_SECRET_KEY');
}

export function emailSettings() {
  return {
    resendApiKey: read('RESEND_API_KEY'),
    mailpitUrl: read('MAILPIT_URL'),
    from: read('EMAIL_FROM') ?? 'Wanted Level <noreply@wantedlevel.be>',
    replyTo: read('EMAIL_REPLY_TO') ?? 'hello@wantedlevel.be',
    adminRecipients: (read('ADMIN_NOTIFICATION_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean),
  };
}

export function rateLimitSecret(): string {
  const secret = read('RATE_LIMIT_SECRET');
  if (secret) return secret;
  if (isProductionDeployment()) throw new Error('RATE_LIMIT_SECRET must be set in production.');
  return 'local-development-only-rate-limit-secret';
}
