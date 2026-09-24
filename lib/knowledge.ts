export const WEATHER_CITIES = {
  singapore: { name: 'Singapore', latitude: 1.3521, longitude: 103.8198, timezone: 'Asia/Singapore' },
  tokyo: { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
} as const;
export type WeatherCity = keyof typeof WEATHER_CITIES;
export function weatherCityForDraft(draft: string): WeatherCity | null {
  const matches = Object.keys(WEATHER_CITIES).filter(city => new RegExp(`\\b${city}\\b`, 'i').test(draft));
  return matches.length === 1 ? matches[0] as WeatherCity : null;
}
export type ForecastDay = { date: string; high: number; low: number; rain: number; code: number; sunrise: string; sunset: string };
export type WeatherForecast = { city: WeatherCity; timezone: string; fetchedAt: string; days: ForecastDay[] };
export function parseWeatherResponse(value: unknown, city: WeatherCity, fetchedAt: string): WeatherForecast | null {
  if (!value || typeof value !== 'object') return null;
  const daily = (value as { daily?: unknown }).daily;
  if (!daily || typeof daily !== 'object') return null;
  const d = daily as Record<string, unknown>;
  const fields = ['time', 'temperature_2m_max', 'temperature_2m_min', 'precipitation_probability_max', 'weather_code', 'sunrise', 'sunset'];
  if (!fields.every(key => Array.isArray(d[key]))) return null;
  const times = d.time as unknown[];
  if (times.length < 2 || times.length > 7 || !fields.every(key => (d[key] as unknown[]).length === times.length)) return null;
  const days: ForecastDay[] = [];
  for (let i = 0; i < times.length; i++) {
    const [date, high, low, rain, code, sunrise, sunset] = fields.map(key => (d[key] as unknown[])[i]);
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      typeof high !== 'number' || !Number.isFinite(high) || typeof low !== 'number' || !Number.isFinite(low) || low > high ||
      typeof rain !== 'number' || !Number.isFinite(rain) || rain < 0 || rain > 100 ||
      typeof code !== 'number' || !Number.isInteger(code) || code < 0 || code > 99 ||
      typeof sunrise !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(sunrise) ||
      typeof sunset !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(sunset)) return null;
    days.push({ date, high, low, rain, code, sunrise, sunset });
  }
  return { city, timezone: WEATHER_CITIES[city].timezone, fetchedAt, days };
}
export function weatherDescription(code: number) {
  if (code === 0) return 'Clear sky';
  if (code <= 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 95) return 'Thunderstorms';
  if ([71,73,75,77,85,86].includes(code)) return 'Snow';
  if (code >= 51) return 'Rain';
  return 'Forecast';
}

// Short editorial paraphrases; example sentences are original, not dictionary quotations.
export const WORDS = {
  serendipity: {
    term: 'serendipity', syllables: 'ser·en·dip·i·ty', kind: 'noun',
    meaning: 'The fortunate discovery of something valuable when you were looking for something else.',
    example: 'Finding her favourite record in a tiny bookshop was pure serendipity.',
    related: ['chance', 'good fortune', 'happy accident'], source: 'https://www.merriam-webster.com/dictionary/serendipity',
  },
  ephemeral: {
    term: 'ephemeral', syllables: 'e·phem·er·al', kind: 'adjective',
    meaning: 'Existing for only a brief time; soon passing or disappearing.',
    example: 'The ephemeral glow of sunset turned the windows gold.',
    related: ['fleeting', 'transient', 'short-lived'], source: 'https://www.merriam-webster.com/dictionary/ephemeral',
  },
} as const;
export type WordKey = keyof typeof WORDS;
export function dictionaryWordForDraft(draft: string): WordKey | null {
  const cleaned = draft.trim().replace(/^define\s*:\s*|^(?:please\s+)?(?:define|meaning of|definition of|what (?:does|is)(?: the meaning of)?)\s+/i, '').replace(/\s+(?:mean|meaning|definition|synonyms)(?:\s+please)?[?.!]*$|[?.!]+$/i, '').trim().replace(/^["“']|["”']$/g, '').toLowerCase();
  return Object.hasOwn(WORDS, cleaned) ? cleaned as WordKey : null;
}
export const FILMS = {
  interstellar: {
    title: 'Interstellar', year: 2014, runtime: 168, director: 'Christopher Nolan',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain'],
    synopsis: 'A pilot leaves his family on a failing Earth to search beyond our galaxy for a future home.',
    source: 'https://www.paramountpictures.com/movies/interstellar', sourceLabel: 'Paramount Pictures',
  },
  dune: {
    title: 'Dune: Part Two', year: 2024, runtime: 166, director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson'],
    synopsis: 'On Arrakis, Paul Atreides joins Chani and the Fremen as conflict grows around his family’s legacy.',
    source: 'https://www.classification.gov.au/titles/dune-part-two', sourceLabel: 'Australian Classification',
  },
} as const;
export type FilmKey = keyof typeof FILMS;
export function movieForDraft(draft: string): FilmKey | null {
  const clean = draft.toLowerCase().replace(/^movie\s*:\s*/, '').replace(/\b(?:movie|film|runtime|cast|trailer|reviews?|showtimes?|information|about|tell me|what is|who is in|who directed|the|of|for)\b/g, ' ').replace(/[?:,.!]/g,' ').replace(/\s+/g, ' ').trim();
  if (clean === 'interstellar' || clean === 'interstellar 2014') return 'interstellar';
  if (/^dune\s*(?:(?:part\s*)?(?:two|2|ii))(?:\s+2024)?$/.test(clean)) return 'dune';
  return null;
}
export const PLANETS = {
  earth: { name: 'Earth', dayHours: 23.9, yearDays: 365.25, moons: 1, source: 'https://science.nasa.gov/earth/facts/' },
  mars: { name: 'Mars', dayHours: 24.6, yearDays: 687, moons: 2, source: 'https://science.nasa.gov/mars/facts/' },
} as const;
export function earthMarsQuery(draft: string) { return /\bearth\b/i.test(draft) && /\bmars\b/i.test(draft) && !/\b(?:venus|jupiter|saturn|mercury|neptune|uranus)\b/i.test(draft); }
export function ageOnMars(earthYears: number): number | null { return Number.isFinite(earthYears) && earthYears >= 0 && earthYears <= 150 ? earthYears * PLANETS.earth.yearDays / PLANETS.mars.yearDays : null; }
