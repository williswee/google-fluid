'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react';
import { ArrowRight, ArrowUpRight, Info, X } from 'lucide-react';
import { MAX_DRAFT_BYTES, type ModeId } from '../lib/intent';
import { useIntent } from '../hooks/useIntent';
import { EXAMPLES, SEARCH_MODES, filterExamples, type SearchExample } from '../lib/search-presets';
import { parseSearchSyntax, removeSearchToken } from '../lib/search-syntax';
import { SEARCH_ICONS } from './search-icons';
import SearchTools from './SearchTools';

export default function FluidSearch() {
  const [draft, setDraft] = useState('');
  const [live, setLive] = useState<boolean | null>(null);
  const [composing, setComposing] = useState(false);
  const [retry, setRetry] = useState(0);
  const [manual, setManual] = useState<ModeId | null>(null);
  const [selection, setSelection] = useState<{ draft: string; mode: ModeId } | null>(null);
  const [palette, setPalette] = useState<string | null>(null);
  const [activeOption, setActiveOption] = useState(0);
  const [about, setAbout] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const panel = useRef<HTMLElement>(null);
  const savedCaret = useRef({ start: 0, end: 0 });
  const restoreCaret = useRef(false);
  const aboutButton = useRef<HTMLButtonElement>(null);
  const notesOpener = useRef<HTMLButtonElement | null>(null);
  const commandList = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const syntax = useMemo(() => parseSearchSyntax(draft), [draft]);
  const options = useMemo(() => filterExamples(palette ?? ''), [palette]);
  const oversized = new TextEncoder().encode(draft).length > MAX_DRAFT_BYTES;
  const hasDraft = Boolean(draft.trim());
  const selected = selection?.draft === draft ? selection : null;
  const enabled = live === true && hasDraft && !oversized && !composing && !syntax.mode && !manual && !selected && palette === null;
  const intent = useIntent(draft, enabled, retry);
  const effectiveMode: ModeId = manual ?? selected?.mode ?? syntax.mode ?? (hasDraft && !intent.error ? intent.result?.mode : undefined) ?? 'general';
  const mode = effectiveMode;
  const pending = intent.pending;
  const Icon = SEARCH_ICONS[mode];
  const source = manual || selected ? 'Selected' : syntax.mode ? 'Search syntax' : intent.result && hasDraft && !intent.error ? 'Jev' : 'Search';
  const showPanel = palette === null && hasDraft && !oversized && (mode !== 'general' || Boolean(intent.result && !pending) || Boolean(manual));
  const currentResult = intent.resultDraft === draft ? intent.result : null;
  const status = pending ? (intent.result ? 'Updating…' : 'Reading your search…') : source === 'Jev' ? `Jev · ${currentResult?.roundTripMs ?? intent.result?.roundTripMs} ms` : source === 'Search syntax' ? 'Search syntax · instant' : source === 'Selected' ? 'Selected by you' : '';
  const privacy = live === true ? 'Drafts are sent to TypeSafe while you type. Nothing is saved here.' : live === false ? 'Live routing is unavailable. Choose any tool with / to explore it.' : 'Checking live routing…';

  useEffect(() => {
    let active = true;
    fetch('/api/status', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject()).then(v => { if (active) setLive(v.liveAvailable === true); }).catch(() => { if (active) setLive(false); });
    return () => { active = false; };
  }, []);
  useLayoutEffect(() => {
    const element = panel.current;
    if (!showPanel || !element) return;
    const measure = () => setPanelHeight(Math.ceil(element.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [showPanel, mode]);
  useEffect(() => {
    if (input.current) { input.current.style.height = 'auto'; input.current.style.height = `${Math.min(112, input.current.scrollHeight)}px`; }
  }, [draft, palette]);
  useLayoutEffect(() => {
    const list = commandList.current;
    const option = document.getElementById(`search-option-${activeOption}`);
    if (palette === null || !list || !option) return;
    const listBounds = list.getBoundingClientRect();
    const optionBounds = option.getBoundingClientRect();
    if (optionBounds.top < listBounds.top) list.scrollTop -= listBounds.top - optionBounds.top;
    else if (optionBounds.bottom > listBounds.bottom) list.scrollTop += optionBounds.bottom - listBounds.bottom;
  }, [palette, activeOption]);
  useLayoutEffect(() => {
    const list = commandList.current;
    if (palette === null || !list) return;
    const viewport = window.visualViewport;
    const size = () => {
      const bottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      list.style.setProperty('--command-space', `${Math.max(128, bottom - list.getBoundingClientRect().top - 20)}px`);
    };
    size();
    viewport?.addEventListener('resize', size);
    viewport?.addEventListener('scroll', size);
    window.addEventListener('resize', size);
    return () => {
      viewport?.removeEventListener('resize', size);
      viewport?.removeEventListener('scroll', size);
      window.removeEventListener('resize', size);
    };
  }, [palette !== null]);

  useLayoutEffect(() => {
    if (palette === null && restoreCaret.current && input.current) {
      restoreCaret.current = false;
      input.current.focus();
      input.current.setSelectionRange(savedCaret.current.start, savedCaret.current.end);
    }
  }, [palette]);

  useEffect(() => { if (about) document.getElementById('notes-title')?.focus(); }, [about]);

  function toggleNotes(event: MouseEvent<HTMLButtonElement>) {
    if (about) closeNotes();
    else { notesOpener.current = event.currentTarget; setAbout(true); }
  }
  function closeNotes() {
    setAbout(false);
    const opener = notesOpener.current;
    (opener?.isConnected ? opener : aboutButton.current)?.focus();
  }
  function changeDraft(value: string) { setDraft(value); setSelection(null); }
  function clear() { setDraft(''); setSelection(null); setManual(null); setPalette(null); input.current?.focus(); }
  function openPalette() { savedCaret.current = { start: input.current?.selectionStart ?? draft.length, end: input.current?.selectionEnd ?? draft.length }; setPalette(''); setActiveOption(0); input.current?.focus(); }
  function closePalette() { restoreCaret.current = true; setPalette(null); input.current?.focus(); }
  function choose(item: SearchExample) {
    savedCaret.current = {start:item.query.length,end:item.query.length}; restoreCaret.current = true; setDraft(item.query); setManual(null); setSelection({ draft: item.query, mode: item.mode }); setPalette(null); input.current?.focus();
  }
  function changeInput(value: string) {
    if (palette !== null) {
      if (!value.startsWith('/')) { setPalette(null); changeDraft(value); }
      else { setPalette(value.slice(1)); setActiveOption(0); }
    } else if (value.startsWith('/') && !composing) { savedCaret.current = {start:draft.length,end:draft.length}; setPalette(value.slice(1)); setActiveOption(0); }
    else changeDraft(value);
  }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || composing) return;
    if (palette !== null) {
      if (event.key === 'Escape') { event.preventDefault(); closePalette(); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); setActiveOption(i => options.length ? (i + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length : 0);
      }
      if (event.key === 'Enter') { event.preventDefault(); if (options[activeOption]) choose(options[activeOption]); }
      if (event.key === 'Tab') setPalette(null);
      return;
    }
    if (event.key === 'Escape') { event.preventDefault(); clear(); }
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (hasDraft && !oversized) event.currentTarget.form?.requestSubmit(); }
  }
  function submit(event: FormEvent<HTMLFormElement>) { if (!hasDraft || oversized || composing || palette !== null) event.preventDefault(); }

  return <div className="fluid-app" data-mode={mode} data-pending={pending}>
    <main className="search-main">
      <div className="identity"><h1 aria-label="Google Fluid"><span className="google-word" aria-hidden="true"><b>G</b><b>o</b><b>o</b><b>g</b><b>l</b><b>e</b></span><span className="fluid-word">fluid</span></h1><p>A search bar that takes the shape of your curiosity.</p></div>
      <div className="search-experience">
        <div className={`search-shell${showPanel || palette !== null ? ' expanded' : ''}`}>
          <form className="query-form" action="https://www.google.com/search" method="get" target="_blank" rel="noopener noreferrer" onSubmit={submit}>
            <span className="query-icon" aria-hidden="true"><Icon size={23} strokeWidth={1.8} /></span>
            <label className="sr-only" htmlFor="query">Search query</label>
            <textarea ref={input} id="query" name="q" rows={1} value={palette !== null ? '/' + palette : draft} role="combobox" aria-autocomplete="list" aria-expanded={palette !== null} aria-controls={palette !== null ? 'search-palette' : undefined} aria-activedescendant={palette !== null && options[activeOption] ? `search-option-${activeOption}` : undefined} aria-describedby="privacy-note query-error" aria-invalid={oversized} placeholder="Search anything, or type /" autoComplete="off" spellCheck={false} onChange={e => changeInput(e.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onKeyDown={keyDown} />
            {(hasDraft || palette !== null) && <button className="clear-button icon-button" type="button" aria-label={palette !== null ? 'Close search tools' : 'Clear search'} onClick={palette !== null ? closePalette : clear}><X size={18} /></button>}
            <button className="slash-button" type="button" aria-label="Browse all search tools" aria-expanded={palette !== null} aria-controls="search-palette" onClick={palette !== null ? closePalette : openPalette}><span aria-hidden="true">/</span></button>
            <button className="search-button" type="submit" aria-label="Search Google" disabled={!hasDraft || oversized || composing || palette !== null}><ArrowRight size={22} /></button>
          </form>
          {palette !== null && <div className="command-menu">
            <div className="command-heading"><span>{options.length} {options.length === 1 ? 'search' : 'searches'} to try</span><span><kbd>↑</kbd><kbd>↓</kbd> to explore <kbd>esc</kbd> to close</span></div>
            <div ref={commandList} id="search-palette" role="listbox" aria-label="Search tools" className="command-options">
              {options.map((item, index) => { const ItemIcon = SEARCH_ICONS[item.mode]; return <button type="button" role="option" tabIndex={-1} aria-selected={activeOption === index} id={`search-option-${index}`} key={item.id} className="command-option" onMouseDown={e => e.preventDefault()} onClick={() => choose(item)} onPointerMove={event => { if (event.movementX || event.movementY) setActiveOption(index); }}><ItemIcon size={19} /><span><strong>{SEARCH_MODES[item.mode].label}</strong><span>{item.query}</span></span><ArrowRight size={16} /></button>; })}
              {options.length === 0 && <p className="command-empty">No tool matches. Try “timer”, “weather” or “color”.</p>}
            </div>
          </div>}
          <div className={`tool-reveal${showPanel ? ' is-open' : ''}`} style={{ height: showPanel ? panelHeight : 0 }}><div className="tool-clip">{showPanel && <section ref={panel} className="search-tools" aria-label={`${SEARCH_MODES[mode].label} search tools`}>
            <div className="tool-meta"><span><Icon size={14} />{SEARCH_MODES[mode].label}</span><button type="button" className="decision-source" onClick={toggleNotes} aria-expanded={about} aria-controls="search-notes" aria-label={`${status}. Notes`}>{status}<Info size={12} /></button></div>
            {syntax.tokens.filter(t => t.provenance !== 'deprecated').length > 0 && <div className="query-tokens" aria-label="Search filters">{syntax.tokens.filter(t => t.provenance !== 'deprecated').map((token, index) => <button type="button" key={`${token.start}-${index}`} onClick={() => changeDraft(removeSearchToken(draft, token))} aria-label={`Remove ${token.label}: ${token.value || 'unfinished'}`}><span>{token.label}{token.value ? `: ${token.value}` : ': …'}</span><X size={12} /></button>)}</div>}
            <div className="mode-content" key={mode}><SearchTools mode={mode} draft={draft} onDraft={(value, keepMode) => { changeDraft(value); if (keepMode) setSelection({ draft: value, mode: keepMode }); }} /></div>
          </section>}</div></div>
        </div>
        <span className="sr-only" aria-live="polite" aria-atomic="true">{pending ? '' : showPanel ? `${SEARCH_MODES[mode].label} ready. ${status}` : ''}</span>
        <p id="privacy-note" className="sr-only">{privacy}</p>
        {(oversized || intent.error) && <p id="query-error" className="query-error" role="alert">{oversized ? 'Keep the search under 2,000 bytes.' : intent.error}{intent.error && <><button type="button" onClick={() => setRetry(v => v + 1)}>Retry</button><button type="button" onClick={openPalette}>Choose a tool</button></>}</p>}
        {syntax.deprecated.length > 0 && <p className="syntax-notice">{syntax.deprecated.join(' and ')} {syntax.deprecated.length > 1 ? 'are' : 'is'} no longer supported by Google. <button type="button" onClick={() => choose({ id: 'site', mode: 'site', query: SEARCH_MODES.site.example })}>Try a website filter</button></p>}
      </div>
    </main>
    <footer className="site-footer footer-with-notes">
      {about && <section id="search-notes" className="about-panel" aria-label="Fluid Search notes" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeNotes(); } }}>
        <div className="about-title"><h2 id="notes-title" tabIndex={-1}>Notes</h2><button type="button" className="icon-button" aria-label="Close notes" onClick={closeNotes}><X size={18} /></button></div>
        <p>{privacy} This is an independent experiment, not affiliated with Google.</p>
        <div className="notes-section"><h3>How routing works</h3>
        <p>TypeSafe Jev chooses an interface from the meaning of your search. Type <code>/</code> to explore every tool immediately. Selecting one is labelled “Selected by you”; editing its query returns to automatic routing. Explicit search operators are recognized on your device.</p>
        <div className="how-flow"><span>Your query</span><ArrowRight size={15} /><span>Jev intent</span><ArrowRight size={15} /><span>A useful interface</span></div>
        </div>
        <div className="notes-section"><h3>Tools & data</h3>
        <p>Calculators, clocks, color controls, the orbit lab and game run on your device. Knowledge cards cover a small set of examples; their source buttons explain the data. Weather loads a real forecast for Singapore or Tokyo. Currency conversion uses daily ECB reference rates. Stocks, places and news link to Google for current results. The map illustration is schematic.</p>
        <p>The orbit lab is a prebuilt Newtonian model, not an AI-generated simulation or a model of black holes. Nothing in this demo generates answers or executes AI tools. Enter opens your query on Google in a new tab.</p>
        </div>
        <div className="notes-section"><h3>Controls & limits</h3>
        {currentResult && <p className="timing-details">Last live request: {currentResult.roundTripMs} ms round trip · {currentResult.model}{currentResult.timings ? ` · Budget check ${currentResult.timings.reserveMs} ms · Jev ${currentResult.timings.inferenceMs} ms · Settlement ${currentResult.timings.settleMs} ms` : ''}</p>}
        <p className="about-small">A 150 ms typing pause, one live request at a time, and a shared US$5 allowance. No keyword rules pretend to be Jev. The / menu works even when live routing is unavailable. Timers and games are kept only while their panel is open; nothing is saved. Metronome audio starts only when you press Start.</p>
        <label className="about-picker">Keep a tool selected <select aria-label="Choose search tool" value={manual ?? 'auto'} onChange={e => { setManual(e.target.value === 'auto' ? null : e.target.value as ModeId); if(e.target.value === 'auto') setSelection(null); }}><option value="auto">Auto</option>{EXAMPLES.map(m => <option key={m} value={m}>{SEARCH_MODES[m].label}</option>)}</select></label>
        </div>
        <div className="notes-section"><h3>Credits</h3>
        <p className="notes-credit">Inspired by <a href="https://github.com/anishfn/shapeshift" target="_blank" rel="noopener noreferrer">ShapeShift</a>, the open-source fluid interface by <a href="https://github.com/anishfn" target="_blank" rel="noopener noreferrer">Anish Gupta (@anishfn)</a>. Its slash discovery and intent-driven widgets helped shape this experiment.</p>
        <p className="about-small">Our dinosaur runner is an original implementation inspired by <a href="https://blog.google/products-and-platforms/products/chrome/chrome-dino/" target="_blank" rel="noopener noreferrer">Chrome’s offline dinosaur game</a>. You can also play it on this demo’s 404 page. It starts only when you choose to play.</p>
        </div>
      </section>}
      <div className="footer-links"><button ref={aboutButton} className="notes-button" type="button" aria-label="Notes" onClick={toggleNotes} aria-expanded={about} aria-controls="search-notes"><Info size={14}/><span>Notes</span></button><span aria-hidden="true">·</span><a href="https://typesafe.ai" target="_blank" rel="noopener noreferrer">Built with <strong>TypeSafe Jev</strong><ArrowUpRight size={13} /></a></div>
    </footer>
  </div>;
}
