import { WEATHER_CITIES, parseWeatherResponse, type WeatherCity, type WeatherForecast } from '../../../lib/knowledge';

export const runtime = 'nodejs';
export const maxDuration = 10;
const TTL = 15 * 60 * 1000;
const cache = new Map<WeatherCity, { value: WeatherForecast; expires: number }>();
const pending = new Map<WeatherCity, Promise<WeatherForecast>>();

async function forecast(city: WeatherCity): Promise<WeatherForecast> {
  const saved = cache.get(city);
  if (saved && saved.expires > Date.now()) return saved.value;
  const active = pending.get(city);
  if (active) return active;
  const request = (async () => {
    const place = WEATHER_CITIES[city];
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: String(place.latitude), longitude: String(place.longitude), timezone: place.timezone,
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset', forecast_days: '7',
    }).toString();
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Weather provider unavailable');
    const parsed = parseWeatherResponse(await response.json(), city, new Date().toISOString());
    if (!parsed) throw new Error('Invalid weather response');
    cache.set(city, { value: parsed, expires: Date.now() + TTL });
    return parsed;
  })();
  pending.set(city, request);
  try { return await request; } finally { pending.delete(city); }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const city = params.get('city');
  if (!city || !Object.hasOwn(WEATHER_CITIES, city) || params.size !== 1) {
    return Response.json({ error: 'Choose Singapore or Tokyo.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    return Response.json(await forecast(city as WeatherCity), {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=900', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return Response.json({ error: 'The forecast is unavailable. Try again shortly.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
