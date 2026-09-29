import type { ReactNode } from 'react';

type Variant = 'info' | 'success' | 'warning' | 'error';

const styles: Record<Variant, string> = {
  info: 'border-line bg-surface-2',
  success: 'border-accent bg-surface-2',
  warning: 'border-warn bg-surface-2',
  error: 'border-danger bg-surface-2',
};

/** Status message. `role="status"` for polite announcements, `alert` for errors. */
export function Notice({ variant = 'info', children, id }: { variant?: Variant; children: ReactNode; id?: string }) {
  return (
    <div
      id={id}
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl border-l-4 border px-4 py-3 ${styles[variant]}`}
    >
      {children}
    </div>
  );
}
