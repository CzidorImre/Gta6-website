import type { ReactNode } from 'react';

// The real root layout is app/[locale]/layout.tsx; this one only exists so that routes outside
// [locale] (route handlers, the global 404) have a parent.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
