'use client';
import { useEffect, useState } from 'react';
import { ArrowLeftRight, ArrowUpRight, BookOpen, CalendarDays, CloudSun, FileText, Film, Globe2, MapPin, Newspaper, Quote, Search, TrendingUp } from 'lucide-react';
import type { ModeId } from '../lib/intent';
import { convertValue, parseConversion, UNIT_GROUPS, UNIT_LABELS, unitGroup, type Unit } from '../lib/conversion';
import { buildGoogleSearchUrl, parseSearchSyntax, upsertSearchOperator } from '../lib/search-syntax';

type Props = { mode: ModeId; draft: string; onDraft: (value: string, keepMode?: ModeId) => void };
function OutLink({query, children}: {query:string; children:React.ReactNode}) { return <a className="tool-link" href={buildGoogleSearchUrl(query)} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={16}/><span className="sr-only"> (opens Google in a new tab)</span></a>; }
function Choices({label,options,value,onChange}:{label:string;options:string[];value:string;onChange:(value:string)=>void}){return <div className="choices" role="group" aria-label={label}>{options.map(option=><button type="button" key={option} aria-pressed={value===option} onClick={()=>onChange(option)}>{option}</button>)}</div>;}
function Converter({draft}:{draft:string}) {
  const parsed = parseConversion(draft);
  const [value,setValue]=useState(String(parsed?.value??10));
  const [from,setFrom]=useState<Unit>(parsed?.from??'km');
  const [to,setTo]=useState<Unit>(parsed?.to??'mi');
  useEffect(()=>{const parsed=parseConversion(draft);if(parsed){setValue(String(parsed.value));setFrom(parsed.from);setTo(parsed.to);}},[draft]);
  const result=value.trim()?convertValue(Number(value),from,to):null;
  const group=unitGroup(from);
  const currencies=/\b(?:usd|sgd|gbp|eur|jpy|currency|dollars?|euros?|yen)\b|[$£€¥]/i.test(draft);
  if(currencies) return <div className="tool-body currency-tool"><ArrowLeftRight className="hero-tool-icon"/><div><h2>Currency exchange</h2><p>Exchange rates change. Get the current conversion on Google.</p><OutLink query={draft}>Look up the live rate</OutLink></div></div>;
  if(!parsed) return <div className="tool-body currency-tool"><ArrowLeftRight className="hero-tool-icon"/><div><h2>Find the right conversion.</h2><p>This local tool handles length, weight and temperature. Open Google for this conversion.</p><OutLink query={draft}>Convert on Google</OutLink></div></div>;
  return <div className="converter"><div className="tool-topline"><h2>Unit converter</h2><select aria-label="Measurement type" value={group} onChange={e=>{const units=UNIT_GROUPS[e.target.value as keyof typeof UNIT_GROUPS];setFrom(units[0]);setTo(units[1]);}}>{Object.keys(UNIT_GROUPS).map(g=><option key={g}>{g}</option>)}</select></div><div className="conversion-pair"><label><span className="sr-only">Amount</span><input aria-label="Amount" type="number" value={value} onChange={e=>setValue(e.target.value)}/><select aria-label="Convert from" value={from} onChange={e=>setFrom(e.target.value as Unit)}>{UNIT_GROUPS[group].map(u=><option key={u} value={u}>{UNIT_LABELS[u]}</option>)}</select></label><button type="button" className="swap-button" aria-label="Swap units" onClick={()=>{setFrom(to);setTo(from);if(result!==null)setValue(String(Number(result.toPrecision(7))));}}><ArrowLeftRight size={22}/></button><div className="conversion-result"><output aria-label="Converted value">{result===null?'—':Number(result.toPrecision(7)).toLocaleString('en-US',{maximumFractionDigits:6})}</output><select aria-label="Convert to" value={to} onChange={e=>setTo(e.target.value as Unit)}>{UNIT_GROUPS[group].map(u=><option key={u} value={u}>{UNIT_LABELS[u]}</option>)}</select></div></div><p className="tool-note">Calculated on your device{!parsed?' · Edit the values to try a conversion':''}{result===null?' · Enter a valid value':''}</p></div>;
}
function outgoingQuery(draft: string) {
  const words: Record<string, string> = { weather: 'weather', stocks: 'stock', map: '', movie: 'movie', define: 'definition', source: '' };
  return parseSearchSyntax(draft).tokens.filter(token => token.provenance === 'intent-shorthand').reverse().reduce((query, token) => query.slice(0, token.start) + [token.value, words[token.key ?? '']].filter(Boolean).join(' ') + query.slice(token.end), draft);
}
function forecastPeriod(draft: string) {
  const tokens = parseSearchSyntax(draft).tokens;
  const match = [...draft.matchAll(/\b(today|tomorrow|this week)\b/gi)].find(match => !tokens.some(token => match.index! >= token.start && match.index! < token.end));
  return match ? match[0].toLowerCase() === 'this week' ? 'This week' : match[0][0].toUpperCase() + match[0].slice(1).toLowerCase() : 'As asked';
}
function forecastQuery(draft: string, when: string) {
  if (when === 'As asked') return outgoingQuery(draft) + ' weather forecast';
  const tokens = parseSearchSyntax(draft).tokens;
  const query = draft.replace(/\b(today|tomorrow|this week)\b/gi, (word, _period, offset: number) => tokens.some(token => offset >= token.start && offset < token.end) ? word : '');
  return outgoingQuery(query).trim() + ' weather forecast ' + when.toLowerCase();
}
function Weather({draft}:Pick<Props,'draft'>) {
  const [when,setWhen] = useState(() => forecastPeriod(draft));
  useEffect(() => { setWhen(forecastPeriod(draft)); }, [draft]);
  return <div className="tool-body weather-tool"><div className="weather-art" aria-hidden="true"><CloudSun size={116} strokeWidth={1.2}/></div><div className="tool-content"><h2>Make plans around the weather.</h2><Choices label="Forecast period" options={['As asked','Today','Tomorrow','This week']} value={when} onChange={setWhen}/><OutLink query={forecastQuery(draft,when)}>Find the forecast</OutLink><p className="tool-note">Forecast opens on Google. No weather data loaded here.</p></div></div>;
}
function Finance({draft}:Pick<Props,'draft'>){const [view,setView]=useState('Price');return <div className="tool-body finance-tool"><div className="stock-symbol" aria-hidden="true"><TrendingUp size={62} strokeWidth={1.5}/><span>Markets</span></div><div className="tool-content"><h2>There’s more to a ticker.</h2><Choices label="Stock information" options={['Price','News','Earnings','Compare']} value={view} onChange={setView}/><OutLink query={outgoingQuery(draft)+' '+(view==='Compare'?'compare competitors':view.toLowerCase())}>Explore {view.toLowerCase()}</OutLink><p className="tool-note">Live prices and market information open on Google.</p></div></div>;}
function Places({draft}:Pick<Props,'draft'>){const [kind,setKind]=useState('All places');return <div className="tool-body places-tool"><div className="map-preview" aria-hidden="true"><i/><i/><i/><span className="map-park"/><MapPin className="pin pin-one" size={33}/><MapPin className="pin pin-two" size={24}/><MapPin className="pin pin-three" size={24}/><small>Explore</small></div><div className="tool-content"><h2>Take your search somewhere.</h2><Choices label="Place type" options={['All places','Cafes','Restaurants','Parks']} value={kind} onChange={setKind}/><a className="tool-link" href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(outgoingQuery(draft)+(kind==='All places'?'':' '+kind.toLowerCase()))} target="_blank" rel="noopener noreferrer">Explore on Maps<ArrowUpRight size={16}/><span className="sr-only"> (opens a new tab)</span></a><p className="tool-note">Illustrative map. Real places open in Google Maps.</p></div></div>;}
function Movies({draft}:Pick<Props,'draft'>){const [view,setView]=useState('Showtimes');return <div className="tool-body movies-tool"><div className="film-art" aria-hidden="true"><Film size={68} strokeWidth={1.2}/><span>Take a closer look.</span></div><div className="tool-content"><h2>From “what’s that film?” to movie night.</h2><Choices label="Movie information" options={['Showtimes','Trailer','Reviews','Cast']} value={view} onChange={setView}/><OutLink query={outgoingQuery(draft).replace(/\s+(showtimes|trailer|reviews|cast)\s*$/i,'').trim()+' '+view.toLowerCase()}>Find {view.toLowerCase()}</OutLink></div></div>;}
function Dictionary({draft}:Pick<Props,'draft'>){const [view,setView]=useState('Definition');const term=draft.replace(/^define\s*:\s*|^what (?:does|is)\s+|^meaning of\s+/i,'').replace(/\s+mean\??$|\?$/i,'').trim();return <div className="tool-body dictionary-tool"><div className="dictionary-mark" aria-hidden="true"><BookOpen size={64} strokeWidth={1.25}/><span>Aa</span></div><div className="tool-content"><h2 className="dictionary-term">{term||'Find the right word.'}</h2><Choices label="Word information" options={['Definition','Synonyms','Etymology']} value={view} onChange={setView}/><OutLink query={term+' '+view.toLowerCase()}>Look up {view.toLowerCase()}</OutLink><p className="tool-note">Dictionary entries open on Google.</p></div></div>;}
function Documents({draft,onDraft}:Pick<Props,'draft'|'onDraft'>){const current=parseSearchSyntax(draft).tokens.find(t=>t.key==='filetype')?.value.toUpperCase()??'';return <div className="documents-tool"><div className="tool-topline"><h2>Find the format you need.</h2><span>Filter your search</span></div><div className="file-options">{[['PDF','Reports & papers'],['DOCX','Documents'],['PPTX','Presentations'],['XLSX','Spreadsheets']].map(([format,label])=><button className="file-option" type="button" key={format} aria-pressed={current===format} onClick={()=>onDraft(upsertSearchOperator(draft,'filetype',format.toLowerCase()))}><span className="file-page"><FileText size={28} strokeWidth={1.5}/><b>{format}</b></span><span>{label}</span></button>)}</div><p className="tool-note">Choosing a format adds <code>filetype:</code> to your query.</p></div>;}
function Website({draft,onDraft}:Pick<Props,'draft'|'onDraft'>) {
  const token=parseSearchSyntax(draft).tokens.find(t=>t.key==='site');
  const [domain,setDomain]=useState(token?.value??'');
  const [error,setError]=useState('');
  useEffect(()=>{setDomain(token?.value??'');setError('');},[token?.value]);
  const apply=(value:string)=>{
    if (!value.trim()) { onDraft(upsertSearchOperator(draft,'site',''));setError('');return; }
    try {
      if (/\s/.test(value.trim()) || /^(?!https?:)[a-z]+:/i.test(value.trim())) throw new Error('Enter a domain such as example.com, with an optional path.');
      const url=new URL(/^https?:\/\//i.test(value.trim())?value.trim():'https://'+value.trim());
      if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.port || url.search || url.hash) throw new Error('Use only the domain and optional path. Leave out login details, ports, ? queries, and # anchors.');
      if (url.hostname.length>253 || !url.hostname.split('.').every(part=>part.length>0&&part.length<=63&&/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(part))) throw new Error('Enter a valid domain such as example.com.');
      const cleaned=url.hostname+(url.pathname==='/'?'':url.pathname.replace(/\/$/,''));
      setDomain(cleaned);setError('');onDraft(upsertSearchOperator(draft,'site',cleaned));
    } catch (failure) {
      setError(failure instanceof TypeError?'Enter a valid domain such as example.com.':failure instanceof Error?failure.message:'Enter a valid domain such as example.com.');
    }
  };
  return <div className="tool-body website-tool"><Globe2 className="hero-tool-icon" strokeWidth={1.2}/><div className="tool-content"><h2>Search one website.</h2><div className="inline-field"><label className="sr-only" htmlFor="site-domain">Website domain</label><input id="site-domain" placeholder="example.com" value={domain} aria-invalid={Boolean(error)} aria-describedby="site-domain-feedback" onChange={e=>{setDomain(e.target.value);setError('');}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();apply(domain);}}}/><button type="button" onClick={()=>apply(domain)} disabled={!domain.trim()&&!token}>{!domain.trim()&&token?'Remove':'Apply'}</button></div><p id="site-domain-feedback" className="tool-note" role={error?'alert':undefined}>{error||'A domain or path, such as example.com/docs.'}</p><div className="quick-domains">{['wikipedia.org','reddit.com','github.com'].map(d=><button type="button" key={d} onClick={()=>apply(d)}>{d}</button>)}</div></div></div>;
}
function dateDaysAgo(days:number) {
  const date=new Date();date.setDate(date.getDate()-days);
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
}
function News({draft,onDraft}:Pick<Props,'draft'|'onDraft'>) {
  const tokens=parseSearchSyntax(draft).tokens;
  const after=tokens.find(token=>token.key==='after')?.value;
  const before=tokens.find(token=>token.key==='before')?.value;
  const periods={'Past day':1,'Past week':7,'Past month':30};
  const period=before?'Custom dates':!after?'Any time':Object.entries(periods).find(([,days])=>dateDaysAgo(days)===after)?.[0]??'Custom dates';
  const newsUrl=new URL(buildGoogleSearchUrl(outgoingQuery(draft)));newsUrl.searchParams.set('tbm','nws');
  return <div className="tool-body news-tool"><div className="news-art" aria-hidden="true"><Newspaper size={76} strokeWidth={1.25}/><span>The latest.</span></div><div className="tool-content"><h2>Put the story in perspective.</h2><Choices label="News recency" options={['Any time','Past day','Past week','Past month']} value={period} onChange={value=>{
    const days=periods[value as keyof typeof periods];
    const query=upsertSearchOperator(upsertSearchOperator(draft,'before',''),'after',days?dateDaysAgo(days):'');
    onDraft(query,'news');
  }}/><a className="tool-link" href={newsUrl.toString()} target="_blank" rel="noopener noreferrer">Read the news<ArrowUpRight size={16}/><span className="sr-only"> (opens Google in a new tab)</span></a><p className="tool-note">{period==='Custom dates'?'Your custom date filters apply. ':''}News opens on Google. No headlines are generated.</p></div></div>;
}
function DateRange({draft,onDraft}:Pick<Props,'draft'|'onDraft'>){const tokens=parseSearchSyntax(draft).tokens;const after=tokens.find(t=>t.key==='after')?.value??'';const before=tokens.find(t=>t.key==='before')?.value??'';return <div className="tool-body date-tool"><CalendarDays className="hero-tool-icon" strokeWidth={1.2}/><div className="tool-content"><h2>Find it in a moment in time.</h2><div className="date-fields"><label>After<input type="date" aria-label="Search after date" value={/^\d{4}-\d{2}-\d{2}$/.test(after)?after:''} max={before||undefined} onChange={e=>onDraft(upsertSearchOperator(draft,'after',e.target.value))}/></label><span>—</span><label>Before<input type="date" aria-label="Search before date" value={/^\d{4}-\d{2}-\d{2}$/.test(before)?before:''} min={after||undefined} onChange={e=>onDraft(upsertSearchOperator(draft,'before',e.target.value))}/></label></div><p className="tool-note">Adds Google’s <code>after:</code> and <code>before:</code> filters.</p></div></div>;}
function Precision({draft,onDraft}:Pick<Props,'draft'|'onDraft'>) {
  const [exact,setExact]=useState('');const [exclude,setExclude]=useState('');
  const add=(key:'exact'|'exclusion',value:string)=>{
    const fragment=upsertSearchOperator('',key,value);
    if(!fragment)return;
    // Prepending is safe even with an unfinished quote, and preserves every existing filter.
    onDraft(fragment+(draft?' '+draft:''));
    if(key==='exact')setExact('');else setExclude('');
  };
  return <div className="precision-tool"><div className="tool-topline"><h2>A more precise search.</h2><Quote size={24}/></div><div className="precision-fields"><label>Exact phrase<div className="inline-field"><input placeholder="words that belong together" value={exact} onChange={e=>setExact(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add('exact',exact);}}}/><button type="button" disabled={!exact.trim()} onClick={()=>add('exact',exact)}>Add</button></div></label><label>Leave out<div className="inline-field"><input placeholder="a word to exclude" value={exclude} onChange={e=>setExclude(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add('exclusion',exclude);}}}/><button type="button" disabled={!exclude.trim()} onClick={()=>add('exclusion',exclude)}>Add</button></div></label></div><p className="tool-note">Your existing query stays intact. Remove filters using the chips above.</p></div>;
}
export default function SearchTools({mode,draft,onDraft}:Props){switch(mode){case'convert':return <Converter draft={draft}/>;case'weather':return <Weather draft={draft}/>;case'finance':return <Finance draft={draft}/>;case'places':return <Places draft={draft}/>;case'movies':return <Movies draft={draft}/>;case'define':return <Dictionary draft={draft}/>;case'documents':return <Documents draft={draft} onDraft={onDraft}/>;case'site':return <Website draft={draft} onDraft={onDraft}/>;case'news':return <News draft={draft} onDraft={onDraft}/>;case'date':return <DateRange draft={draft} onDraft={onDraft}/>;case'precise':return <Precision draft={draft} onDraft={onDraft}/>;default:return <div className="general-tool"><Search size={23}/><p>The whole web is a good place to start.</p><OutLink query={draft}>Search Google</OutLink></div>;}}
