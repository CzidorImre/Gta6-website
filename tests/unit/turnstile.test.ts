import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from '@/lib/turnstile';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('verifyTurnstile', () => {
  it('skips the check locally when no secret is configured', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    vi.stubEnv('VERCEL_ENV', '');
    expect(await verifyTurnstile(null)).toEqual({ ok: true, skipped: true });
  });

  it('fails closed on a production deployment without a secret', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    vi.stubEnv('VERCEL_ENV', 'production');
    expect(await verifyTurnstile('token')).toEqual({ ok: false, reason: 'misconfigured' });
  });

  it('requires a token when configured', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    expect(await verifyTurnstile('')).toEqual({ ok: false, reason: 'missing' });
  });

  it('asks Cloudflare and trusts only success: true', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await verifyTurnstile('token', '1.2.3.4')).toEqual({ ok: true, skipped: false });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body = init.body as URLSearchParams;
    expect(body.get('secret')).toBe('secret');
    expect(body.get('response')).toBe('token');
    expect(body.get('remoteip')).toBe('1.2.3.4');

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false })));
    expect(await verifyTurnstile('token')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('fails closed when Cloudflare is unreachable', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'secret');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    expect(await verifyTurnstile('token')).toEqual({ ok: false, reason: 'unavailable' });
  });
});
