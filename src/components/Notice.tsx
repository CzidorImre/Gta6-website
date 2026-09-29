import type { ReactNode } from 'react';

type Variant = 'info' | 'success' | 'warning' | 'error';

const styles: Record<Variant, string> = {
  info: 'bg-fill',
  success: 'bg-accent/15',
  warning: 'bg-warn/15',
  error: 'bg-danger/15',
};

/** Status message. `role="status"` for polite announcements, `alert` for errors. */
export function Notice({ variant = 'info', children, id }: { variant?: Variant; children: ReactNode; id?: string }) {
  return (
    <div
      id={id}
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl px-4 py-3 ${styles[variant]}`}
    >
      {children}
    </div>
  );
}
