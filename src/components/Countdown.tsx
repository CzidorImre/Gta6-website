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
      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">{labels.title}</p>
      <p className="sr-only">
        {r.days} {labels.days}, {r.hours} {labels.hours}
      </p>
      <div className="flex gap-2" aria-hidden="true">
        {units.map(([value, label]) => (
          <div key={label} className="min-w-[4.25rem] rounded-2xl border border-line bg-surface-2 px-2 py-2 text-center">
            <span className="block font-display text-3xl font-extrabold tabular-nums text-accent">
              {String(value).padStart(2, '0')}
            </span>
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
