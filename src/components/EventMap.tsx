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

/** Pin: a speech-bubble badge with our star and the number of spots left (or "Full"). */
function pinHtml(event: MapEvent, fullLabel: string): string {
  const c = PIN_COLORS[event.level];
  const label = event.level === 'full' ? fullLabel.replace(/[<>&"']/g, '') : String(event.spotsLeft);
  return `<svg width="64" height="42" viewBox="0 0 64 42" aria-hidden="true" focusable="false">
    <path d="M10 2h44a8 8 0 0 1 8 8v16a8 8 0 0 1-8 8H38l-6 6-6-6H10a8 8 0 0 1-8-8V10a8 8 0 0 1 8-8Z" fill="${c.bg}" stroke="${c.border}" stroke-width="2"/>
    <path d="M16 9.5l1.7 3.4 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.8-.5z" fill="${c.fg}"/>
    <text x="40" y="23.5" text-anchor="middle" font-family="system-ui,sans-serif" font-size="${label.length > 3 ? 11 : 15}" font-weight="800" fill="${c.fg}">${label}</text>
  </svg>`;
}

function popupContent(event: MapEvent, viewLabel: string): HTMLElement {
  // Built with DOM APIs (textContent), never innerHTML: titles and venue names are user content.
  const root = document.createElement('div');
  const title = document.createElement('p');
  title.className = 'font-display text-lg font-extrabold mb-1';
  title.textContent = event.title;
  const meta = document.createElement('p');
  meta.className = 'mb-1';
  meta.textContent = `${event.when} · ${event.venue}`;
  const spots = document.createElement('p');
  spots.className = 'mb-3 font-bold';
  spots.textContent = event.spotsLabel;
  const link = document.createElement('a');
  link.href = event.href;
  link.className = 'btn btn-primary min-h-11 py-2 px-4 text-sm';
  link.textContent = viewLabel;
  root.append(title, meta, spots, link);
  return root;
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
      const points: LatLngTuple[] = [];
      for (const event of events) {
        const marker = L.marker([event.lat, event.lng], {
          icon: L.divIcon({ html: pinHtml(event, labels.full), className: 'wl-pin', iconSize: [64, 42], iconAnchor: [32, 42], popupAnchor: [0, -40] }),
          keyboard: true,
          riseOnHover: true,
          title: event.title,
        })
          .bindPopup(() => popupContent(event, labels.viewEvent))
          .addTo(map);
        const el = marker.getElement();
        el?.setAttribute('role', 'button');
        el?.setAttribute('aria-label', `${event.title}, ${event.when}, ${event.spotsLabel}`);
        points.push([event.lat, event.lng]);
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
    <div className="relative">
      <div ref={containerRef} role="region" aria-label={labels.region} className="h-[62vh] min-h-[22rem] w-full overflow-hidden rounded-[var(--radius-card)] border border-line" />
      {!tileUrl ? (
        <p className="pointer-events-none absolute inset-x-3 top-3 z-[500] rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">
          {labels.noTiles}
        </p>
      ) : null}
    </div>
  );
}
