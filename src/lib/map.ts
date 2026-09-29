export const MAP_ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>';

/** MapTiler raster tiles (512px). null when no key is configured: the map then shows pins only. */
export function tileUrlFor(key: string | undefined): string | null {
  if (!key) return null;
  const style = process.env.MAPTILER_STYLE ?? 'dataviz-dark';
  return `https://api.maptiler.com/maps/${style}/{z}/{x}/{y}.png?key=${key}`;
}
