'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, Cloud, CloudRain, CloudSun, Info, Snowflake, Sun, Sunrise, Sunset, Umbrella } from 'lucide-react';
import { ageOnMars, dictionaryWordForDraft, earthMarsQuery, FILMS, movieForDraft, PLANETS, WEATHER_CITIES, weatherCityForDraft, weatherDescription, WORDS, type FilmKey, type WeatherCity, type WeatherForecast, type WordKey } from '../lib/knowledge';
import { buildGoogleSearchUrl } from '../lib/search-syntax';
import './knowledge-tools.css';

type Props = { mode: string; draft: string; onDraft?: (value: string) => void };
function Source({ children, label = 'Source & details' }: { children: ReactNode; label?: string }) {
  return <details className="knowledge-source"><summary><Info size={14}/>{label}</summary><div>{children}</div></details>;
}
function Link({ href, children }: { href: string; children: ReactNode }) { return <a href={href} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={14}/><span className="sr-only"> (opens in a new tab)</span></a>; }
function Tabs({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="knowledge-tabs" role="group" aria-label={label}>{values.map(item => <button type="button" key={item} aria-pressed={value === item} onClick={() => onChange(item)}>{item}</button>)}</div>;
}
function Unknown({ heading, draft, children }: { heading: string; draft: string; children: ReactNode }) {
  return <div className="knowledge-unknown"><h2>{heading}</h2><Link href={buildGoogleSearchUrl(draft)}>Search this on Google</Link><div className="knowledge-samples">{children}</div></div>;
}
function WeatherIcon({ code, size = 74 }: { code: number; size?: number }) {
  const Icon = code === 0 ? Sun : code <= 2 ? CloudSun : code === 3 || code < 50 ? Cloud : [71,73,75,77,85,86].includes(code) ? Snowflake : CloudRain;
  return <Icon size={size} strokeWidth={1.4} aria-hidden="true"/>;
}
const forecastCache = new Map<WeatherCity, WeatherForecast>();
function Weather({ draft }: { draft: string }) {
  const [city, setCity] = useState<WeatherCity | ''>(weatherCityForDraft(draft) ?? '');
  const [day, setDay] = useState(/\btomorrow\b/i.test(draft) ? 1 : 0);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [fahrenheit, setFahrenheit] = useState(false);
  useEffect(() => { setCity(weatherCityForDraft(draft) ?? ''); setDay(/\btomorrow\b/i.test(draft) ? 1 : 0); }, [draft]);
  useEffect(() => {
    setError(false); setForecast(null);
    if (!city) return;
    const cached = forecastCache.get(city);
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < 15 * 60 * 1000) { setForecast(cached); return; }
    const controller = new AbortController();
    fetch(`/api/weather?city=${city}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Forecast unavailable');
      const data = await response.json() as WeatherForecast;
      if (data.city !== city || !Array.isArray(data.days) || !data.days.length) throw new Error('Forecast unavailable');
      if (!controller.signal.aborted) { forecastCache.set(city, data); setForecast(data); }
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [city, attempt]);
  const selected = forecast?.city === city ? forecast.days[day] : undefined;
  const temp = (value: number) => Math.round(fahrenheit ? value * 9 / 5 + 32 : value);
  return <div className="knowledge-weather">
    <div className="knowledge-topline"><h2>{city ? WEATHER_CITIES[city].name : 'Weather, wherever you’re going.'}</h2><select aria-label="Forecast city" value={city} onChange={event => { setCity(event.target.value as WeatherCity); setDay(0); }}><option value="" disabled>Choose city</option>{Object.entries(WEATHER_CITIES).map(([key, value]) => <option value={key} key={key}>{value.name}</option>)}</select></div>
    {!city ? <div className="knowledge-city-choice"><CloudSun size={70} strokeWidth={1.2} aria-hidden="true"/><div><p>Pick a city to see its forecast.</p><div className="knowledge-tabs"><button type="button" onClick={() => setCity('singapore')}>Singapore</button><button type="button" onClick={() => setCity('tokyo')}>Tokyo</button></div><Link href={buildGoogleSearchUrl(draft)}>Search another location</Link></div></div> : error ? <div className="knowledge-unavailable" role="status"><p>Forecast unavailable.</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Try again</button><Link href={buildGoogleSearchUrl(`${WEATHER_CITIES[city].name} weather`)}>Open Google</Link></div> : !selected ? <p className="knowledge-loading" role="status">Fetching the forecast…</p> : <>
      <div className="forecast-main"><div className="forecast-temperature"><WeatherIcon code={selected.code}/><div><div className="forecast-value">{temp(selected.high)}<span>°{fahrenheit ? 'F' : 'C'}</span></div><p>{weatherDescription(selected.code)} · Low {temp(selected.low)}°</p></div></div><button className="temperature-switch" type="button" onClick={() => setFahrenheit(value => !value)} aria-label={`Switch temperature to ${fahrenheit ? 'Celsius' : 'Fahrenheit'}`}>°{fahrenheit ? 'C' : 'F'}</button></div>
      <div className="forecast-facts"><span><Umbrella size={17}/>{selected.rain}% rain</span><span><Sunrise size={17}/>{selected.sunrise.slice(11,16)} sunrise</span><span><Sunset size={17}/>{selected.sunset.slice(11,16)} sunset</span></div>
      <div className="forecast-days" role="group" aria-label="Forecast day">{forecast!.days.map((item, index) => <button type="button" key={item.date} aria-pressed={day === index} onClick={() => setDay(index)}><span>{index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : new Date(item.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}</span><WeatherIcon code={item.code} size={25}/><strong>{temp(item.high)}°</strong></button>)}</div>
    </>}
    <Source label="Forecast source"><p>Forecast data by <Link href="https://open-meteo.com/">Open-Meteo</Link>, <Link href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</Link>. Temperatures are rounded; the large number is the daily high. Sunrise and sunset use the selected city’s local time. This prototype supports Singapore and Tokyo.</p>{forecast?.city === city && <p>Retrieved {new Date(forecast.fetchedAt).toLocaleString('en-GB', { timeZone: forecast.timezone, dateStyle: 'medium', timeStyle: 'short' })} ({forecast.timezone}). Cached for up to 15 minutes. A forecast is a model estimate, not a station observation.</p>}</Source>
  </div>;
}
function Dictionary({ draft, onDraft }: Pick<Props, 'draft' | 'onDraft'>) {
  const matched = dictionaryWordForDraft(draft);
  const [word, setWord] = useState<WordKey | null>(matched);
  const [tab, setTab] = useState('Meaning');
  useEffect(() => { setWord(matched); setTab('Meaning'); }, [draft, matched]);
  const choose = (value: WordKey) => { setWord(value); setTab('Meaning'); onDraft?.(`define:${value}`); };
  if (!word) return <Unknown heading="Find the right word." draft={draft}><span>Try an entry</span>{Object.keys(WORDS).map(key => <button type="button" key={key} onClick={() => choose(key as WordKey)}>{key}</button>)}</Unknown>;
  const entry = WORDS[word];
  return <div className="knowledge-dictionary"><div className="knowledge-topline"><h2>{entry.term}</h2><select aria-label="Dictionary word" value={word} onChange={event => choose(event.target.value as WordKey)}>{Object.keys(WORDS).map(key => <option key={key}>{key}</option>)}</select></div><p className="word-pronunciation">{entry.syllables} <span>{entry.kind}</span></p><Tabs label="Dictionary view" values={['Meaning','In a sentence','Related words']} value={tab} onChange={setTab}/><div className="dictionary-entry">{tab === 'Meaning' ? <p>{entry.meaning}</p> : tab === 'In a sentence' ? <p className="dictionary-example">“{entry.example}”</p> : <div className="related-words">{entry.related.map(term => <Link key={term} href={buildGoogleSearchUrl(`define:${term}`)}>{term}</Link>)}</div>}</div><Source><p>Curated reference entry based on <Link href={entry.source}>Merriam-Webster</Link>. Definition paraphrased for this demo; the example sentence is original. Two entries are available locally.</p></Source></div>;
}
function FilmArt({ film }: { film: FilmKey }) {
  return <svg className={`knowledge-film-art ${film}`} viewBox="0 0 132 184" fill="none" aria-hidden="true">{film === 'interstellar' ? <><rect width="132" height="184" fill="#202b42"/><circle cx="79" cy="72" r="32" stroke="#d5ddeb" strokeWidth="2"/><ellipse cx="79" cy="72" rx="54" ry="11" transform="rotate(-29 79 72)" stroke="#d5ddeb" strokeWidth="2"/><path d="M0 139C34 119 80 125 132 102V184H0Z" fill="#8c9aaa"/><path d="M0 158C38 137 85 164 132 136V184H0Z" fill="#c6ced7"/><circle cx="24" cy="27" r="1.5" fill="white"/><circle cx="104" cy="22" r="1.5" fill="white"/><circle cx="111" cy="102" r="1.5" fill="white"/></> : <><rect width="132" height="184" fill="#f0dcb4"/><circle cx="84" cy="52" r="29" fill="#ca7946"/><path d="M0 109C45 98 80 122 132 91V184H0Z" fill="#ce9f69"/><path d="M0 149C39 115 91 127 132 151V184H0Z" fill="#9a653f"/><path d="M0 164C46 152 79 178 132 162V184H0Z" fill="#573e30"/></>}</svg>;
}
function Movies({ draft, onDraft }: Pick<Props, 'draft' | 'onDraft'>) {
  const matched = movieForDraft(draft);
  const [film, setFilm] = useState<FilmKey | null>(matched);
  const [tab, setTab] = useState('Story');
  const [start, setStart] = useState('20:00');
  useEffect(() => { setFilm(matched); setTab('Story'); }, [draft, matched]);
  const choose = (key: FilmKey) => { setFilm(key); onDraft?.(`movie:${FILMS[key].title}`); };
  if (!film) return <Unknown heading="What’s on your watchlist?" draft={draft}><span>Explore a film</span>{Object.entries(FILMS).map(([key, value]) => <button type="button" key={key} onClick={() => choose(key as FilmKey)}>{value.title}</button>)}</Unknown>;
  const entry = FILMS[film];
  const endMinutes = /^\d{2}:\d{2}$/.test(start) ? (Number(start.slice(0,2)) * 60 + Number(start.slice(3)) + entry.runtime) : null;
  const end = endMinutes === null ? '—' : `${String(Math.floor(endMinutes / 60) % 24).padStart(2,'0')}:${String(endMinutes % 60).padStart(2,'0')}${endMinutes >= 1440 ? ' tomorrow' : ''}`;
  return <div className="knowledge-movie"><div className="movie-layout"><FilmArt film={film}/><div className="movie-content"><h2>{entry.title}</h2><p className="movie-facts">{entry.year} · {Math.floor(entry.runtime / 60)}h {entry.runtime % 60}m · Science fiction</p><Tabs label="Movie view" values={['Story','Cast','Plan a night']} value={tab} onChange={setTab}/><div className="movie-panel">{tab === 'Story' ? <p>{entry.synopsis}</p> : tab === 'Cast' ? <ul>{entry.cast.map(name => <li key={name}>{name}</li>)}</ul> : <div className="movie-plan"><label>Start at<input type="time" aria-label="Movie start time" value={start} onChange={event => setStart(event.target.value)}/></label><span>Ends <output aria-label="Movie end time">{end}</output></span></div>}</div><p className="movie-director">Directed by {entry.director}</p></div></div><Source><p>Curated facts from <Link href={entry.source}>{entry.sourceLabel}</Link>{film === 'dune' && <> and <Link href="https://press.wbd.com/no/media-release/warner-bros-pictures-and-legendary-pictures-return-arrakis-denis-villeneuves-dune?language_content_entity=en">Warner Bros. Pictures</Link></>}. Runtime follows this edition’s listing. Summaries and illustrations are original to this demo. The planner uses the listed runtime; it does not book a showing.</p><div className="knowledge-samples">{Object.entries(FILMS).filter(([key]) => key !== film).map(([key, value]) => <button type="button" key={key} onClick={() => choose(key as FilmKey)}>Try {value.title}</button>)}</div></Source></div>;
}
function Comparison({ draft, onDraft }: Pick<Props, 'draft' | 'onDraft'>) {
  const [metric, setMetric] = useState('A year');
  const [age, setAge] = useState('30');
  const [selectedExample, setSelectedExample] = useState(false);
  useEffect(() => { setSelectedExample(false); }, [draft]);
  if (!earthMarsQuery(draft) && !selectedExample) return <Unknown heading="Put them side by side." draft={draft}><span>Try a comparison</span><button type="button" onClick={() => { setSelectedExample(true); onDraft?.('Earth vs Mars'); }}>Earth vs Mars</button></Unknown>;
  const field = metric === 'A year' ? 'yearDays' : metric === 'A day' ? 'dayHours' : 'moons';
  const unit = metric === 'A year' ? 'Earth days' : metric === 'A day' ? 'hours per rotation' : 'natural moons';
  const max = Math.max(PLANETS.earth[field], PLANETS.mars[field]);
  const marsAge = age.trim() ? ageOnMars(Number(age)) : null;
  return <div className="knowledge-comparison"><div className="knowledge-topline"><h2>Two worlds. Different rhythms.</h2></div><Tabs label="Planet comparison" values={['A year','A day','Moons']} value={metric} onChange={setMetric}/><div className="planet-pair">{Object.entries(PLANETS).map(([key, planet]) => <div className={`planet-column ${key}`} key={key}><h3>{planet.name}</h3><div className="planet-value">{planet[field].toLocaleString('en-US')}<span>{unit}</span></div><div className="planet-measure" aria-hidden="true"><span style={{ width: `${planet[field] / max * 100}%` }}/></div></div>)}</div><div className="planet-age"><label>Your age on Earth<input type="number" min="0" max="150" step="1" value={age} onChange={event => setAge(event.target.value)} aria-label="Age in Earth years"/><span>years</span></label><div>On Mars, you’d be <output aria-label="Age in Mars years">{marsAge === null ? '—' : marsAge.toLocaleString('en-US', { maximumFractionDigits: 1 })}</output> years old.</div></div><Source><p>Reference values from NASA: <Link href={PLANETS.earth.source}>Earth facts</Link> and <Link href={PLANETS.mars.source}>Mars facts</Link>. Day length means one rotation relative to the stars. Ages divide elapsed Earth years by the ratio of orbital periods; this is a calendar comparison, not a change in ageing.</p></Source></div>;
}
export default function KnowledgeTools(props: Props) {
  switch (props.mode) { case 'weather': return <Weather draft={props.draft}/>; case 'define': return <Dictionary {...props}/>; case 'movies': return <Movies {...props}/>; case 'compare': return <Comparison {...props}/>; default: return null; }
}
