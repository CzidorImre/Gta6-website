import { describe, expect, it } from 'vitest';
import { buildCsp, staticSecurityHeaders } from '@/lib/csp';

function directive(csp: string, name: string): string {
  return csp.split('; ').find((d) => d.startsWith(`${name} `) || d === name) ?? '';
}

describe('Content Security Policy', () => {
  const csp = buildCsp({ nonce: 'abc123', isDev: false });

  it('only allows nonced scripts (strict CSP)', () => {
    const scripts = directive(csp, 'script-src');
    expect(scripts).toContain("'nonce-abc123'");
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it('locks down framing, plugins, base and form targets', () => {
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(csp, 'object-src')).toBe("object-src 'none'");
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(csp, 'form-action')).toBe("form-action 'self'");
    expect(directive(csp, 'connect-src')).toBe("connect-src 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('only allows the third parties we use', () => {
    expect(directive(csp, 'img-src')).toContain('https://api.maptiler.com');
    expect(directive(csp, 'frame-src')).toBe('frame-src https://challenges.cloudflare.com');
    expect(csp).not.toContain('openstreetmap.org');
  });

  it('relaxes only what React needs in development', () => {
    const dev = buildCsp({ nonce: 'x', isDev: true });
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
    expect(dev).not.toContain('upgrade-insecure-requests');
  });

  it('sends the other security headers', () => {
    const keys = staticSecurityHeaders.map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining(['Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Permissions-Policy', 'Cross-Origin-Opener-Policy']),
    );
  });
});
