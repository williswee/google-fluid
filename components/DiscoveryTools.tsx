'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Check, Film, Image as ImageIcon, MapPin, Maximize2, X } from 'lucide-react';
import {
  CITIES, buildImageSearchUrl, buildVideoSearchUrl,
  buildMapSearchUrl, buildOpenStreetMapEmbedUrl, buildOpenStreetMapUrl,
  type CityId, type MapZoom, type ImageAspect, type ImageColor,
  type VideoDuration, type VideoSource, type VideoDate,
} from '../lib/discovery-tools';
import './discovery-tools.css';

type DiscoveryMode = 'video' | 'images' | 'places';
type ImageSubject = 'earth' | 'moon';

const IMAGE_SOURCES = {
  earth: {
    title: 'The Blue Marble',
    subtitle: 'Earth, photographed by the Apollo 17 crew',
    alt: 'Earth against black space, with Africa, Antarctica and swirling white clouds visible.',
    image: 'https://www.nasa.gov/wp-content/uploads/2023/03/as17-148-22727_lrg.jpg?w=1041',
    source: 'https://science.nasa.gov/resource/the-blue-marble/',
    credit: 'NASA Johnson Space Center',
    description: 'A photograph taken on December 7, 1972, during Apollo 17.',
  },
  moon: {
    title: 'Moon mosaic',
    subtitle: 'A full-Moon mosaic from LRO photographs',
    alt: 'A detailed full-Moon photographic mosaic showing bright cratered terrain and darker lunar plains.',
    image: 'https://svs.gsfc.nasa.gov/vis/a000000/a005000/a005001/moon_mosaic_print.jpg',
    source: 'https://svs.gsfc.nasa.gov/5001/',
    credit: 'NASA’s Scientific Visualization Studio',
    description: 'A mosaic of 1,231 images taken by Lunar Reconnaissance Orbiter in 2018.',
  },
} as const;

function ExternalLink({href, children, secondary = false}: {href: string; children: ReactNode; secondary?: boolean}) {
  return <a className={'dt-link' + (secondary ? ' dt-link-secondary' : '')} href={href} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={16} aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a>;
}

function subjectFromDraft(draft: string): ImageSubject | null {
  const subject = draft.toLowerCase().replace(/[?.!,]/g, ' ').replace(/\b(?:search|find|show|me|some|images?|photos?|pictures?|photographs?|of|the|please)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (['earth', 'planet earth', 'earth from space', 'blue marble'].includes(subject)) return 'earth';
  if (['moon', 'full moon', 'earth’s moon', "earth's moon"].includes(subject)) return 'moon';
  return null;
}

function CuratedPhoto({subject, aspect, color, fit}: {subject: ImageSubject; aspect: ImageAspect; color: ImageColor; fit: 'contain' | 'cover'}) {
  const [failed, setFailed] = useState(false);
  const item = IMAGE_SOURCES[subject];
  return <figure className="dt-photo">
    <div className="dt-photo-frame" data-aspect={aspect} data-tone={color}>
      {failed ? <div className="dt-photo-error" role="status"><ImageIcon size={30} aria-hidden="true"/><span>This image couldn’t load.</span><ExternalLink href={item.source} secondary>View it at NASA</ExternalLink></div> :
        <img src={item.image} alt={item.alt} referrerPolicy="no-referrer" decoding="async" style={{objectFit: fit}} onError={() => setFailed(true)}/>}
    </div>
    <figcaption><strong>{item.title}</strong><span>{item.subtitle}</span><span className="dt-photo-credit">Credit: {item.credit}</span></figcaption>
  </figure>;
}

function ImageSearch({draft}: {draft: string}) {
  const [subject, setSubject] = useState<ImageSubject | null>(() => subjectFromDraft(draft));
  const [aspect, setAspect] = useState<ImageAspect>('wide');
  const [color, setColor] = useState<ImageColor>('any');
  const [fit, setFit] = useState<'contain' | 'cover'>('contain');
  useEffect(() => setSubject(subjectFromDraft(draft)), [draft]);

  return <section className="discovery-tools dt-images" aria-label="Image search tools">
    <div className="dt-heading"><h2 className="dt-title">A different point of view.</h2><span>Image search</span></div>
    <div className="dt-image-layout">
      <div className="dt-image-preview">
        <div className="dt-preview-topline"><span>Curated NASA preview</span><div role="group" aria-label="Curated image subject"><button type="button" aria-pressed={subject === 'earth'} onClick={() => setSubject('earth')}>Earth</button><button type="button" aria-pressed={subject === 'moon'} onClick={() => setSubject('moon')}>Moon</button></div></div>
        {subject ? <CuratedPhoto key={subject} subject={subject} aspect={aspect} color={color} fit={fit}/> : <div className="dt-image-empty"><ImageIcon size={38} strokeWidth={1.3} aria-hidden="true"/><p>Choose Earth or Moon to try a curated preview.</p><span>Your search can be about anything.</span></div>}
      </div>
      <div className="dt-image-controls">
        <label className="dt-field"><span>Image shape</span><select value={aspect} onChange={event => setAspect(event.target.value as ImageAspect)}><option value="any">Any shape</option><option value="wide">Wide</option><option value="square">Square</option><option value="tall">Tall</option></select></label>
        <label className="dt-field"><span>Color</span><select value={color} onChange={event => setColor(event.target.value as ImageColor)}><option value="any">Any color</option><option value="color">Full color</option><option value="gray">Black and white</option></select></label>
        <label className="dt-field"><span>Preview layout</span><select value={fit} onChange={event => setFit(event.target.value as 'contain' | 'cover')}><option value="contain">Fit whole image</option><option value="cover">Fill the frame</option></select></label>
        <p className="dt-note">Shape and color filter your search. Layout changes only this preview.</p>
      </div>
    </div>
    <div className="dt-footer"><ExternalLink href={buildImageSearchUrl(draft, {aspect, color})}>Search Google Images</ExternalLink><span>Previews are curated, not live search results.</span></div>
    {subject && <details className="dt-details"><summary>About this image</summary><p>{IMAGE_SOURCES[subject].description} The preview may be cropped or shown in black and white using the controls above. <a href={IMAGE_SOURCES[subject].source} target="_blank" rel="noopener noreferrer">View the NASA source<span className="sr-only"> (opens in a new tab)</span></a>.</p></details>}
  </section>;
}

const DURATIONS: {id: VideoDuration; label: string; detail: string; cells: number}[] = [
  {id: 'any', label: 'Any length', detail: 'No limit', cells: 4},
  {id: 'short', label: 'Short', detail: 'Under 4 min', cells: 1},
  {id: 'medium', label: 'Medium', detail: '4–20 min', cells: 2},
  {id: 'long', label: 'Long', detail: 'Over 20 min', cells: 3},
];
const SOURCES: Record<VideoSource, string> = {any: 'Any source', youtube: 'YouTube', vimeo: 'Vimeo'};
const DATES: Record<VideoDate, string> = {any: 'Any time', day: 'Past 24 hours', week: 'Past week', month: 'Past month', year: 'Past year'};

function VideoSearch({draft}: {draft: string}) {
  const [duration, setDuration] = useState<VideoDuration>('any');
  const [source, setSource] = useState<VideoSource>('any');
  const [date, setDate] = useState<VideoDate>('any');
  const selection = DURATIONS.find(item => item.id === duration)!;
  return <section className="discovery-tools dt-video" aria-label="Video search tools">
    <div className="dt-heading"><h2 className="dt-title">Find your next watch.</h2><span>Video search</span></div>
    <div className="dt-video-brief">
      <div className="dt-video-icon" aria-hidden="true"><Film size={31} strokeWidth={1.3}/></div>
      <div><span className="dt-brief-label">Your search preview</span><p>{draft.trim() || 'Choose a video topic'}</p><span>{selection.label} · {SOURCES[source]} · {DATES[date]}</span></div>
    </div>
    <fieldset className="dt-duration"><legend>How much time do you have?</legend><div className="dt-duration-options">
      {DURATIONS.map(item => <button type="button" key={item.id} aria-pressed={duration === item.id} onClick={() => setDuration(item.id)}>
        <span className="dt-film-strip" data-length={item.cells} aria-hidden="true">{[0, 1, 2, 3].map(index => <i className={index < item.cells ? 'is-filled' : ''} key={index}/>)}</span>
        <span className="dt-duration-label">{item.label}{duration === item.id && <Check size={14} aria-hidden="true"/>}</span><span className="dt-duration-detail">{item.detail}</span>
      </button>)}
    </div></fieldset>
    <div className="dt-video-filters">
      <label className="dt-field"><span>Source</span><select value={source} onChange={event => setSource(event.target.value as VideoSource)}>{Object.entries(SOURCES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="dt-field"><span>Posted</span><select value={date} onChange={event => setDate(event.target.value as VideoDate)}>{Object.entries(DATES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <div className="dt-footer"><ExternalLink href={buildVideoSearchUrl(draft, {duration, source, date})}>Search Google Videos</ExternalLink><span>Your filters travel with the search. Results open on Google.</span></div>
  </section>;
}

function cityFromDraft(draft: string): CityId {
  return /\b(?:tokyo|shibuya|shinjuku)\b|東京/i.test(draft) ? 'tokyo' : 'singapore';
}

function PlacesSearch({draft}: {draft: string}) {
  const [city, setCity] = useState<CityId>(() => cityFromDraft(draft));
  const [zoom, setZoom] = useState<MapZoom>('city');
  const [destination, setDestination] = useState(draft);
  const [category, setCategory] = useState('');
  const [mapRequested, setMapRequested] = useState(false);
  const mapAction = useRef<HTMLButtonElement>(null);
  const moveMapFocus = useRef(false);
  useEffect(() => {
    if (moveMapFocus.current) { mapAction.current?.focus(); moveMapFocus.current = false; }
  }, [mapRequested]);
  function toggleMap() { moveMapFocus.current = true; setMapRequested(value => !value); }
  useEffect(() => { setDestination(draft); setCity(cityFromDraft(draft)); }, [draft]);
  const cityLabel = CITIES[city].label;
  return <section className="discovery-tools dt-places" aria-label="Places search tools">
    <div className="dt-heading"><h2 className="dt-title">Get a feel for the place.</h2><span>Map explorer</span></div>
    <div className="dt-map-toolbar">
      <div className="dt-city-choices" role="group" aria-label="Map preview city">{Object.values(CITIES).map(item => <button type="button" key={item.id} aria-pressed={city === item.id} onClick={() => setCity(item.id)}>{item.label}</button>)}</div>
      <label className="dt-field dt-zoom-field"><span className="sr-only">Map zoom</span><select aria-label="Map zoom" value={zoom} onChange={event => setZoom(event.target.value as MapZoom)}><option value="city">City view</option><option value="neighborhood">Closer view</option></select></label>
    </div>
    <div className="dt-map-stage">
      {mapRequested ? <iframe key={city + zoom} title={cityLabel + ' interactive OpenStreetMap'} src={buildOpenStreetMapEmbedUrl(city, zoom)} referrerPolicy="no-referrer" loading="eager"/> : <div className="dt-map-consent">
        <MapPin size={37} strokeWidth={1.3} aria-hidden="true"/><strong>Explore {cityLabel}</strong><p>Load an interactive map from OpenStreetMap.</p><button ref={mapAction} className="dt-button" type="button" onClick={toggleMap}>Load map</button><span>Connects to OpenStreetMap when you choose.</span>
      </div>}
    </div>
    <div className="dt-map-caption"><span>Preview area: {cityLabel}{zoom === 'neighborhood' ? ' centre' : ''}</span>{mapRequested ? <button ref={mapAction} className="dt-text-button" type="button" onClick={toggleMap}><X size={14} aria-hidden="true"/> Close map</button> : <span>Singapore and Tokyo previews</span>}</div>
    {mapRequested && <div className="dt-map-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors<span className="sr-only"> (opens in a new tab)</span></a><a href={buildOpenStreetMapUrl(city, zoom)} target="_blank" rel="noopener noreferrer"><Maximize2 size={13} aria-hidden="true"/> Open larger map<span className="sr-only"> (opens in a new tab)</span></a></div>}
    <div className="dt-place-search">
      <label className="dt-field"><span>Your destination or search</span><input value={destination} onChange={event => setDestination(event.target.value)} placeholder="A place, neighborhood or city"/></label>
      <label className="dt-field"><span>Place type</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="">All places</option><option value="cafes">Cafes</option><option value="restaurants">Restaurants</option><option value="parks">Parks</option><option value="museums">Museums</option></select></label>
    </div>
    <div className="dt-footer"><ExternalLink href={buildMapSearchUrl(destination, city, category)}>Search Google Maps</ExternalLink><span>The map shows the selected city. Search opens destination results.</span></div>
  </section>;
}

export default function DiscoveryTools({mode, draft}: {mode: DiscoveryMode; draft: string}) {
  if (mode === 'images') return <ImageSearch draft={draft}/>;
  if (mode === 'video') return <VideoSearch draft={draft}/>;
  return <PlacesSearch draft={draft}/>;
}
