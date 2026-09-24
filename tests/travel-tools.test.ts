import { describe, expect, it } from 'vitest';
import {
  addNights, buildFlightSearch, buildHotelSearch, buildShoppingSearch, flightDateError, hotelDateError,
  isoDay, parseFlightDraft, parseHotelDraft, parseShoppingDraft, shoppingBudgetError, stayNights,
} from '../lib/travel-tools';

function query(url: string | null) { expect(url).not.toBeNull(); return new URL(url!).searchParams.get('q')!; }

describe('calendar dates, without timezone drift', () => {
  it.each(['2026-02-29', '2026-13-01', '2026-04-31', '2026-9-01', 'tomorrow', '0000-01-01'])('rejects invalid date %s', date => expect(isoDay(date)).toBeNull());
  it('accepts leap days and counts the same nights across daylight-saving changes', () => {
    expect(isoDay('2028-02-29')).not.toBeNull();
    expect(stayNights('2026-03-07', '2026-03-10')).toBe(3);
    expect(stayNights('2026-10-31', '2026-11-02')).toBe(2);
    expect(addNights('2028-02-28', 2)).toBe('2028-03-01');
  });
  it('does not invent zero, backwards, fractional, or overflowing stays', () => {
    expect(stayNights('2026-11-01', '2026-11-01')).toBeNull();
    expect(stayNights('2026-11-02', '2026-11-01')).toBeNull();
    expect(addNights('2026-11-01', 1.5)).toBeNull();
    expect(addNights('9999-12-31', 1)).toBeNull();
    expect(addNights('2026-11-01', Infinity)).toBeNull();
  });
});

describe('flight itinerary', () => {
  it('extracts both supported routes without unrelated defaults', () => {
    expect(parseFlightDraft('flights from Singapore to Tokyo')).toMatchObject({ origin: 'Singapore', destination: 'Tokyo', details: '', departure: '', returnDate: '' });
    expect(parseFlightDraft('one way flights from London to New York')).toMatchObject({ origin: 'London', destination: 'New York', trip: 'one-way', details: '' });
    expect(parseFlightDraft('Singapore to Tokyo flights')).toMatchObject({ origin: 'Singapore', destination: 'Tokyo', details: '' });
  });
  it('preserves dates, passengers, cabin, and extra wishes in the outbound search', () => {
    const plan = parseFlightDraft('business class flights from London to New York departing 2026-11-03 returning 2026-11-12 for 2 passengers with no layover');
    expect(plan).toMatchObject({ origin: 'London', destination: 'New York', departure: '2026-11-03', returnDate: '2026-11-12', passengers: '2', cabin: 'Business', details: 'with no layover' });
    const result = buildFlightSearch(plan);
    const q = query(result.url);
    for (const expected of ['from London to New York', 'round-trip', 'departing 2026-11-03', 'returning 2026-11-12', '2 passengers', 'business class', 'with no layover']) expect(q).toContain(expected);
    expect(new URL(result.url!).origin).toBe('https://www.google.com');
  });
  it('keeps an unparsed request instead of assigning a sample destination', () => {
    const plan = parseFlightDraft('find cheap red-eye tickets next month');
    expect(plan.origin).toBe(''); expect(plan.destination).toBe('');
    expect(query(buildFlightSearch(plan).url)).toContain('cheap red-eye tickets next month');
  });
  it('retains flexible date language and allows a destination-only search', () => {
    const plan = parseFlightDraft('flights to Porto next weekend');
    expect(plan).toMatchObject({ destination: 'Porto', details: 'next weekend' });
    expect(query(buildFlightSearch(plan).url)).toContain('to Porto');
    expect(buildFlightSearch(plan).error).toBeNull();
  });
  it('rejects reversed return dates, while allowing same-day and one-way flights', () => {
    const plan = { ...parseFlightDraft('flights to Tokyo'), departure: '2026-11-10', returnDate: '2026-11-09' };
    expect(flightDateError(plan)).toContain('on or after');
    expect(buildFlightSearch(plan).url).toBeNull();
    expect(flightDateError({ ...plan, returnDate: plan.departure })).toBeNull();
    const oneWay = buildFlightSearch({ ...plan, trip: 'one-way' });
    expect(oneWay.error).toBeNull(); expect(query(oneWay.url)).not.toContain('2026-11-09');
  });
  it('blocks missing departure for a return and invalid passenger counts', () => {
    const plan = parseFlightDraft('flights to Tokyo');
    expect(buildFlightSearch({ ...plan, returnDate: '2026-11-10' }).url).toBeNull();
    for (const passengers of ['', '0', '2.5', '10', 'Infinity']) expect(buildFlightSearch({ ...plan, passengers }).url).toBeNull();
    expect(buildFlightSearch(parseFlightDraft('flights')).url).toBeNull();
  });
  it('safely encodes editable locations and keeps all preferences in q', () => {
    const plan = { ...parseFlightDraft('flights'), origin: 'São Paulo & coast', destination: 'Tokyo #1?test=ok', departure: '2026-12-01', returnDate: '2026-12-08', passengers: '3', cabin: 'Premium economy' as const };
    const result = buildFlightSearch(plan);
    const url = new URL(result.url!);
    expect(url.hash).toBe(''); expect(url.searchParams.has('test')).toBe(false);
    expect(url.searchParams.get('q')).toContain('São Paulo & coast');
    expect(url.searchParams.get('q')).toContain('Tokyo #1?test=ok');
    expect(url.searchParams.get('q')).toContain('3 passengers premium economy class');
  });
});

describe('hotel stay', () => {
  it('extracts the curated destinations and amenity', () => {
    expect(parseHotelDraft('hotels in Tokyo for 2 guests')).toMatchObject({ destination: 'Tokyo', guests: '2', details: '', checkIn: '', checkOut: '' });
    expect(parseHotelDraft('hotels in Singapore with a pool')).toMatchObject({ destination: 'Singapore', amenities: ['Pool'], details: '' });
  });
  it('keeps a landmark proximity search and negative requirements intact', () => {
    const plan = parseHotelDraft('hotels near Tokyo Station without a pool');
    expect(plan.destination).toBe('near Tokyo Station'); expect(plan.amenities).toEqual([]);
    expect(query(buildHotelSearch(plan).url)).toContain('hotels near Tokyo Station');
    expect(query(buildHotelSearch(plan).url)).toContain('without a pool');
  });
  it('encodes the complete selected stay without claiming availability', () => {
    const plan = { ...parseHotelDraft('4-star hotels in Kyoto for 4 guests 2 rooms with breakfast'), checkIn: '2026-11-02', checkOut: '2026-11-05' };
    const q = query(buildHotelSearch(plan).url);
    for (const expected of ['hotels in Kyoto', 'check-in 2026-11-02', 'check-out 2026-11-05', '3 nights', '4 guests', '2 rooms', '4-star', 'breakfast included']) expect(q).toContain(expected);
  });
  it('requires a complete positive date range or no dates', () => {
    const plan = parseHotelDraft('hotels in Tokyo');
    expect(hotelDateError(plan)).toBeNull();
    expect(buildHotelSearch({ ...plan, checkIn: '2026-11-01' }).url).toBeNull();
    expect(buildHotelSearch({ ...plan, checkOut: '2026-11-01' }).url).toBeNull();
    expect(buildHotelSearch({ ...plan, checkIn: '2026-11-01', checkOut: '2026-11-01' }).url).toBeNull();
    expect(buildHotelSearch({ ...plan, checkIn: '2026-11-02', checkOut: '2026-11-01' }).url).toBeNull();
  });
  it('rejects impossible occupancy and keeps unknown requests useful', () => {
    const plan = parseHotelDraft('quiet boutique accommodation for my anniversary');
    expect(plan.destination).toBe('');
    expect(query(buildHotelSearch(plan).url)).toContain('quiet boutique accommodation for my anniversary');
    expect(buildHotelSearch({ ...plan, guests: '2', rooms: '3' }).url).toBeNull();
    expect(buildHotelSearch({ ...plan, guests: 'NaN' }).url).toBeNull();
    expect(buildHotelSearch(parseHotelDraft('hotels')).url).toBeNull();
  });
});

describe('shopping preferences', () => {
  it.each([
    ['noise cancelling headphones under $200', 'noise cancelling headphones', '', '200', 'USD'],
    ['running shoes between $50 and $150', 'running shoes', '50', '150', 'USD'],
    ['running shoes $50 to $150', 'running shoes', '50', '150', 'USD'],
    ['desk lamp under SGD 80', 'desk lamp', '', '80', 'SGD'],
    ['buy a backpack under £75', 'a backpack', '', '75', 'GBP'],
  ])('extracts the budget from %s', (draft, product, minPrice, maxPrice, currency) => expect(parseShoppingDraft(draft)).toMatchObject({ product, minPrice, maxPrice, currency }));
  it('does not mistake sizes or mixed currencies for a price range', () => {
    expect(parseShoppingDraft('running shoes sizes 8 to 10')).toMatchObject({ product: 'running shoes sizes 8 to 10', minPrice: '', maxPrice: '' });
    expect(parseShoppingDraft('camera between USD 50 and EUR 100')).toMatchObject({ product: 'camera between USD 50 and EUR 100', minPrice: '', maxPrice: '' });
  });
  it('encodes every chosen preference in a genuine Shopping link', () => {
    const plan = { ...parseShoppingDraft('refurbished headphones under $200'), minPrice: '80', category: 'Electronics' as const, sort: 'Price: low to high' as const };
    const result = buildShoppingSearch(plan);
    const url = new URL(result.url!);
    expect(url.origin).toBe('https://www.google.com'); expect(url.searchParams.get('tbm')).toBe('shop');
    for (const expected of ['headphones', 'electronics', 'refurbished condition', 'USD 80 to 200', 'sort by price low to high']) expect(query(result.url)).toContain(expected);
  });
  it.each([['200', '100'], ['-1', '200'], ['', '1e308'], ['', 'Infinity'], ['abc', ''], ['', '1.234']])('blocks invalid budget %s–%s', (minPrice, maxPrice) => {
    const plan = { ...parseShoppingDraft('headphones'), minPrice, maxPrice };
    expect(shoppingBudgetError(plan)).not.toBeNull(); expect(buildShoppingSearch(plan).url).toBeNull();
  });
  it('permits zero, one-sided or unbounded prices and rejects an empty product', () => {
    const plan = parseShoppingDraft('ceramic bowls');
    expect(query(buildShoppingSearch(plan).url)).toContain('prices in USD');
    expect(query(buildShoppingSearch({ ...plan, minPrice: '0', maxPrice: '0' }).url)).toContain('USD 0 to 0');
    expect(query(buildShoppingSearch({ ...plan, minPrice: '20' }).url)).toContain('at least USD 20');
    expect(buildShoppingSearch({ ...plan, product: '  ' }).url).toBeNull();
  });
});
