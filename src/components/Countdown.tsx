'use client';

import { useEffect, useState } from 'react';

interface Labels {
  title: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  launched: string;
}

function remaining(target: number, now: number) {
  const total = Math.max(target - now, 0);
  return {
    total,
    days: Math.floor(total / 86_400_000),
    hours: Math.floor((total / 3_600_000) % 24),
    minutes: Math.floor((total / 60_000) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

/**
 * Countdown to launch. The server renders the starting value (no layout shift); the client ticks.
 * Screen readers get the day/hour summary once, not every second.
 */
export function Countdown({ target, serverNow, labels }: { target: string; serverNow: number; labels: Labels }) {
  const targetMs = new Date(target).getTime();
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const r = remaining(targetMs, now);
  if (r.total === 0) {
    return <p className="font-display text-2xl font-extrabold text-accent">{labels.launched}</p>;
  }

  const units: Array<[number, string]> = [
    [r.days, labels.days],
    [r.hours, labels.hours],
    [r.minutes, labels.minutes],
    [r.seconds, labels.seconds],
  ];
  return (
    <div>
      <p className="sr-only">
        {labels.title} {r.days} {labels.days}, {r.hours} {labels.hours}
      </p>
      {/* Phones: one compact line. Larger screens: tiles. */}
      <p className="inline-flex items-baseline gap-2 rounded-full border border-line bg-surface-2 px-4 py-2 sm:hidden" aria-hidden="true">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{labels.title}</span>
        <span className="font-display text-xl font-extrabold tabular-nums text-accent">
          {r.days}
          <span className="text-sm text-muted">{labels.days.slice(0, 1)}</span> {String(r.hours).padStart(2, '0')}
          <span className="text-sm text-muted">{labels.hours.slice(0, 1)}</span> {String(r.minutes).padStart(2, '0')}
          <span className="text-sm text-muted">m</span> {String(r.seconds).padStart(2, '0')}
          <span className="text-sm text-muted">s</span>
        </span>
      </p>
      <div className="hidden sm:block" aria-hidden="true">
        <p className="mb-1.5 text-sm font-semibold uppercase tracking-wider text-muted">{labels.title}</p>
        <div className="flex gap-2">
          {units.map(([value, label]) => (
            <div key={label} className="min-w-[4.25rem] rounded-2xl border border-line bg-surface-2 px-2 py-2 text-center">
              <span className="block font-display text-3xl font-extrabold tabular-nums text-accent">{String(value).padStart(2, '0')}</span>
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
