'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

export function SubmitButton({
  children,
  pendingLabel,
  variant = 'primary',
  className = '',
  disabled,
  name,
  value,
}: {
  children: ReactNode;
  pendingLabel: string;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      className={`btn btn-${variant} ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
