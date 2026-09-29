import 'server-only';
import { ANTWERP_BOUNDS, ANTWERP_CENTER, isInAntwerpArea } from '@/lib/constants';
import { mapTilerKey } from '@/lib/env';

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}

interface MapTilerFeature {
  place_name?: string;
  center?: [number, number];
}

/** Address search limited to the Antwerp area, via the MapTiler Geocoding API. */
export async function geocodeAddress(query: string): Promise<GeocodeResult[] | null> {
  const key = mapTilerKey();
  if (!key) return null;
  const { west, south, east, north } = ANTWERP_BOUNDS;
  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json`);
  url.searchParams.set('key', key);
  url.searchParams.set('country', 'be');
  url.searchParams.set('bbox', `${west},${south},${east},${north}`);
  url.searchParams.set('proximity', `${ANTWERP_CENTER.lng},${ANTWERP_CENTER.lat}`);
  url.searchParams.set('language', 'nl');
  url.searchParams.set('limit', '5');
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const json = (await response.json()) as { features?: MapTilerFeature[] };
    return (json.features ?? [])
      .filter((f): f is Required<MapTilerFeature> => Boolean(f.place_name && f.center))
      .map((f) => ({ label: f.place_name, lng: f.center[0], lat: f.center[1] }))
      .filter((r) => isInAntwerpArea(r.lat, r.lng));
  } catch (error) {
    console.error('geocoding failed', error);
    return null;
  }
}
