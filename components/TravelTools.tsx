'use client';

import { useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeftRight, ArrowUpRight, BedDouble, Check, ChevronDown, Coffee, MapPin, PawPrint, Plane, ShoppingBag, Waves, Wifi } from 'lucide-react';
import {
  addNights, buildFlightSearch, buildHotelSearch, buildShoppingSearch, CABINS, flightDateError, HOTEL_AMENITIES,
  hotelDateError, isoDay, parseFlightDraft, parseHotelDraft, parseShoppingDraft, SHOP_CATEGORIES,
  SHOP_CONDITIONS, SHOP_CURRENCIES, SHOP_SORTS, shoppingBudgetError, stayNights,
  type FlightPlan, type HotelPlan, type SearchPlan, type ShoppingPlan,
} from '../lib/travel-tools';
import './travel-tools.css';

type Props = { mode: 'flights' | 'hotels' | 'shopping'; draft: string };
function useDraftPlan<T>(draft: string, parse: (value: string) => T): [T, Dispatch<SetStateAction<T>>] {
  const [plan, setPlan] = useState(() => parse(draft));
  const previousDraft = useRef(draft);
  useEffect(() => {
    if (previousDraft.current !== draft) { previousDraft.current = draft; setPlan(parse(draft)); }
  }, [draft, parse]);
  return [plan, setPlan];
}
function SearchAction({ result, label, errorId }: { result: SearchPlan; label: string; errorId: string }) {
  return <div className="travel-search-action">
    {result.error && <p id={errorId} className="travel-error" role="status">{result.error}</p>}
    <div className="travel-action-row">
      <details className="travel-query-preview">
        <summary>Search details<ChevronDown size={15} aria-hidden="true" /></summary>
        <p>{result.query}</p>
        <small>Your choices become a Google search. Confirm the dates and filters there.</small>
      </details>
      {result.url ? <a className="travel-submit" href={result.url} target="_blank" rel="noopener noreferrer">{label}<ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only"> (opens Google in a new tab)</span></a> : <button type="button" className="travel-submit" disabled>{label}<ArrowUpRight size={17} aria-hidden="true" /></button>}
    </div>
  </div>;
}
function ExtraDetails({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <details className="travel-extra" open={value ? true : undefined}>
    <summary>More preferences<ChevronDown size={15} aria-hidden="true" /></summary>
    <label>Additional search details<textarea rows={2} maxLength={2000} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></label>
  </details>;
}
function Flights({ draft }: { draft: string }) {
  const [plan, setPlan] = useDraftPlan(draft, parseFlightDraft);
  const errorId = useId();
  const patch = (value: Partial<FlightPlan>) => setPlan(current => ({ ...current, ...value }));
  const result = buildFlightSearch(plan);
  const dateError = flightDateError(plan);
  return <section className="travel-tool flight-planner" aria-label="Flight planner">
    <div className="travel-heading"><h2>Where to next?</h2><Plane size={24} strokeWidth={1.5} aria-hidden="true" /></div>
    <div className="travel-trip-switch" role="group" aria-label="Trip type">
      <button type="button" aria-pressed={plan.trip === 'round-trip'} onClick={() => patch({ trip: 'round-trip' })}>Round trip</button>
      <button type="button" aria-pressed={plan.trip === 'one-way'} onClick={() => patch({ trip: 'one-way' })}>One way</button>
    </div>
    <div className="travel-route">
      <label>From<input aria-label="Flight origin" placeholder="City or airport" value={plan.origin} maxLength={160} onChange={event => patch({ origin: event.target.value })} /></label>
      <button type="button" className="travel-swap" aria-label="Swap origin and destination" onClick={() => setPlan(current => ({ ...current, origin: current.destination, destination: current.origin }))}><ArrowLeftRight size={20} aria-hidden="true" /></button>
      <label>To<input aria-label="Flight destination" placeholder="Where are you going?" value={plan.destination} maxLength={160} onChange={event => patch({ destination: event.target.value })} /></label>
    </div>
    <div className="travel-fields travel-date-pair">
      <label>Departure<input aria-label="Departure date" type="date" value={plan.departure} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? errorId : undefined} onChange={event => patch({ departure: event.target.value })} /></label>
      <label>Return<input aria-label="Return date" type="date" value={plan.returnDate} min={plan.departure || undefined} disabled={plan.trip === 'one-way'} aria-invalid={plan.trip === 'round-trip' && Boolean(dateError)} aria-describedby={dateError ? errorId : undefined} onChange={event => patch({ returnDate: event.target.value })} /></label>
    </div>
    <div className="travel-fields travel-flight-options">
      <label>Passengers<input aria-label="Passengers" type="number" min="1" max="9" step="1" value={plan.passengers} onChange={event => patch({ passengers: event.target.value })} /></label>
      <label>Cabin<select aria-label="Cabin" value={plan.cabin} onChange={event => patch({ cabin: event.target.value as FlightPlan['cabin'] })}>{CABINS.map(cabin => <option key={cabin}>{cabin}</option>)}</select></label>
      <button type="button" className="travel-text-button" disabled={!plan.departure && !plan.returnDate} onClick={() => patch({ departure: '', returnDate: '' })}>Flexible dates</button>
    </div>
    <ExtraDetails value={plan.details} onChange={details => patch({ details })} placeholder="Stops, airlines, or a flexible month…" />
    <SearchAction result={result} label="Find flights" errorId={errorId} />
  </section>;
}
const AMENITY_ICONS = [Coffee, Waves, Wifi, PawPrint];
function Hotels({ draft }: { draft: string }) {
  const [plan, setPlan] = useDraftPlan(draft, parseHotelDraft);
  const errorId = useId();
  const patch = (value: Partial<HotelPlan>) => setPlan(current => ({ ...current, ...value }));
  const nights = stayNights(plan.checkIn, plan.checkOut);
  const result = buildHotelSearch(plan);
  const dateError = hotelDateError(plan);
  const nightOptions = Array.from({ length: 30 }, (_, index) => index + 1);
  if (nights && nights > 30) nightOptions.push(nights);
  return <section className="travel-tool hotel-planner" aria-label="Hotel planner">
    <div className="travel-heading"><h2>Find your place to stay.</h2><BedDouble size={26} strokeWidth={1.5} aria-hidden="true" /></div>
    <label className="travel-destination"><span>Destination or area</span><span className="travel-location-field"><MapPin size={20} aria-hidden="true" /><input aria-label="Hotel destination" value={plan.destination} placeholder="City, neighbourhood, or landmark" maxLength={160} onChange={event => patch({ destination: event.target.value })} /></span></label>
    <div className="travel-stay-dates">
      <label>Check-in<input aria-label="Check-in date" type="date" value={plan.checkIn} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? errorId : undefined} onChange={event => { const next = event.target.value; patch({ checkIn: next, ...(nights && next ? { checkOut: addNights(next, nights) ?? plan.checkOut } : {}) }); }} /></label>
      <label>Check-out<input aria-label="Check-out date" type="date" min={plan.checkIn ? addNights(plan.checkIn, 1) ?? undefined : undefined} value={plan.checkOut} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? errorId : undefined} onChange={event => patch({ checkOut: event.target.value })} /></label>
      <label className="travel-nights">Nights<select aria-label="Nights" value={nights ?? ''} disabled={isoDay(plan.checkIn) === null} onChange={event => { const checkOut = addNights(plan.checkIn, Number(event.target.value)); if (checkOut) patch({ checkOut }); }}><option value="" disabled>—</option>{nightOptions.map(night => <option key={night} value={night}>{night}</option>)}</select></label>
    </div>
    <div className="travel-fields travel-hotel-options">
      <label>Guests<input aria-label="Hotel guests" type="number" min="1" max="16" step="1" value={plan.guests} onChange={event => patch({ guests: event.target.value })} /></label>
      <label>Rooms<input aria-label="Hotel rooms" type="number" min="1" max="8" step="1" value={plan.rooms} onChange={event => patch({ rooms: event.target.value })} /></label>
      <label>Hotel class<select aria-label="Hotel class" value={plan.stars} onChange={event => patch({ stars: event.target.value as HotelPlan['stars'] })}><option value="any">Any class</option><option value="3">3 stars</option><option value="4">4 stars</option><option value="5">5 stars</option></select></label>
    </div>
    <div className="travel-amenities" role="group" aria-label="Hotel amenities">{HOTEL_AMENITIES.map((amenity, index) => {
      const Icon = AMENITY_ICONS[index]; const selected = plan.amenities.includes(amenity);
      return <button type="button" key={amenity} aria-pressed={selected} onClick={() => patch({ amenities: selected ? plan.amenities.filter(value => value !== amenity) : [...plan.amenities, amenity] })}><Icon size={17} aria-hidden="true" />{amenity}<Check size={14} className={selected ? '' : 'travel-check-hidden'} aria-hidden="true" /></button>;
    })}</div>
    <div className="travel-stay-summary"><span>{nights ? `${nights} ${nights === 1 ? 'night' : 'nights'} away` : 'Dates are flexible'}</span><button type="button" className="travel-text-button" disabled={!plan.checkIn && !plan.checkOut} onClick={() => patch({ checkIn: '', checkOut: '' })}>Clear dates</button></div>
    <ExtraDetails value={plan.details} onChange={details => patch({ details })} placeholder="A neighbourhood, accessibility, or something else…" />
    <SearchAction result={result} label="Find hotels" errorId={errorId} />
  </section>;
}
function Shopping({ draft }: { draft: string }) {
  const [plan, setPlan] = useDraftPlan(draft, parseShoppingDraft);
  const patch = (value: Partial<ShoppingPlan>) => setPlan(current => ({ ...current, ...value }));
  const errorId = useId();
  const result = buildShoppingSearch(plan);
  const budgetError = shoppingBudgetError(plan);
  const budgetLabel = budgetError ? 'Adjust your price range' : plan.minPrice && plan.maxPrice ? `${plan.currency} ${Number(plan.minPrice).toLocaleString('en-US')} – ${Number(plan.maxPrice).toLocaleString('en-US')}` : plan.maxPrice ? `Up to ${plan.currency} ${Number(plan.maxPrice).toLocaleString('en-US')}` : plan.minPrice ? `From ${plan.currency} ${Number(plan.minPrice).toLocaleString('en-US')}` : 'Room to browse.';
  return <section className="travel-tool shopping-planner" aria-label="Shopping planner">
    <div className="travel-heading"><h2>Find a better fit.</h2><ShoppingBag size={24} strokeWidth={1.5} aria-hidden="true" /></div>
    <label className="shopping-product">What are you looking for?<input aria-label="Product" value={plan.product} maxLength={2000} placeholder="A product, brand, or idea" onChange={event => patch({ product: event.target.value })} /></label>
    <div className="shopping-budget">
      <div className="shopping-budget-heading"><span>Your budget</span><span className="shopping-budget-summary">{budgetLabel}</span></div>
      <div className="travel-fields shopping-budget-fields">
        <label>Minimum<input aria-label="Minimum price" type="number" min="0" max="1000000000" step="0.01" inputMode="decimal" placeholder="No minimum" value={plan.minPrice} aria-invalid={Boolean(budgetError)} aria-describedby={budgetError ? errorId : undefined} onChange={event => patch({ minPrice: event.target.value })} /></label>
        <label>Maximum<input aria-label="Maximum price" type="number" min="0" max="1000000000" step="0.01" inputMode="decimal" placeholder="No maximum" value={plan.maxPrice} aria-invalid={Boolean(budgetError)} aria-describedby={budgetError ? errorId : undefined} onChange={event => patch({ maxPrice: event.target.value })} /></label>
        <label>Currency<select aria-label="Budget currency" value={plan.currency} onChange={event => patch({ currency: event.target.value as ShoppingPlan['currency'] })}>{SHOP_CURRENCIES.map(currency => <option key={currency}>{currency}</option>)}</select></label>
      </div>
    </div>
    <div className="shopping-condition"><span>Condition</span><div role="group" aria-label="Product condition">{SHOP_CONDITIONS.map(condition => <button type="button" key={condition} aria-pressed={plan.condition === condition} onClick={() => patch({ condition })}>{condition === 'Any condition' ? 'Any' : condition}</button>)}</div></div>
    <div className="travel-fields shopping-filters">
      <label>Category<select aria-label="Shopping category" value={plan.category} onChange={event => patch({ category: event.target.value as ShoppingPlan['category'] })}>{SHOP_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
      <label>Sort preference<select aria-label="Shopping sort" value={plan.sort} onChange={event => patch({ sort: event.target.value as ShoppingPlan['sort'] })}>{SHOP_SORTS.map(sort => <option key={sort}>{sort}</option>)}</select></label>
    </div>
    <SearchAction result={result} label="Explore shopping" errorId={errorId} />
  </section>;
}
export default function TravelTools({ mode, draft }: Props) {
  if (mode === 'flights') return <Flights draft={draft} />;
  if (mode === 'hotels') return <Hotels draft={draft} />;
  return <Shopping draft={draft} />;
}
