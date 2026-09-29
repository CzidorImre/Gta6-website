'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { LatLngTuple, Map as LeafletMap } from 'leaflet';
import { ANTWERP_CENTER } from '@/lib/constants';
import type { SpotsLevel } from '@/lib/spots';

export interface MapEvent {
  id: string;
  title: string;
  lat: number;
  lng: number;
  spotsLeft: number;
  level: SpotsLevel;
  when: string;
  venue: string;
  spotsLabel: string;
  href: string;
}

export interface MapLabels {
  region: string;
  viewEvent: string;
  full: string;
  noTiles: string;
}

const PIN_COLORS: Record<SpotsLevel, { bg: string; fg: string; border: string }> = {
  plenty: { bg: '#c6ff3d', fg: '#0b0b12', border: '#0b0b12' },
  few: { bg: '#ffb84d', fg: '#0b0b12', border: '#0b0b12' },
  full: { bg: '#2a2a3c', fg: '#f2f2f7', border: '#7a7a96' },
};

/**
 * Pin: a speech-bubble badge with our star and the spots left at the venue's next event (or
 * "Full"), plus "+N" when more events share the venue. Only numbers and our own label go in here.
 */
function pinHtml(event: MapEvent, more: number, fullLabel: string): string {
  const c = PIN_COLORS[event.level];
  const label = event.level === 'full' ? fullLabel.replace(/[<>&"']/g, '') : String(event.spotsLeft);
  const width = more > 0 ? 84 : 64;
  const tip = width / 2;
  return `<svg width="${width}" height="42" viewBox="0 0 ${width} 42" aria-hidden="true" focusable="false">
    <path d="M10 2h${width - 20}a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8H${tip + 6}l-6 6-6-6H10a8 8 0 0 1-8-8V10a8 8 0 0 1 8-8Z" fill="${c.bg}" stroke="${c.border}" stroke-width="2"/>
    <path d="M16 9.5l1.7 3.4 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z" fill="${c.fg}"/>
    <text x="40" y="23.5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${label.length > 3 ? 11 : 15}" font-weight="800" fill="${c.fg}">${label}</text>
    ${more > 0 ? `<text x="${width - 14}" y="23" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="800" fill="${c.fg}">+${more}</text>` : ''}
  </svg>`;
}

function popupContent(events: MapEvent[], viewLabel: string): HTMLElement {
  // Built with DOM APIs (textContent), never innerHTML: titles and venue names are user content.
  const root = document.createElement('div');
  const venue = document.createElement('p');
  venue.className = 'mb-2 text-sm font-semibold text-muted';
  venue.textContent = events[0]?.venue ?? '';
  root.append(venue);
  for (const event of events) {
    const item = document.createElement('div');
    item.className = 'mb-3 last:mb-0';
    const title = document.createElement('p');
    title.className = 'font-display text-lg font-extrabold';
    title.textContent = event.title;
    const meta = document.createElement('p');
    meta.textContent = `${event.when} · ${event.spotsLabel}`;
    const link = document.createElement('a');
    link.href = event.href;
    link.className = 'btn btn-primary mt-2 min-h-11 py-2 px-4 text-sm';
    link.textContent = viewLabel;
    item.append(title, meta, link);
    root.append(item);
  }
  return root;
}

/** Events at the same venue share one pin (they would otherwise hide each other). */
function groupByVenue(events: MapEvent[]): MapEvent[][] {
  const groups = new Map<string, MapEvent[]>();
  for (const event of events) {
    const key = `${event.lat.toFixed(5)},${event.lng.toFixed(5)}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.values()];
}

export default function EventMap({
  events,
  tileUrl,
  attribution,
  labels,
}: {
  events: MapEvent[];
  tileUrl: string | null;
  attribution: string;
  labels: MapLabels;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current, {
        center: [ANTWERP_CENTER.lat, ANTWERP_CENTER.lng],
        zoom: 13,
        scrollWheelZoom: false,
        keyboard: true,
      });
      if (tileUrl) {
        L.tileLayer(tileUrl, { attribution, tileSize: 512, zoomOffset: -1, minZoom: 10, maxZoom: 19, crossOrigin: true }).addTo(map);
      }
      map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
      const points: LatLngTuple[] = [];
      for (const group of groupByVenue(events)) {
        const [first] = group;
        if (!first) continue;
        const more = group.length - 1;
        const width = more > 0 ? 84 : 64;
        const marker = L.marker([first.lat, first.lng], {
          icon: L.divIcon({ html: pinHtml(first, more, labels.full), className: 'wl-pin', iconSize: [width, 42], iconAnchor: [width / 2, 42], popupAnchor: [0, -40] }),
          keyboard: true,
          riseOnHover: true,
          title: first.venue,
        })
          .bindPopup(() => popupContent(group, labels.viewEvent), { maxHeight: 320 })
          .addTo(map);
        const el = marker.getElement();
        el?.setAttribute('role', 'button');
        el?.setAttribute('aria-label', group.map((e) => `${e.title}, ${e.when}, ${e.spotsLabel}`).join('; '));
        points.push([first.lat, first.lng]);
      }
      if (points.length > 1) map.fitBounds(points, { padding: [48, 48], maxZoom: 15 });
      else if (points[0]) map.setView(points[0], 15);
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [events, tileUrl, attribution, labels]);

  return (
    <div>
      <div ref={containerRef} role="region" aria-label={labels.region} className="h-[62vh] min-h-[22rem] w-full overflow-hidden rounded-[var(--radius-card)] border border-line" />
      {!tileUrl ? <p className="mt-2 text-sm text-muted">{labels.noTiles}</p> : null}
    </div>
  );
}
