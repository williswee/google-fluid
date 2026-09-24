import { isCurrency, validRate } from '../../../lib/currency';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = params.get('from'), to = params.get('to');
  if (params.size !== 2 || !isCurrency(from) || !isCurrency(to) || from === to) return Response.json({ error: 'Choose two supported currencies.' }, { status: 400 });
  try {
    // Whitelisted codes only: the draft and converted amount never leave the browser.
    const response = await fetch(`https://api.frankfurter.dev/v2/providers/ecb/rate/${from.toLowerCase()}/${to.toLowerCase()}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Unavailable');
    const value: unknown = await response.json();
    // Provider uses uppercase ISO codes.
    if (!validRate(value, from, to)) throw new Error('Invalid rate');
    return Response.json({ base: value.base, quote: value.quote, rate: value.rate, date: value.date }, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600' } });
  } catch {
    return Response.json({ error: 'The exchange rate is unavailable. Try again shortly.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
