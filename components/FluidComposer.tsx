'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, ArrowUpRight, Check, ChevronDown, Globe2, Image, Info, LockKeyhole, MessageCircle, PenLine, Plus, RotateCcw, Sparkles, Telescope, X, type LucideIcon } from 'lucide-react';
import type { IntentResult, ModeId } from '@/lib/intent';

type Mode = { label: string; hint: string; icon: LucideIcon; example: string; short: string };
const modes: Record<ModeId, Mode> = {
  general: { label: 'General', hint: 'A little help with whatever is on your mind.', icon: MessageCircle, example: 'Help me write a thoughtful birthday note for a friend.', short: 'Write a note' },
  image: { label: 'Create image', hint: 'Turn what you’re imagining into something visual.', icon: Image, example: 'Create a minimal poster for a rooftop garden.', short: 'Imagine something' },
  web: { label: 'Web search', hint: 'Find what’s happening beyond this conversation.', icon: Globe2, example: 'Find the latest news about reusable rockets.', short: 'Find the latest' },
  research: { label: 'Deep research', hint: 'Make room for a deeper look, with evidence and sources.', icon: Telescope, example: 'Research urban cooling methods and compare the evidence in a detailed report.', short: 'Go a little deeper' },
  sketch: { label: 'Sketch', hint: 'Some thoughts are easier to draw. Sketch and attach one.', icon: PenLine, example: 'Let me draw the room layout to show you what I mean.', short: 'Draw your idea' },
};
const modeIds = Object.keys(modes) as ModeId[];
type Status = 'idle' | 'pending' | 'ready' | 'error';
type DisplayResult = IntentResult & { roundTripMs: number };

function FluidMark({ small = false }: { small?: boolean }) {
  return <svg width={small ? 18 : 27} height={small ? 18 : 27} viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M3 10c4-8 8 8 12 0s8 0 10 0M3 18c4-8 8 8 12 0s8 0 10 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

export default function FluidComposer() {
  const [draft, setDraft] = useState('');
  const [fluid, setFluid] = useState(true);
  const [manualMode, setManualMode] = useState<ModeId | null>(null);
  const [result, setResult] = useState<DisplayResult | null>(null);
  const [sampleMode, setSampleMode] = useState<ModeId | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [liveAvailable, setLiveAvailable] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const plusButton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const cache = useRef(new Map<string, DisplayResult>());
  const bytes = new TextEncoder().encode(draft).length;
  const oversized = bytes > 2000;
  const selectedMode = manualMode ?? sampleMode ?? result?.mode ?? 'general';
  const displayMode = fluid ? selectedMode : 'general';
  const current = modes[displayMode];
  const CurrentIcon = current.icon;
  const hasSuggestion = fluid && (manualMode !== null || sampleMode !== null || result !== null);
  const source = manualMode !== null ? 'Manual selection' : sampleMode !== null ? 'Example transition' : result ? 'Live Jev decision' : 'Waiting for a thought';

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/status', { signal: controller.signal }).then(r => r.json()).then(data => setLiveAvailable(data.liveAvailable === true)).catch(() => { if (!controller.signal.aborted) setLiveAvailable(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const revision = ++generation.current;
    const controller = new AbortController();
    if (!draft.trim() || !fluid || manualMode !== null || sampleMode !== null || oversized || isComposing) {
      setStatus('idle');
      if (!draft.trim() || oversized) setResult(null);
      return () => controller.abort();
    }
    if (liveAvailable !== true) { setResult(null); setStatus('idle'); return; }
    const cached = cache.current.get(draft);
    if (cached) { setResult(cached); setStatus('ready'); setError(''); return; }
    const timer = window.setTimeout(async () => {
      setStatus('pending');
      setError('');
      try {
        const startedAt = performance.now();
        const response = await fetch('/api/intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draft }), signal: controller.signal });
        const data = await response.json();
        if (revision !== generation.current || controller.signal.aborted) return;
        if (!response.ok) throw new Error(data.error || 'Live routing is unavailable. Try again or choose a mode.');
        const next = { ...data, roundTripMs: Math.round(performance.now() - startedAt) } as DisplayResult;
        if (!modeIds.includes(next.mode) || next.source !== 'live') throw new Error('Live routing is unavailable. Choose a mode or try an example.');
        if (cache.current.size >= 30) cache.current.delete(cache.current.keys().next().value!);
        cache.current.set(draft, next);
        setResult(next); setStatus('ready');
      } catch (failure) {
        if (revision !== generation.current || controller.signal.aborted) return;
        setResult(null); setStatus('error');
        setError(failure instanceof Error ? failure.message : 'Live routing is unavailable. Choose a mode or try an example.');
      }
    }, 350);
    // Let dispatched requests settle their real cost; revision checks ignore stale results.
    return () => { window.clearTimeout(timer); };
  }, [draft, fluid, manualMode, sampleMode, oversized, isComposing, liveAvailable]);

  useEffect(() => {
    if (!menuOpen) return;
    menu.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"]')?.focus();
    const close = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node) && !plusButton.current?.contains(event.target as Node)) setMenuOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  const editDraft = (value: string) => {
    generation.current += 1;
    setDraft(value); setSampleMode(null); setConfirmation(''); setError('');
    if (!value.trim()) { setResult(null); setManualMode(null); }
  };
  const reset = useCallback(() => {
    generation.current += 1;
    setDraft(''); setManualMode(null); setSampleMode(null); setResult(null); setStatus('idle'); setError(''); setConfirmation(''); setMenuOpen(false);
    textarea.current?.focus();
  }, []);
  const selectMode = (mode: ModeId | null) => {
    generation.current += 1; setManualMode(mode); setSampleMode(null); setConfirmation(''); setError(''); setMenuOpen(false); textarea.current?.focus();
  };
  const loadExample = (mode: ModeId) => {
    generation.current += 1; setDraft(modes[mode].example); setManualMode(null); setResult(null); setError(''); setConfirmation('');
    setSampleMode(liveAvailable && status !== 'error' ? null : mode); textarea.current?.focus();
  };
  const submit = () => {
    if (!draft.trim() || oversized || isComposing || status === 'pending') return;
    const route = !fluid && manualMode === null ? 'Auto' : modes[selectedMode].label;
    setConfirmation(`${route} selected. UI demonstration only — no tool is running.`);
  };
  const navigateMenu = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); plusButton.current?.focus(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
    if (event.key === 'Home') { event.preventDefault(); buttons[0]?.focus(); }
    if (event.key === 'End') { event.preventDefault(); buttons.at(-1)?.focus(); }
  };

  return <div className="fluid-app" data-mode={displayMode} data-interface={fluid ? 'fluid' : 'classic'}>
    <div className="ambient" aria-hidden="true">{(['image', 'web', 'research', 'sketch'] as ModeId[]).map(mode => <div key={mode} className={`ambient-color ambient-${mode}`} />)}<div className="ambient-grid" /></div>
    <header className="site-header">
      <a href="/" className="wordmark" aria-label="ChatGPT Fluid home"><FluidMark /><span>ChatGPT <span className="wordmark-fluid">Fluid</span></span></a>
      <div className="comparison" aria-label="Interface style" role="group">
        <button aria-pressed={!fluid} onClick={() => { generation.current += 1; setFluid(false); setConfirmation(''); }}>Classic</button>
        <button aria-pressed={fluid} onClick={() => { setFluid(true); setConfirmation(''); }}><FluidMark small />Fluid</button>
      </div>
    </header>

    <main className="main-content">
      <div className="intro"><h1>What’s on your mind?</h1><p>{fluid ? 'Keep typing. The interface will follow.' : 'One composer. Every capability behind a click.'}</p></div>
      <section className="composer-section" aria-label="Try the fluid composer">
        <div className={`composer${oversized ? ' composer-invalid' : ''}`}>
          <label className="sr-only" htmlFor="prompt">Your prompt</label>
          <textarea id="prompt" ref={textarea} value={draft} onChange={event => editDraft(event.target.value)} onCompositionStart={() => setIsComposing(true)} onCompositionEnd={() => setIsComposing(false)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} placeholder="Ask anything, or follow a thought…" rows={3} spellCheck={false} aria-describedby="privacy-note prompt-feedback" aria-invalid={oversized} />
          <div className="composer-toolbar">
            <div className="composer-tools">
              <button className={`icon-button add-button${menuOpen ? ' is-open' : ''}`} ref={plusButton} onClick={() => setMenuOpen(!menuOpen)} aria-label="Choose a capability" aria-expanded={menuOpen} aria-haspopup="menu" aria-controls="capability-menu"><Plus size={23} /></button>
              <div className="mode-slot">
                {hasSuggestion ? <button key={`${selectedMode}-${source}`} className="mode-chip" onClick={() => setMenuOpen(!menuOpen)} aria-label={`${manualMode !== null ? 'Selected' : sampleMode !== null ? 'Example' : 'Suggested'}: ${modes[selectedMode].label}. Choose a capability`}>
                  {manualMode !== null ? <LockKeyhole size={14} /> : <CurrentIcon size={16} />}<span><span className="chip-prefix">{manualMode !== null ? 'Selected: ' : sampleMode !== null ? 'Example: ' : 'Suggested: '}</span>{modes[selectedMode].label}</span><ChevronDown size={13} />
                </button> : !fluid && manualMode !== null ? <button className="mode-chip classic-chip" onClick={() => setMenuOpen(true)}>{modes[manualMode].label}<ChevronDown size={13} /></button> : fluid ? <span className="auto-label"><Sparkles size={15} />Auto</span> : null}
                {manualMode !== null && fluid && <button className="return-auto" onClick={() => selectMode(null)} aria-label="Return to automatic routing"><X size={14} /></button>}
              </div>
            </div>
            <div className="composer-actions">{draft && <button className="icon-button reset-button" onClick={reset} aria-label="Reset prompt"><RotateCcw size={17} /></button>}<button className="submit-button" onClick={submit} disabled={!draft.trim() || oversized || status === 'pending'} aria-label="Preview selected route"><ArrowUp size={22} /></button></div>
          </div>
          {menuOpen && <div id="capability-menu" role="menu" className="capability-menu" ref={menu} onKeyDown={navigateMenu} aria-label="Capabilities">
            <button role="menuitemradio" aria-checked={manualMode === null} onClick={() => selectMode(null)}><Sparkles size={18} /><span><strong>Auto</strong><small>Let the prompt lead</small></span>{manualMode === null && <Check size={16} />}</button>
            <div className="menu-divider" />
            {modeIds.map(mode => { const Icon = modes[mode].icon; return <button key={mode} role="menuitemradio" aria-checked={manualMode === mode} onClick={() => selectMode(mode)}><Icon size={18} /><span><strong>{modes[mode].label}</strong><small>{mode === 'sketch' ? 'Draw and attach an image' : mode === 'image' ? 'Visualize what you imagine' : mode === 'web' ? 'Find current information' : mode === 'research' ? 'Explore a question in depth' : 'Think, write, and work things out'}</small></span>{manualMode === mode && <Check size={16} />}</button>; })}
          </div>}
        </div>
        <div className="context-row" id="prompt-feedback">
          <div className="context-hint" aria-live="polite" aria-atomic="true">
            {oversized ? <span className="error-copy">Your prompt is {bytes.toLocaleString()} bytes. Keep it under 2,000.</span> : confirmation ? <span className="confirmation"><Check size={14} />{confirmation}</span> : status === 'error' ? <span className="error-copy">{error}</span> : fluid && hasSuggestion ? <span key={displayMode} className="mode-hint"><CurrentIcon size={14} />{current.hint}</span> : <span>{fluid ? 'The right capability, a little more visible.' : 'Open + to discover and select a capability.'}</span>}
          </div>
          <span className="request-state" aria-live="polite">{status === 'pending' ? 'Reading intent…' : sampleMode !== null ? 'Sample' : manualMode !== null ? 'Manual' : result && fluid ? `${result.roundTripMs} ms` : ''}</span>
        </div>
      </section>

      <section className="examples" aria-label="Example prompts"><span className="examples-label">Follow a thought</span><div className="example-options">{(['image', 'web', 'research', 'sketch'] as ModeId[]).map(mode => { const Icon = modes[mode].icon; return <button key={mode} onClick={() => loadExample(mode)}><Icon size={16} /><span>{modes[mode].short}</span><ArrowUpRight size={13} className="example-arrow" /></button>; })}</div></section>
      <p className="privacy-note" id="privacy-note">{liveAvailable ? <>Drafts are sent to TypeSafe as you type. This demo previews capabilities; it doesn’t run them.</> : liveAvailable === false ? <>Live routing is unavailable. Explore labelled examples or choose a capability with +.</> : <>Checking live routing. You can explore an example while we connect.</>}</p>
    </main>

    <footer className="site-footer"><span className="attribution"><span className={`status-dot${liveAvailable ? ' live' : ''}`} />{liveAvailable ? 'Live decisions by ' : 'An experiment with '}<a href="https://typesafe.ai" target="_blank" rel="noreferrer">TypeSafe Jev<ArrowUpRight size={11} /></a></span><span className="independent">An independent interface concept</span><details className="how-it-works"><summary><Info size={14} />How it works</summary><div className="explanation"><h2>A small decision. A different interface.</h2><div className="decision-flow"><span>Your draft</span><ArrowUpRight size={14} /><span>Jev</span><ArrowUpRight size={14} /><span>The interface</span></div><p>Jev chooses a likely capability from five options. The composer reflects that decision while you type. Your words stay exactly where you left them.</p><p>Unclear intent stays neutral. You can always choose a mode yourself. No searches, images, sketches, or research jobs are executed.</p><dl><div><dt>Current source</dt><dd>{source}</dd></div><div><dt>Model</dt><dd>{result && manualMode === null && sampleMode === null ? result.model : 'jev-1.13.0 (configured)'}</dd></div><div><dt>Last request round trip</dt><dd>{result && manualMode === null && sampleMode === null ? `${result.roundTripMs} ms` : 'No live measurement yet'}</dd></div></dl><p className="disclosure-note">Our app doesn’t save your drafts. Live drafts go to TypeSafe for classification. Example transitions are predefined and labelled. Not affiliated with OpenAI or TypeSafe.</p></div></details></footer>
  </div>;
}
