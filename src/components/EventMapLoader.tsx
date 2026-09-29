'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type EventMapComponent from './EventMap';

/**
 * Leaflet only runs in the browser, and is loaded after the page is interactive so it doesn't
 * delay the first paint. The placeholder has the map's exact size (no layout shift).
 */
const EventMap = dynamic(() => import('./EventMap'), {
  ssr: false,
  loading: () => <div className="h-[62vh] min-h-[22rem] w-full rounded-[var(--radius-card)] border border-line bg-surface" />,
});

export function EventMapLoader(props: ComponentProps<typeof EventMapComponent>) {
  return <EventMap {...props} />;
}
