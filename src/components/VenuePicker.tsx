'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { useTranslations } from 'next-intl';
import { ANTWERP_CENTER, isInAntwerpArea } from '@/lib/constants';
import type { GeocodeResult } from '@/lib/geocode';

interface Props {
  initialLat?: number;
  initialLng?: number;
  tileUrl: string | null;
  attribution: string;
  addressInputId: string;
  geocode: (address: string) => Promise<GeocodeResult[] | null>;
  error?: string;
}

/**
 * Where exactly is the venue? Search the address (MapTiler geocoding) and/or drag the pin. The
 * latitude/longitude inputs are the keyboard alternative to dragging.
 */
export function VenuePicker({ initialLat, initialLng, tileUrl, attribution, addressInputId, geocode, error }: Props) {
  const t = useTranslations('venuePicker');
  const [position, setPosition] = useState({ lat: initialLat ?? ANTWERP_CENTER.lat, lng: initialLng ?? ANTWERP_CENTER.lng });
  const [results, setResults] = useState<GeocodeResult[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void import('leaflet').then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { center: [position.lat, position.lng], zoom: 16, scrollWheelZoom: false });
      map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
      if (tileUrl) L.tileLayer(tileUrl, { attribution, tileSize: 512, zoomOffset: -1, maxZoom: 19 }).addTo(map);
      const marker = L.marker([position.lat, position.lng], {
        draggable: true,
        keyboard: false,
        icon: L.divIcon({
          className: 'wl-pin',
          html: '<svg width="40" height="48" viewBox="0 0 40 48" aria-hidden="true"><path d="M20 46c-1 0-1.8-.5-2.3-1.3C12.8 37.2 5 28.6 5 19.5 5 11 11.7 4 20 4s15 7 15 15.5c0 9.1-7.8 17.7-12.7 25.2-.5.8-1.3 1.3-2.3 1.3Z" fill="#c6ff3d" stroke="#000000" stroke-width="2"/></svg>',
          iconSize: [40, 48],
          iconAnchor: [20, 46],
        }),
      }).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLatLng();
        setPosition({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) });
      });
      mapRef.current = map;
      markerRef.current = marker;
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // The map is created once; position changes are pushed in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileUrl, attribution]);

  useEffect(() => {
    markerRef.current?.setLatLng([position.lat, position.lng]);
    mapRef.current?.panTo([position.lat, position.lng]);
  }, [position]);

  const search = () => {
    const input = document.getElementById(addressInputId) as HTMLInputElement | null;
    const address = input?.value ?? '';
    startSearch(async () => {
      const found = await geocode(address);
      if (found === null) {
        setResults(null);
        setMessage(t('unavailable'));
      } else if (found.length === 0) {
        setResults([]);
        setMessage(t('noResults'));
      } else {
        setResults(found);
        setMessage(null);
        const first = found[0];
        if (first) setPosition({ lat: first.lat, lng: first.lng });
      }
    });
  };

  const outside = !isInAntwerpArea(position.lat, position.lng);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={search} className="btn btn-secondary" disabled={searching}>
          {searching ? t('searching') : t('find')}
        </button>
        <span className="text-sm text-muted">{t('dragHint')}</span>
      </div>
      {message ? (
        <p role="status" className="text-sm font-semibold text-warn">
          {message}
        </p>
      ) : null}
      {results && results.length > 1 ? (
        <ul className="flex flex-col gap-2" aria-label={t('results')}>
          {results.map((r) => (
            <li key={`${r.lat},${r.lng}`}>
              <button type="button" className="chip w-full justify-start text-left" onClick={() => setPosition({ lat: r.lat, lng: r.lng })}>
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div ref={containerRef} role="application" aria-label={t('mapLabel')} className="h-72 w-full overflow-hidden rounded-2xl border border-line" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="lat" className="field-label">
            {t('lat')}
          </label>
          <input
            id="lat"
            name="lat"
            type="number"
            step="0.000001"
            className="input"
            value={position.lat}
            onChange={(e) => setPosition((p) => ({ ...p, lat: Number(e.target.value) }))}
            aria-invalid={outside || error ? true : undefined}
          />
        </div>
        <div>
          <label htmlFor="lng" className="field-label">
            {t('lng')}
          </label>
          <input
            id="lng"
            name="lng"
            type="number"
            step="0.000001"
            className="input"
            value={position.lng}
            onChange={(e) => setPosition((p) => ({ ...p, lng: Number(e.target.value) }))}
            aria-invalid={outside || error ? true : undefined}
          />
        </div>
      </div>
      {outside || error ? (
        <p className="field-error" role="alert">
          {t('outside')}
        </p>
      ) : null}
    </div>
  );
}
