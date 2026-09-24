import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ageOnMars, dictionaryWordForDraft, earthMarsQuery, movieForDraft, parseWeatherResponse, weatherCityForDraft } from '../lib/knowledge';

function providerResponse() {
  return { daily: {
    time: ['2026-09-24', '2026-09-25'], temperature_2m_max: [31.5, 32], temperature_2m_min: [24, 24.5],
    precipitation_probability_max: [70, 45], weather_code: [80, 2],
    sunrise: ['2026-09-24T06:55', '2026-09-25T06:55'], sunset: ['2026-09-24T19:02', '2026-09-25T19:01'],
  } };
}

describe('bounded knowledge entries', () => {
  it.each(['define:serendipity', 'What does serendipity mean?', 'serendipity'])('recognizes the requested dictionary entry: %s', query => {
    expect(dictionaryWordForDraft(query)).toBe('serendipity');
  });
  it.each(['define:ephemeral', 'meaning of ephemeral', 'what is ephemeral?'])('recognizes the second dictionary entry: %s', query => {
    expect(dictionaryWordForDraft(query)).toBe('ephemeral');
  });
  it.each(['define:ephemeralization', 'not serendipity, define apple', 'define:apple', 'serendipity and ephemeral'])('never substitutes a familiar word for %s', query => {
    expect(dictionaryWordForDraft(query)).toBeNull();
  });
  it.each([['Interstellar', 'interstellar'], ['movie:Dune: Part Two', 'dune'], ['Dune 2 cast', 'dune'], ['tell me about Interstellar', 'interstellar']])('recognizes the named film: %s', (query, film) => {
    expect(movieForDraft(query)).toBe(film);
  });
  it.each(['movie:Dune', 'Interstellar travel', 'Dune Part Three', 'Cast Away'])('does not substitute another movie for %s', query => {
    expect(movieForDraft(query)).toBeNull();
  });
  it('only resolves explicit supported cities, not a guessed location', () => {
    expect(weatherCityForDraft('weather:Singapore tomorrow')).toBe('singapore');
    expect(weatherCityForDraft('sunrise in Tokyo')).toBe('tokyo');
    expect(weatherCityForDraft('weather in London')).toBeNull();
    expect(weatherCityForDraft('will it rain?')).toBeNull();
    expect(weatherCityForDraft('Tokyo vs Singapore weather')).toBeNull();
  });
  it('keeps comparisons scoped to Earth and Mars', () => {
    expect(earthMarsQuery('Earth vs Mars')).toBe(true);
    expect(earthMarsQuery('Earth vs Jupiter')).toBe(false);
    expect(earthMarsQuery('Earth vs Mars vs Venus')).toBe(false);
    expect(ageOnMars(30)).toBeCloseTo(15.9498, 3);
    expect(ageOnMars(-5)).toBeNull();
    expect(ageOnMars(Infinity)).toBeNull();
  });
});

describe('forecast validation', () => {
  it('retains actual temperatures and local solar times', () => {
    const parsed = parseWeatherResponse(providerResponse(), 'singapore', '2026-09-24T01:00:00.000Z');
    expect(parsed?.days[0]).toEqual({ date: '2026-09-24', high: 31.5, low: 24, rain: 70, code: 80, sunrise: '2026-09-24T06:55', sunset: '2026-09-24T19:02' });
    expect(parsed?.timezone).toBe('Asia/Singapore');
  });
  it.each([null, {}, { daily: {} }, { daily: { time: ['2026-09-24'] } }])('rejects missing forecast data', value => {
    expect(parseWeatherResponse(value, 'tokyo', '')).toBeNull();
  });
  it('rejects null readings, mismatched arrays, and impossible probability values instead of inventing data', () => {
    const mismatched = providerResponse(); mismatched.daily.sunrise.pop();
    expect(parseWeatherResponse(mismatched, 'tokyo', '')).toBeNull();
    const invalid = providerResponse(); invalid.daily.precipitation_probability_max[0] = 101;
    expect(parseWeatherResponse(invalid, 'tokyo', '')).toBeNull();
    const nullValue = providerResponse(); (nullValue.daily.temperature_2m_max as unknown[])[0] = null;
    expect(parseWeatherResponse(nullValue, 'tokyo', '')).toBeNull();
  });
});

describe('fixed-city weather endpoint', () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.unstubAllGlobals(); });
  it('rejects unknown cities, duplicate keys, and unrelated query text before contacting any provider', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const { GET } = await import('../app/api/weather/route');
    for (const query of ['city=london', 'city=__proto__', 'city=tokyo&draft=private', 'city=tokyo&city=singapore', '']) {
      const response = await GET(new Request(`https://fluid.test/api/weather?${query}`));
      expect(response.status).toBe(400);
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('coalesces concurrent fetches and caches the original retrieval timestamp', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(providerResponse()), { status: 200 }));
    vi.stubGlobal('fetch', fetcher);
    const { GET } = await import('../app/api/weather/route');
    const request = () => new Request('https://fluid.test/api/weather?city=singapore');
    const [one, two] = await Promise.all([GET(request()), GET(request())]);
    const first = await one.json(); const second = await two.json();
    const third = await (await GET(request())).json();
    expect(first.city).toBe('singapore'); expect(second.fetchedAt).toBe(first.fetchedAt); expect(third.fetchedAt).toBe(first.fetchedAt);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const sent = new URL(fetcher.mock.calls[0][0]);
    expect(sent.hostname).toBe('api.open-meteo.com'); expect(sent.searchParams.get('latitude')).toBe('1.3521');
    expect(sent.searchParams.has('draft')).toBe(false);
  });
  it('returns an unavailable response without fabricated readings when the provider fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('provider down')));
    const { GET } = await import('../app/api/weather/route');
    const response = await GET(new Request('https://fluid.test/api/weather?city=tokyo'));
    expect(response.status).toBe(503); expect((await response.json()).days).toBeUndefined();
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
