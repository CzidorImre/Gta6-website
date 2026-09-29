/**
 * The Wanted Level star: five chunky, rounded points, drawn for this site (not a game HUD star).
 */
export function Star({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M12 2.6c.5 0 .9.3 1.1.7l2.3 4.8 5.2.7c.9.1 1.3 1.3.6 1.9l-3.8 3.7.9 5.2c.2.9-.8 1.6-1.6 1.2L12 18.3l-4.7 2.5c-.8.4-1.8-.3-1.6-1.2l.9-5.2-3.8-3.7c-.7-.6-.3-1.8.6-1.9l5.2-.7 2.3-4.8c.2-.4.6-.7 1.1-.7Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
