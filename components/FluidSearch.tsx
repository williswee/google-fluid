'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, ChevronDown, CloudSun, FileText, Film, Globe2, Info, MapPin, Newspaper, Quote, Search, Shuffle, SlidersHorizontal, TrendingUp, X } from 'lucide-react';
import { MAX_DRAFT_BYTES, type ModeId } from '../lib/intent';
import { useIntent } from '../hooks/useIntent';
import { EXAMPLES, SEARCH_MODES } from '../lib/search-presets';
import { buildGoogleSearchUrl, parseSearchSyntax, removeSearchToken } from '../lib/search-syntax';
import SearchTools from './SearchTools';
const icons = { general:Search,weather:CloudSun,finance:TrendingUp,places:MapPin,movies:Film,convert:Shuffle,define:BookOpen,documents:FileText,site:Globe2,news:Newspaper,date:CalendarDays,precise:Quote };

export default function FluidSearch(){
  const [draft,setDraft]=useState('');
  const [fluid,setFluid]=useState(true);
  const [live,setLive]=useState<boolean|null>(null);
  const [composing,setComposing]=useState(false);
  const [retry,setRetry]=useState(0);
  const [example,setExample]=useState<{draft:string;mode:ModeId}|null>(null);
  const [manual,setManual]=useState<ModeId|null>(null);
  const [refinement,setRefinement]=useState<{draft:string;mode:ModeId}|null>(null);
  const [showAll,setShowAll]=useState(false);
  const [about,setAbout]=useState(false);
  const input=useRef<HTMLTextAreaElement>(null);
  const panel=useRef<HTMLElement>(null);
  const [panelHeight,setPanelHeight]=useState(0);
  const syntax=useMemo(()=>parseSearchSyntax(draft),[draft]);
  const bytes=new TextEncoder().encode(draft).length;
  const oversized=bytes>MAX_DRAFT_BYTES;
  const hasDraft=Boolean(draft.trim());
  const validExample=example?.draft===draft?example:null;
  const selectedRefinement=refinement?.draft===draft?refinement:null;
  const enabled=fluid&&live===true&&hasDraft&&!oversized&&!composing&&!syntax.mode&&!manual&&!validExample&&!selectedRefinement;
  const intent=useIntent(draft,enabled,retry);
  const effectiveMode:ModeId=manual??selectedRefinement?.mode??syntax.mode??validExample?.mode??(hasDraft&&!intent.error?intent.result?.mode:undefined)??'general';
  const mode=fluid?effectiveMode:'general';
  const pending=intent.pending;
  const Icon=icons[mode];
  const source=manual||selectedRefinement?'Selected':syntax.mode?'Search syntax':validExample?'Example':intent.result&&hasDraft&&!intent.error?'Jev':'Search';
  const showPanel=fluid&&hasDraft&&!oversized&&(mode!=='general'||Boolean(intent.result&&!pending)||Boolean(manual));
  const currentResult=intent.resultDraft===draft?intent.result:null;
  const status=!fluid?'':pending?(intent.result?'Updating…':'Reading your search…'):source==='Jev'?`Jev · ${currentResult?.roundTripMs??intent.result?.roundTripMs} ms`:source==='Search syntax'?'Search syntax · instant':source==='Example'?'Example · live routing unavailable':source==='Selected'?'Selected by you':'';

  useEffect(()=>{let active=true;fetch('/api/status',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(v=>{if(active)setLive(v.liveAvailable===true);}).catch(()=>{if(active)setLive(false);});return()=>{active=false;};},[]);
  useLayoutEffect(()=>{
    const element=panel.current;
    if(!showPanel||!element)return;
    const measure=()=>setPanelHeight(Math.ceil(element.getBoundingClientRect().height));
    measure();
    const observer=new ResizeObserver(measure);observer.observe(element);
    return()=>observer.disconnect();
  },[showPanel,mode]);
  useEffect(()=>{if(input.current){input.current.style.height='auto';input.current.style.height=`${Math.min(112,input.current.scrollHeight)}px`;}},[draft]);
  function changeDraft(value:string){setDraft(value);setExample(null);setRefinement(null);}
  function clear(){setDraft('');setExample(null);setManual(null);input.current?.focus();}
  function tryExample(next:ModeId){const text=SEARCH_MODES[next].example;setDraft(text);setManual(null);setExample(live===false||Boolean(intent.error)?{draft:text,mode:next}:null);input.current?.focus();}
  function submit(event:FormEvent<HTMLFormElement>){if(!hasDraft||oversized||composing)event.preventDefault();}

  return <div className="fluid-app" data-mode={mode} data-pending={pending}>
    <header className="site-header"><a className="project-name" href="/" aria-label="Fluid Search home"><span className="brand-symbol" aria-hidden="true"><i/><i/><i/><i/></span>Fluid Search</a><div className="header-actions"><button className="about-button" type="button" aria-label="How it works" onClick={()=>setAbout(v=>!v)} aria-expanded={about}><Info size={17}/><span>How it works</span></button><div className="view-switch" aria-label="Search interface" role="group"><button type="button" onClick={()=>setFluid(false)} aria-pressed={!fluid}>Classic</button><button type="button" onClick={()=>setFluid(true)} aria-pressed={fluid}>Fluid</button></div></div></header>
    <main className="search-main">
      <div className="identity"><h1 aria-label="Google Fluid"><span className="google-word" aria-hidden="true"><b>G</b><b>o</b><b>o</b><b>g</b><b>l</b><b>e</b></span><span className="fluid-word">fluid</span></h1><p>A search bar that takes the shape of your curiosity.</p></div>
      <div className="search-experience">
        <div className={`search-shell${showPanel?' expanded':''}`}>
          <form className="query-form" action="https://www.google.com/search" method="get" target="_blank" rel="noopener noreferrer" onSubmit={submit}>
            <span className="query-icon" aria-hidden="true"><Icon size={23} strokeWidth={1.8}/></span>
            <label className="sr-only" htmlFor="query">Search query</label>
            <textarea ref={input} id="query" name="q" rows={1} value={draft} aria-describedby="privacy-note query-error" aria-invalid={oversized} placeholder="Search anything. See what it becomes." autoComplete="off" spellCheck={false} onChange={e=>changeDraft(e.target.value)} onCompositionStart={()=>setComposing(true)} onCompositionEnd={()=>setComposing(false)} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();clear();}if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();if(hasDraft&&!oversized)e.currentTarget.form?.requestSubmit();}}}/>
            {hasDraft&&<button className="clear-button icon-button" type="button" aria-label="Clear search" onClick={clear}><X size={18}/></button>}
            <button className="search-button" type="submit" aria-label="Search Google" disabled={!hasDraft||oversized||composing}><ArrowRight size={22}/></button>
          </form>
          <div className={`tool-reveal${showPanel?' is-open':''}`} style={{height:showPanel?panelHeight:0}}><div className="tool-clip">{showPanel&&<section ref={panel} className="search-tools" aria-label={`${SEARCH_MODES[mode].label} search tools`}>
            <div className="tool-meta"><span><Icon size={14}/>{SEARCH_MODES[mode].label}</span><span className="decision-source">{status}</span></div>
            {syntax.tokens.filter(t=>t.provenance!=='deprecated').length>0&&<div className="query-tokens" aria-label="Search filters">{syntax.tokens.filter(t=>t.provenance!=='deprecated').map((token,index)=><button type="button" key={`${token.start}-${index}`} onClick={()=>changeDraft(removeSearchToken(draft,token))} aria-label={`Remove ${token.label}: ${token.value||'unfinished'}`}><span>{token.label}{token.value?`: ${token.value}`:': …'}</span><X size={12}/></button>)}</div>}
            <div className="mode-content" key={mode}><SearchTools mode={mode} draft={draft} onDraft={(value,keepMode)=>{changeDraft(value);if(keepMode)setRefinement({draft:value,mode:keepMode});}}/></div>
          </section>}</div></div>
        </div>
        <div className="search-status"><span className={pending?'reading':''} aria-live="polite" aria-atomic="true">{!showPanel?(status||(!fluid?'The familiar search box. Switch to Fluid to see it adapt.':'Type naturally, or try a search below.')):pending?'Your last tool stays in place while Jev reads the edit.':fluid&&showPanel?<><Check size={13}/>{SEARCH_MODES[mode].hint}</>:!fluid?'The familiar search box. Switch to Fluid to see it adapt.':'Type naturally, or try a search below.'}</span>{hasDraft&&fluid&&<label className="manual-picker"><SlidersHorizontal size={13}/><span className="sr-only">Choose search tool</span><select aria-label="Choose search tool" value={manual??'auto'} onChange={e=>setManual(e.target.value==='auto'?null:e.target.value as ModeId)}><option value="auto">Auto</option>{EXAMPLES.map(m=><option key={m} value={m}>{SEARCH_MODES[m].label}</option>)}</select></label>}</div>
        <p id="query-error" className="query-error" role={oversized||intent.error?'alert':undefined}>{oversized?'Keep the search under 2,000 bytes.':intent.error}<span>{intent.error&&<button type="button" onClick={()=>setRetry(v=>v+1)}>Retry</button>}</span></p>
        {syntax.deprecated.length>0&&<p className="syntax-notice">{syntax.deprecated.join(' and ')} {syntax.deprecated.length>1?'are':'is'} no longer supported by Google. Try <button type="button" onClick={()=>tryExample('site')}>a website filter</button>.</p>}
        <p className="privacy-note" id="privacy-note">{live===true?'Drafts are sent to TypeSafe while you type. Nothing is saved here.':live===false?'Live routing is unavailable. Try a labelled example or type a search operator.':'Checking live routing…'}</p>
      </div>
      <section className="examples" aria-label="Try a search"><div className="examples-heading"><span>Try a little curiosity</span><button type="button" onClick={()=>setShowAll(v=>!v)} aria-expanded={showAll}>{showAll?'Show less':'All 12 searches'}<ChevronDown size={14} className={showAll?'flipped':''}/></button></div><div className="example-list">{(showAll?EXAMPLES:EXAMPLES.slice(0,6)).map(m=>{const ExampleIcon=icons[m];return <button type="button" key={m} className={m===mode&&hasDraft?'active':''} onClick={()=>tryExample(m)} aria-label={`Try ${SEARCH_MODES[m].label}: ${SEARCH_MODES[m].example}`}><ExampleIcon size={16}/><span>{m==='weather'?'Need an umbrella?':m==='convert'?'10 km in miles':m==='places'?'Cafes nearby':m==='define'?'Serendipity':m==='documents'?'Find a PDF':m==='finance'?'AAPL stock':SEARCH_MODES[m].label}</span></button>;})}</div><p className="example-hint">Same search bar. A different possibility with every thought.</p></section>
      {about&&<section className="about-panel" aria-label="How Fluid Search works"><div className="about-title"><h2>From a thought to a useful tool.</h2><button type="button" className="icon-button" aria-label="Close explanation" onClick={()=>setAbout(false)}><X size={18}/></button></div><p>TypeSafe Jev reads natural-language intent and chooses a search interface. Explicit operators such as <code>site:</code> and <code>filetype:</code> are recognized locally and labelled “Search syntax”.</p><p>The converter calculates on your device. Other controls refine a query and open real Google results in a new tab. This experiment does not fetch weather, stock prices, maps, or news.</p><div className="how-flow"><span>Your query</span><ArrowRight size={15}/><span>Jev intent</span><ArrowRight size={15}/><span>A useful interface</span></div>{currentResult&&<p className="timing-details">Last live request: {currentResult.roundTripMs} ms round trip · {currentResult.model}{currentResult.timings?` · Budget check ${currentResult.timings.reserveMs} ms · Jev ${currentResult.timings.inferenceMs} ms · Settlement ${currentResult.timings.settleMs} ms`:''}</p>}<p className="about-small">A 150 ms typing pause, one live request at a time, and a shared US$5 allowance. Manual tools and labelled examples stay available if live routing stops. Retired Google operators are flagged; some older syntax may be ignored by Google.</p><a href="https://support.google.com/websearch/answer/2466433?hl=en" target="_blank" rel="noopener noreferrer">About Google search operators<ArrowUpRight size={14}/></a></section>}
    </main>
    <footer className="site-footer"><span>An independent experiment. Not affiliated with Google.</span><a href="https://typesafe.ai" target="_blank" rel="noopener noreferrer">Built with <strong>TypeSafe Jev</strong><ArrowUpRight size={13}/></a></footer>
  </div>;
}
