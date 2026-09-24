import { describe, expect, it } from 'vitest';
import {
  buildImageSearchUrl, buildMapSearchUrl, buildOpenStreetMapEmbedUrl, buildOpenStreetMapUrl,
  buildVideoSearchUrl, CITIES, getOpenStreetMapBounds,
  type CityId, type ImageAspect, type VideoDate, type VideoDuration,
} from '../lib/discovery-tools';

const arbitraryQuery = '東京の cafés & parks + "rare birds" #1 / 50%?';

describe('image search destinations', () => {
  it('preserves arbitrary query text without allowing it to inject URL parameters', () => {
    const url = new URL(buildImageSearchUrl(`  ${arbitraryQuery} &tbm=vid  `, { aspect: 'tall', color: 'gray' }));
    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/search');
    expect(url.searchParams.get('q')).toBe(`${arbitraryQuery} &tbm=vid`);
    expect(url.searchParams.getAll('tbm')).toEqual(['isch']);
    expect(url.hash).toBe('');
    expect(url.searchParams.get('imgc')).toBe('gray');
    expect(url.searchParams.get('imgar')).toBe('t|xt');
  });

  it.each<[ImageAspect, string | null]>([
    ['any', null], ['wide', 'w'], ['square', 's'], ['tall', 't|xt'],
  ])('sends the official form value for %s aspect', (aspect, expected) => {
    expect(new URL(buildImageSearchUrl('Earth', { aspect })).searchParams.get('imgar')).toBe(expected);
  });

  it('applies color only when selected and falls back safely for blank queries', () => {
    expect(new URL(buildImageSearchUrl('  ')).searchParams.get('q')).toBe('images');
    expect(new URL(buildImageSearchUrl('Moon', { color: 'any' })).searchParams.has('imgc')).toBe(false);
    expect(new URL(buildImageSearchUrl('Moon', { color: 'color' })).searchParams.get('imgc')).toBe('color');
  });
});

describe('video search destinations', () => {
  it('combines duration, date and source without changing arbitrary query text', () => {
    const url = new URL(buildVideoSearchUrl(`\n${arbitraryQuery}\n`, { duration: 'short', date: 'week', source: 'youtube' }));
    expect(url.origin).toBe('https://www.google.com');
    expect(url.searchParams.get('q')).toBe(arbitraryQuery);
    expect(url.searchParams.get('tbm')).toBe('vid');
    expect(url.searchParams.get('dur')).toBe('s');
    expect(url.searchParams.get('tbs')).toBe('dur:s');
    expect(url.searchParams.get('as_qdr')).toBe('w');
    expect(url.searchParams.get('as_sitesearch')).toBe('youtube.com');
    expect(url.hash).toBe('');
  });

  it.each<[VideoDuration, string | null]>([
    ['any', null], ['short', 's'], ['medium', 'm'], ['long', 'l'],
  ])('sends both form and submitted tool values for %s duration', (duration, expected) => {
    const params = new URL(buildVideoSearchUrl('guitar', { duration })).searchParams;
    expect(params.get('dur')).toBe(expected);
    expect(params.get('tbs')).toBe(expected ? `dur:${expected}` : null);
  });

  it.each<[VideoDate, string | null]>([
    ['any', null], ['day', 'd'], ['week', 'w'], ['month', 'm'], ['year', 'y'],
  ])('sends the official form date value for %s', (date, expected) => {
    expect(new URL(buildVideoSearchUrl('guitar', { date })).searchParams.get('as_qdr')).toBe(expected);
  });

  it('supports Vimeo and unfiltered defaults', () => {
    const vimeo = new URL(buildVideoSearchUrl('guitar', { source: 'vimeo' }));
    expect(vimeo.searchParams.get('as_sitesearch')).toBe('vimeo.com');
    const blank = new URL(buildVideoSearchUrl(' \n ', { source: 'any', date: 'any', duration: 'any' }));
    expect(blank.searchParams.get('q')).toBe('videos');
    expect([...blank.searchParams.keys()]).toEqual(['q', 'tbm']);
  });
});

describe('map destinations and honest preview bounds', () => {
  it('keeps a searched location independent of the preview city', () => {
    const url = new URL(buildMapSearchUrl('  cafes in Paris  ', 'tokyo'));
    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/maps/search/');
    expect(url.searchParams.get('api')).toBe('1');
    expect(url.searchParams.get('query')).toBe('cafes in Paris');
    expect(url.searchParams.has('query_place_id')).toBe(false);
  });

  it('adds an explicit category and encodes query and category as one search value', () => {
    const url = new URL(buildMapSearchUrl(arbitraryQuery, 'singapore', '  art & museums  '));
    expect(url.searchParams.get('query')).toBe(`${arbitraryQuery} art & museums`);
    expect([...url.searchParams.keys()]).toEqual(['api', 'query']);
    expect(url.hash).toBe('');
  });

  it('uses the chosen city only for blank queries and omits unfiltered categories', () => {
    expect(new URL(buildMapSearchUrl(' ', 'tokyo', 'cafes')).searchParams.get('query')).toBe('Tokyo cafes');
    expect(new URL(buildMapSearchUrl('\n', 'singapore', 'all')).searchParams.get('query')).toBe('Singapore');
    expect(new URL(buildMapSearchUrl('Rome', 'singapore', 'any')).searchParams.get('query')).toBe('Rome');
  });

  it.each<CityId>(['singapore', 'tokyo'])('uses the documented %s center, with finite west/south/east/north bounds', city => {
    const center = CITIES[city];
    const expected = city === 'singapore' ? { lat: 1.34, lon: 103.85 } : { lat: 35.68, lon: 139.76 };
    expect(center).toMatchObject(expected);
    const url = new URL(buildOpenStreetMapEmbedUrl(city));
    expect(url.origin).toBe('https://www.openstreetmap.org');
    expect(url.pathname).toBe('/export/embed.html');
    expect(url.searchParams.get('layer')).toBe('mapnik');
    const bounds = url.searchParams.get('bbox')!.split(',').map(Number);
    expect(bounds).toHaveLength(4);
    expect(bounds.every(Number.isFinite)).toBe(true);
    const [west, south, east, north] = bounds;
    expect(west).toBeLessThan(center.lon);
    expect(east).toBeGreaterThan(center.lon);
    expect(south).toBeLessThan(center.lat);
    expect(north).toBeGreaterThan(center.lat);
    expect((west + east) / 2).toBeCloseTo(center.lon, 6);
    expect((south + north) / 2).toBeCloseTo(center.lat, 6);
    expect(west).toBeGreaterThan(-180);
    expect(east).toBeLessThan(180);
    expect(south).toBeGreaterThan(-90);
    expect(north).toBeLessThan(90);
    // No invented result pin, geocoded place ID, or user query in the preview.
    expect([...url.searchParams.keys()]).toEqual(['bbox', 'layer']);
  });

  it.each<CityId>(['singapore', 'tokyo'])('zooms the %s preview around the same center and links to that area', city => {
    const wide = getOpenStreetMapBounds(city, 'city');
    const close = getOpenStreetMapBounds(city, 'neighborhood');
    expect(close.west).toBeGreaterThan(wide.west);
    expect(close.south).toBeGreaterThan(wide.south);
    expect(close.east).toBeLessThan(wide.east);
    expect(close.north).toBeLessThan(wide.north);
    expect((wide.east - wide.west) / (close.east - close.west)).toBeCloseTo(8, 6);
    const center = CITIES[city];
    const cityUrl = new URL(buildOpenStreetMapUrl(city, 'city'));
    const neighborhoodUrl = new URL(buildOpenStreetMapUrl(city, 'neighborhood'));
    expect(cityUrl.hash).toBe(`#map=12/${center.lat}/${center.lon}`);
    expect(neighborhoodUrl.hash).toBe(`#map=15/${center.lat}/${center.lon}`);
    expect(neighborhoodUrl.search).toBe('');
  });

  it('falls back safely if stale runtime controls supply unsupported values', () => {
    const invalidCity = 'unsupported' as CityId;
    expect(buildOpenStreetMapEmbedUrl(invalidCity)).toBe(buildOpenStreetMapEmbedUrl('singapore'));
    expect(new URL(buildImageSearchUrl('Earth', { aspect: 'constructor' as ImageAspect })).searchParams.has('imgar')).toBe(false);
    expect(new URL(buildVideoSearchUrl('guitar', { duration: 'constructor' as VideoDuration })).searchParams.has('tbs')).toBe(false);
  });
});
