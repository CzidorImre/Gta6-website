/**
 * Returns `next` only when it is a same-site path ("/nl/events/..."), otherwise the fallback.
 * Blocks protocol-relative ("//evil.com") and backslash tricks.
 */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  let path = next;
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      path = url.pathname + url.search;
    } catch {
      return fallback;
    }
  }
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || /[\u0000-\u001f]/.test(path)) {
    return fallback;
  }
  return path;
}

/**
 * Like safeNextPath, but for absolute URLs that must point at our own origin (the `next` value in
 * auth emails is a full URL).
 */
export function sameOriginPath(next: string | null | undefined, origin: string, fallback: string): string {
  if (!next) return fallback;
  try {
    const url = new URL(next, origin);
    if (url.origin !== new URL(origin).origin) return fallback;
    return safeNextPath(url.pathname + url.search, fallback);
  } catch {
    return fallback;
  }
}
