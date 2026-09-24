export type ImageAspect = 'any' | 'wide' | 'square' | 'tall';
export type ImageColor = 'any' | 'color' | 'gray';
export type VideoDuration = 'any' | 'short' | 'medium' | 'long';
export type VideoSource = 'any' | 'youtube' | 'vimeo';
export type VideoDate = 'any' | 'day' | 'week' | 'month' | 'year';
export type CityId = 'singapore' | 'tokyo';
export type MapZoom = 'city' | 'neighborhood';

export type ImageSearchFilters = { aspect?: ImageAspect; color?: ImageColor };
export type VideoSearchFilters = { duration?: VideoDuration; source?: VideoSource; date?: VideoDate };

/** Fixed preview centers from the OSM city pages, not geocoded search results.
 * https://wiki.openstreetmap.org/wiki/Singapore
 * https://wiki.openstreetmap.org/wiki/Tokyo
 */
export const CITIES = {
  singapore: { id: 'singapore', label: 'Singapore', lat: 1.34, lon: 103.85 },
  tokyo: { id: 'tokyo', label: 'Tokyo', lat: 35.68, lon: 139.76 },
} as const satisfies Record<CityId, { id: CityId; label: string; lat: number; lon: number }>;

const IMAGE_ASPECTS = { any: '', wide: 'w', square: 's', tall: 't|xt' } as const;
const VIDEO_DURATIONS = { any: '', short: 's', medium: 'm', long: 'l' } as const;
const VIDEO_SOURCES = { any: '', youtube: 'youtube.com', vimeo: 'vimeo.com' } as const;
const VIDEO_DATES = { any: '', day: 'd', week: 'w', month: 'm', year: 'y' } as const;

function setFilter(url: URL, key: string, value: unknown): void {
  if (typeof value === 'string' && value) url.searchParams.set(key, value);
}

/** Parameters verified against https://www.google.com/advanced_image_search. */
export function buildImageSearchUrl(query: string, filters: ImageSearchFilters = {}): string {
  const url = new URL('https://www.google.com/search');
  url.searchParams.set('q', query.trim() || 'images');
  url.searchParams.set('tbm', 'isch');
  url.searchParams.set('as_st', 'y');
  setFilter(url, 'imgar', IMAGE_ASPECTS[filters.aspect ?? 'any']);
  if (filters.color === 'color' || filters.color === 'gray') url.searchParams.set('imgc', filters.color);
  return url.toString();
}

/** Parameters verified against https://www.google.com/advanced_video_search. */
export function buildVideoSearchUrl(query: string, filters: VideoSearchFilters = {}): string {
  const url = new URL('https://www.google.com/search');
  url.searchParams.set('q', query.trim() || 'videos');
  url.searchParams.set('tbm', 'vid');
  const duration = VIDEO_DURATIONS[filters.duration ?? 'any'];
  if (typeof duration === 'string' && duration) {
    url.searchParams.set('dur', duration);
    // The official form also copies its data-tbs duration field here on submit.
    url.searchParams.set('tbs', `dur:${duration}`);
  }
  setFilter(url, 'as_qdr', VIDEO_DATES[filters.date ?? 'any']);
  setFilter(url, 'as_sitesearch', VIDEO_SOURCES[filters.source ?? 'any']);
  return url.toString();
}

function previewCity(city: CityId) {
  return city === 'tokyo' ? CITIES.tokyo : CITIES.singapore;
}

/** Google Maps URLs need no API key. Preserve locations in arbitrary search text.
 * https://developers.google.com/maps/documentation/urls/get-started#search-action
 */
export function buildMapSearchUrl(query: string, city: CityId = 'singapore', category = ''): string {
  const url = new URL('https://www.google.com/maps/search/');
  const term = query.trim() || previewCity(city).label;
  const trimmedCategory = category.trim();
  const filter = /^(?:any|all)$/i.test(trimmedCategory) ? '' : trimmedCategory;
  url.searchParams.set('api', '1');
  url.searchParams.set('query', filter ? `${term} ${filter}` : term);
  return url.toString();
}

export type MapBounds = { west: number; south: number; east: number; north: number };

/** View extents, not administrative boundaries or a claim about nearby results. */
export function getOpenStreetMapBounds(city: CityId, zoom: MapZoom = 'city'): MapBounds {
  const center = previewCity(city);
  const scale = zoom === 'neighborhood' ? 1 / 8 : 1;
  const longitudeRadius = 0.12 * scale;
  const latitudeRadius = 0.075 * scale;
  const rounded = (value: number) => Number(value.toFixed(6));
  return {
    west: rounded(center.lon - longitudeRadius),
    south: rounded(center.lat - latitudeRadius),
    east: rounded(center.lon + longitudeRadius),
    north: rounded(center.lat + latitudeRadius),
  };
}

/** Standard OSM share iframe; intentionally omits a result marker.
 * https://wiki.openstreetmap.org/wiki/Export#Embeddable_HTML
 */
export function buildOpenStreetMapEmbedUrl(city: CityId, zoom: MapZoom = 'city'): string {
  const bounds = getOpenStreetMapBounds(city, zoom);
  const url = new URL('https://www.openstreetmap.org/export/embed.html');
  url.searchParams.set('bbox', [bounds.west, bounds.south, bounds.east, bounds.north].join(','));
  url.searchParams.set('layer', 'mapnik');
  return url.toString();
}

export function buildOpenStreetMapUrl(city: CityId, zoom: MapZoom = 'city'): string {
  const center = previewCity(city);
  const url = new URL('https://www.openstreetmap.org/');
  url.hash = `map=${zoom === 'neighborhood' ? 15 : 12}/${center.lat}/${center.lon}`;
  return url.toString();
}
