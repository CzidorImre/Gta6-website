/**
 * Logo: a map pin whose head is a star, next to the wordmark. Original artwork; no game assets,
 * fonts or HUD elements.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 48" className={className} aria-hidden="true" focusable="false">
      <path
        d="M20 46c-1 0-1.8-.5-2.3-1.3C12.8 37.2 5 28.6 5 19.5 5 11 11.7 4 20 4s15 7 15 15.5c0 9.1-7.8 17.7-12.7 25.2-.5.8-1.3 1.3-2.3 1.3Z"
        fill="var(--color-accent)"
      />
      <path
        d="M20 10.3c.4 0 .7.2.9.6l1.9 3.9 4.2.6c.8.1 1.1 1 .5 1.6l-3 3 .7 4.2c.1.8-.7 1.3-1.3 1l-3.9-2-3.9 2c-.6.3-1.4-.2-1.3-1l.7-4.2-3-3c-.6-.6-.3-1.5.5-1.6l4.2-.6 1.9-3.9c.2-.4.5-.6.9-.6Z"
        fill="var(--color-bg)"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark className="h-9 w-8 shrink-0" />
      <span className="font-display text-xl font-extrabold tracking-tight">Wanted Level</span>
    </span>
  );
}
