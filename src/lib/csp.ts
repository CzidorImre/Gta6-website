/**
 * Content Security Policy for every page. Scripts need the per-request nonce ('strict-dynamic'
 * lets scripts loaded by a trusted script run, e.g. Turnstile and Vercel Analytics). The browser
 * never talks to Supabase directly, so connect-src stays 'self'.
 */
export function buildCsp({ nonce, isDev }: { nonce: string; isDev: boolean }): string {
  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    [
      'script-src',
      ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", 'https://challenges.cloudflare.com', ...(isDev ? ["'unsafe-eval'"] : [])],
    ],
    // Production: <style> elements must carry the nonce (Next adds it to its own). In development
    // the dev server injects un-nonced <style> tags, and a nonce would make browsers ignore
    // 'unsafe-inline', so dev uses 'unsafe-inline' alone. style="" attributes are always allowed:
    // React and Leaflet set inline positions, and attribute styles can't run code.
    ['style-src', isDev ? ["'self'", "'unsafe-inline'"] : ["'self'", `'nonce-${nonce}'`]],
    ['style-src-attr', ["'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:', 'https://api.maptiler.com']],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", ...(isDev ? ['ws:'] : [])]],
    ['frame-src', ['https://challenges.cloudflare.com']],
    ['worker-src', ["'self'", 'blob:']],
    ['manifest-src', ["'self'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ];
  if (!isDev) directives.push(['upgrade-insecure-requests', []]);
  return directives.map(([name, values]) => [name, ...values].join(' ')).join('; ');
}

/** Headers for every response (also static files and route handlers); CSP comes from proxy.ts. */
export const staticSecurityHeaders: Array<{ key: string; value: string }> = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), interest-cohort=()',
  },
];
