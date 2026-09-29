import { describe, expect, it } from 'vitest';
import { safeNextPath, sameOriginPath } from '@/lib/redirect';

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/events/abc', '/')).toBe('/events/abc');
    expect(safeNextPath('/report?type=event&id=1', '/')).toBe('/report?type=event&id=1');
  });

  it('blocks open redirects', () => {
    for (const bad of ['//evil.com', '/\\evil.com', 'evil.com', 'javascript:alert(1)', '/a\nb', '\u0000/x']) {
      expect(safeNextPath(bad, '/fallback')).toBe('/fallback');
    }
  });

  it('reduces absolute URLs to their path', () => {
    expect(safeNextPath('https://evil.com/steal', '/')).toBe('/steal');
    expect(safeNextPath(undefined, '/x')).toBe('/x');
  });
});

describe('sameOriginPath', () => {
  it('accepts links to our own origin', () => {
    expect(sameOriginPath('http://localhost:3000/nl/account', 'http://localhost:3000', '/en')).toBe('/nl/account');
  });

  it('rejects other origins', () => {
    expect(sameOriginPath('https://evil.com/nl/account', 'http://localhost:3000', '/en')).toBe('/en');
    expect(sameOriginPath('//evil.com', 'http://localhost:3000', '/en')).toBe('/en');
  });
});
