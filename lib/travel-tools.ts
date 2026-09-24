export const CABINS = ['Economy', 'Premium economy', 'Business', 'First'] as const;
export const HOTEL_AMENITIES = ['Breakfast included', 'Pool', 'Free Wi-Fi', 'Pet-friendly'] as const;
export const SHOP_CATEGORIES = ['All categories', 'Electronics', 'Home & garden', 'Clothing & shoes', 'Sports & outdoors', 'Books'] as const;
export const SHOP_CONDITIONS = ['Any condition', 'New', 'Used', 'Refurbished'] as const;
export const SHOP_SORTS = ['Relevance', 'Price: low to high', 'Price: high to low', 'Best rated'] as const;
export const SHOP_CURRENCIES = ['USD', 'SGD', 'EUR', 'GBP', 'JPY'] as const;

export type FlightPlan = {
  origin: string; destination: string; trip: 'round-trip' | 'one-way';
  departure: string; returnDate: string; passengers: string;
  cabin: typeof CABINS[number]; details: string;
};
export type HotelPlan = {
  destination: string; checkIn: string; checkOut: string; guests: string; rooms: string;
  stars: 'any' | '3' | '4' | '5'; amenities: string[]; details: string;
};
export type ShoppingPlan = {
  product: string; minPrice: string; maxPrice: string; currency: typeof SHOP_CURRENCIES[number];
  category: typeof SHOP_CATEGORIES[number]; condition: typeof SHOP_CONDITIONS[number]; sort: typeof SHOP_SORTS[number];
};
export type SearchPlan = { query: string; url: string | null; error: string | null };

const DAY = 86_400_000;
function clean(text: string) { return text.replace(/\s+/g, ' ').trim(); }
function remainder(text: string) {
  return clean(text.replace(/\b(?:please|find|show me|search for|flights?|airfares?|hotels?)\b/gi, ' ').replace(/\s*[,;]\s*/g, ' ').replace(/^(?:on|from|to|until|and|for|in)\s+|\s+(?:on|from|to|until|and|for|in)$/gi, ' '));
}
export function isoDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1000 || year > 9999) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date.getTime() : null;
}
export function stayNights(checkIn: string, checkOut: string): number | null {
  const first = isoDay(checkIn); const last = isoDay(checkOut);
  return first !== null && last !== null && last > first ? (last - first) / DAY : null;
}
export function addNights(checkIn: string, nights: number): string | null {
  const first = isoDay(checkIn);
  if (first === null || !Number.isInteger(nights) || nights < 1 || nights > 365) return null;
  const value = new Date(first + nights * DAY).toISOString().slice(0, 10);
  return isoDay(value) !== null ? value : null;
}
export function flightDateError(plan: Pick<FlightPlan, 'departure' | 'returnDate' | 'trip'>): string | null {
  if (plan.departure && isoDay(plan.departure) === null) return 'Choose a valid departure date.';
  if (plan.trip === 'one-way') return null;
  if (plan.returnDate && isoDay(plan.returnDate) === null) return 'Choose a valid return date.';
  if (plan.returnDate && !plan.departure) return 'Choose a departure date before adding a return.';
  if (plan.returnDate && plan.departure && plan.returnDate < plan.departure) return 'Return must be on or after departure.';
  return null;
}
export function hotelDateError(plan: Pick<HotelPlan, 'checkIn' | 'checkOut'>): string | null {
  if (plan.checkIn && isoDay(plan.checkIn) === null) return 'Choose a valid check-in date.';
  if (plan.checkOut && isoDay(plan.checkOut) === null) return 'Choose a valid check-out date.';
  if (Boolean(plan.checkIn) !== Boolean(plan.checkOut)) return 'Choose both dates, or clear them for a flexible stay.';
  if (plan.checkIn && plan.checkOut <= plan.checkIn) return 'Check-out must be after check-in.';
  return null;
}
function validCount(value: string, max: number) { return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= max; }
function searchResult(query: string, error: string | null, shopping = false): SearchPlan {
  const url = new URL('https://www.google.com/search');
  url.searchParams.set('q', query);
  if (shopping) url.searchParams.set('tbm', 'shop');
  return { query, error, url: error ? null : url.toString() };
}
function takeDates(text: string) {
  const dates: string[] = [];
  const rest = text.replace(/\b(?:departing|returning|check[ -]?in|check[ -]?out|on|from|to|until)?\s*(\d{4}-\d{2}-\d{2})\b/gi, (whole, date: string) => {
    if (dates.length === 2) return whole;
    dates.push(date); return ' ';
  });
  return { dates, rest };
}
const LOCATION_END = String.raw`(?=\s+(?:next|this|with|without|under|near|on|in|for|during|departing|returning|after|before|at|between)\b|[,;]|$)`;

export function parseFlightDraft(draft: string): FlightPlan {
  const { dates, rest } = takeDates(draft);
  const plan: FlightPlan = { origin: '', destination: '', trip: 'round-trip', departure: dates[0] ?? '', returnDate: dates[1] ?? '', passengers: '1', cabin: 'Economy', details: '' };
  let text = rest.replace(/\bone[ -]way\b/gi, () => { plan.trip = 'one-way'; return ' '; }).replace(/\bround[ -]trip\b/gi, ' ');
  text = text.replace(/\b(?:for\s+)?(\d+)\s+(?:passengers?|adults?|people)\b/gi, (_, count: string) => { plan.passengers = count; return ' '; });
  text = text.replace(/\b(premium economy|economy|business(?: class)?|first class)\b/gi, (_, cabin: string) => {
    plan.cabin = cabin.toLowerCase().startsWith('premium') ? 'Premium economy' : cabin.toLowerCase().startsWith('business') ? 'Business' : cabin.toLowerCase().startsWith('first') ? 'First' : 'Economy'; return ' ';
  });
  const route = new RegExp(String.raw`\bfrom\s+(.+?)\s+to\s+(.+?)${LOCATION_END}`, 'i');
  text = text.replace(route, (_, origin: string, destination: string) => { plan.origin = clean(origin); plan.destination = clean(destination); return ' '; });
  if (!plan.destination) {
    text = text.replace(/^\s*(.+?)\s+to\s+(.+?)\s+flights?\s*$/i, (_, origin: string, destination: string) => { plan.origin = clean(origin); plan.destination = clean(destination); return ' '; });
  }
  if (!plan.destination) {
    text = text.replace(new RegExp(String.raw`\bto\s+(.+?)${LOCATION_END}`, 'i'), (_, destination: string) => { plan.destination = clean(destination); return ' '; });
  }
  plan.details = remainder(text);
  return plan;
}
export function buildFlightSearch(plan: FlightPlan): SearchPlan {
  const error = flightDateError(plan) ?? (!validCount(plan.passengers, 9) ? 'Choose between 1 and 9 passengers.' : !clean(plan.origin) && !clean(plan.destination) && !clean(plan.details) ? 'Enter an origin or destination to start your search.' : null);
  const query = clean([
    'flights', plan.origin && `from ${clean(plan.origin)}`, plan.destination && `to ${clean(plan.destination)}`,
    plan.trip === 'one-way' ? 'one-way' : 'round-trip',
    plan.departure ? `departing ${plan.departure}` : 'flexible departure dates',
    plan.trip === 'round-trip' && (plan.returnDate ? `returning ${plan.returnDate}` : 'flexible return dates'),
    `${plan.passengers} ${plan.passengers === '1' ? 'passenger' : 'passengers'}`, `${plan.cabin.toLowerCase()} class`, plan.details,
  ].filter(Boolean).join(' '));
  return searchResult(query, error);
}

export function parseHotelDraft(draft: string): HotelPlan {
  const { dates, rest } = takeDates(draft);
  const plan: HotelPlan = { destination: '', checkIn: dates[0] ?? '', checkOut: dates[1] ?? '', guests: '2', rooms: '1', stars: 'any', amenities: [], details: '' };
  let text = rest.replace(/\b(?:for\s+)?(\d+)\s+(?:guests?|adults?|people)\b/gi, (_, count: string) => { plan.guests = count; return ' '; });
  text = text.replace(/\b(\d+)\s+rooms?\b/gi, (_, count: string) => { plan.rooms = count; return ' '; });
  text = text.replace(/\b([345])[ -]star\b/gi, (_, stars: HotelPlan['stars']) => { plan.stars = stars; return ' '; });
  const amenities: [RegExp, string][] = [[/\bwith (?:free )?breakfast\b/gi, 'Breakfast included'], [/\bwith (?:a )?pool\b/gi, 'Pool'], [/\bwith (?:free )?wi[ -]?fi\b/gi, 'Free Wi-Fi'], [/\bpet[ -]friendly\b/gi, 'Pet-friendly']];
  for (const [pattern, amenity] of amenities) {
    if (!/\b(?:no|not|without)\b/i.test(text)) text = text.replace(pattern, () => { plan.amenities.push(amenity); return ' '; });
  }
  text = text.replace(new RegExp(String.raw`\b(in|near)\s+(.+?)${LOCATION_END}`, 'i'), (_, relation: string, destination: string) => { plan.destination = clean(`${relation.toLowerCase() === 'near' ? 'near ' : ''}${destination}`); return ' '; });
  plan.details = remainder(text);
  return plan;
}
export function buildHotelSearch(plan: HotelPlan): SearchPlan {
  const error = hotelDateError(plan) ?? (!validCount(plan.guests, 16) ? 'Choose between 1 and 16 guests.' : !validCount(plan.rooms, 8) ? 'Choose between 1 and 8 rooms.' : Number(plan.rooms) > Number(plan.guests) ? 'Use at least one guest per room.' : !clean(plan.destination) && !clean(plan.details) ? 'Enter a destination to find a place to stay.' : null);
  const destination = clean(plan.destination);
  const query = clean([
    'hotels', destination && `${/^near\b/i.test(destination) ? '' : 'in '}${destination}`,
    plan.checkIn && `check-in ${plan.checkIn}`, plan.checkOut && `check-out ${plan.checkOut}`,
    !plan.checkIn && !plan.checkOut && 'flexible dates',
    stayNights(plan.checkIn, plan.checkOut) && `${stayNights(plan.checkIn, plan.checkOut)} nights`,
    `${plan.guests} ${plan.guests === '1' ? 'guest' : 'guests'}`, `${plan.rooms} ${plan.rooms === '1' ? 'room' : 'rooms'}`,
    plan.stars !== 'any' && `${plan.stars}-star`, ...plan.amenities.map(amenity => amenity.toLowerCase()), plan.details,
  ].filter(Boolean).join(' '));
  return searchResult(query, error);
}

export function parseShoppingDraft(draft: string): ShoppingPlan {
  const plan: ShoppingPlan = { product: '', minPrice: '', maxPrice: '', currency: 'USD', category: 'All categories', condition: 'Any condition', sort: 'Relevance' };
  let text = draft.replace(/^\s*(?:shop(?:ping)? for|buy|find|shopping)\s+/i, '');
  const money = String.raw`(?:(USD|SGD|EUR|GBP|JPY|S\$|\$|£|€|¥)\s*)?(\d+(?:\.\d{1,2})?)`;
  const applyCurrency = (value?: string) => { if (value) plan.currency = ({ '$': 'USD', 'S$': 'SGD', '£': 'GBP', '€': 'EUR', '¥': 'JPY' }[value.toUpperCase()] ?? value.toUpperCase()) as ShoppingPlan['currency']; };
  text = text.replace(new RegExp(String.raw`(?<![\w.])(?:between\s+)?${money}\s+(?:to|and|-)\s+${money}\b`, 'i'), (_, currency1: string, min: string, currency2: string, max: string) => {
    // A currency marker is required; ordinary product measurements must stay intact.
    if (!currency1 && !currency2) return _;
    if (currency1 && currency2 && currency1.toUpperCase() !== currency2.toUpperCase()) return _;
    applyCurrency(currency1 || currency2); plan.minPrice = min; plan.maxPrice = max; return ' ';
  });
  text = text.replace(new RegExp(String.raw`\b(?:under|up to|less than|budget)\s+${money}\b`, 'i'), (_, currency: string, max: string) => { applyCurrency(currency); plan.maxPrice = max; return ' '; });
  text = text.replace(/^\s*(new|used|refurbished)\s+/i, (_, condition: string) => { plan.condition = (condition[0].toUpperCase() + condition.slice(1).toLowerCase()) as ShoppingPlan['condition']; return ' '; });
  plan.product = clean(text);
  return plan;
}
export function shoppingBudgetError(plan: Pick<ShoppingPlan, 'minPrice' | 'maxPrice'>): string | null {
  const valid = (value: string) => value === '' || /^\d+(?:\.\d{1,2})?$/.test(value) && Number.isFinite(Number(value)) && Number(value) <= 1_000_000_000;
  if (!valid(plan.minPrice) || !valid(plan.maxPrice)) return 'Enter a positive price with up to two decimals, or leave it blank.';
  if (plan.minPrice && plan.maxPrice && Number(plan.maxPrice) < Number(plan.minPrice)) return 'Maximum price must be at least the minimum.';
  return null;
}
export function buildShoppingSearch(plan: ShoppingPlan): SearchPlan {
  const error = shoppingBudgetError(plan) ?? (!clean(plan.product) ? 'Enter a product to start your search.' : null);
  const budget = plan.minPrice && plan.maxPrice ? `price ${plan.currency} ${plan.minPrice} to ${plan.maxPrice}` : plan.minPrice ? `price at least ${plan.currency} ${plan.minPrice}` : plan.maxPrice ? `price up to ${plan.currency} ${plan.maxPrice}` : `prices in ${plan.currency}`;
  const sort = { Relevance: 'most relevant', 'Price: low to high': 'price low to high', 'Price: high to low': 'price high to low', 'Best rated': 'best rated' }[plan.sort];
  return searchResult(clean([plan.product, plan.category !== 'All categories' && plan.category.toLowerCase(), plan.condition !== 'Any condition' && `${plan.condition.toLowerCase()} condition`, budget, `sort by ${sort}`].filter(Boolean).join(' ')), error, true);
}
