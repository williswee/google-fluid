'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUpRight, Check, ChevronDown, Globe2, Image, Info, LockKeyhole, MessageCircle, PenLine, Plus, RotateCcw, Telescope, X, Zap } from 'lucide-react';
import { MAX_DRAFT_BYTES, type EffortId, type ModeId } from '../lib/intent';
import { EFFORT_LABELS, EXAMPLE_EFFORT, IMAGE_MODELS, suggestedModel, TEXT_MODELS } from '../lib/preview-models';
import { useIntent } from '../hooks/useIntent';
import CapabilityTray from './CapabilityTray';

const modes = {
  general: { label: 'General', hint: 'A little help with whatever is on your mind.', icon: MessageCircle, example: 'Help me write a thoughtful birthday note for a friend.', short: 'Write a note' },
  image: { label: 'Create image', hint: 'Give your idea a frame.', icon: Image, example: 'Create a minimal poster for a rooftop garden.', short: 'Imagine something' },
  web: { label: 'Web search', hint: 'Bring the outside world into focus.', icon: Globe2, example: 'Find the latest news about reusable rockets.', short: 'Find the latest' },
  research: { label: 'Deep research', hint: 'Make room for a deeper look.', icon: Telescope, example: 'Research urban cooling methods and compare the evidence in a detailed report.', short: 'Go a little deeper' },
  sketch: { label: 'Sketch', hint: 'An idea is sometimes easier to draw.', icon: PenLine, example: 'Let me draw the room layout to show you what I mean.', short: 'Try sketch mode' },
};
const modeIds = Object.keys(modes) as ModeId[];

function FluidMark({ small = false }: { small?: boolean }) {
  return <svg width={small ? 18 : 27} height={small ? 18 : 27} viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M3 10c4-8 8 8 12 0s8 0 10 0M3 18c4-8 8 8 12 0s8 0 10 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

export default function FluidComposer() {
  const [draft, setDraft] = useState('');
  const [fluid, setFluid] = useState(true);
  const [manualMode, setManualMode] = useState<ModeId | null>(null);
  const [sampleMode, setSampleMode] = useState<ModeId | null>(null);
  const [effortOverride, setEffortOverride] = useState<EffortId | null>(null);
  const [modelOverrides, setModelOverrides] = useState<Partial<Record<ModeId, string>>>({});
  const [liveAvailable, setLiveAvailable] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [confirmedSetup, setConfirmedSetup] = useState('');
  const [traySummary, setTraySummary] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [resetKey, setResetKey] = useState(0);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const plusButton = useRef<HTMLButtonElement>(null);
  const setupButton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const setup = useRef<HTMLDivElement>(null);
  const bytes = new TextEncoder().encode(draft).length;
  const oversized = bytes > MAX_DRAFT_BYTES;
  const canRoute = !!draft.trim() && fluid && manualMode === null && sampleMode === null && !oversized && !isComposing && liveAvailable === true;
  const { result, resultDraft, pending, error } = useIntent(draft, canRoute, retryKey);
  const usableResult = draft.trim() && !oversized ? result : null;
  const selectedMode = manualMode ?? sampleMode ?? usableResult?.mode ?? 'general';
  const displayMode = fluid ? selectedMode : 'general';
  const current = modes[displayMode];
  const CurrentIcon = current.icon;
  const hasSuggestion = manualMode !== null || sampleMode !== null || usableResult !== null;
  const selectedEffort = effortOverride ?? (manualMode !== null || sampleMode !== null ? EXAMPLE_EFFORT[selectedMode] : usableResult?.effort) ?? 'balanced';
  const model = modelOverrides[selectedMode] ?? suggestedModel(selectedMode, selectedEffort);
  const modelOptions = selectedMode === 'image' ? IMAGE_MODELS : TEXT_MODELS;
  const source = manualMode !== null ? 'Manual selection' : sampleMode !== null ? 'Example transition' : usableResult ? pending || isComposing ? 'Last confirmed Jev decision' : 'Live Jev decision' : 'Waiting for a thought';
  const prefix = manualMode !== null ? 'Selected' : sampleMode !== null ? 'Example' : pending || isComposing ? 'Updating' : 'Suggested';
  const setupVisible = (fluid && hasSuggestion) || effortOverride !== null || modelOverrides[selectedMode] !== undefined;
  const setupManual = effortOverride !== null || modelOverrides[selectedMode] !== undefined;

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/status', { signal: controller.signal }).then(r => r.json()).then(data => setLiveAvailable(data.liveAvailable === true)).catch(() => { if (!controller.signal.aborted) setLiveAvailable(false); });
    return () => controller.abort();
  }, []);

  useLayoutEffect(() => {
    const resize = () => {
      const input = textarea.current;
      if (!input) return;
      input.style.height = '0px';
      input.style.height = `${Math.max(28, Math.min(input.scrollHeight, 140))}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draft]);

  useEffect(() => {
    if (!menuOpen && !setupOpen) return;
    if (menuOpen) menu.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"]')?.focus();
    if (setupOpen) setup.current?.querySelector<HTMLSelectElement>('select')?.focus();
    const close = (event: PointerEvent) => {
      const node = event.target as Node;
      if (!menu.current?.contains(node) && !plusButton.current?.contains(node) && !(node instanceof Element && node.closest('.mode-chip'))) setMenuOpen(false);
      if (!setup.current?.contains(node) && !setupButton.current?.contains(node)) setSetupOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen, setupOpen]);

  const editDraft = (value: string) => { setDraft(value); setSampleMode(null); setConfirmation(''); };
  const reset = useCallback(() => {
    setDraft(''); setManualMode(null); setSampleMode(null); setEffortOverride(null); setModelOverrides({}); setConfirmation(''); setConfirmedSetup(''); setMenuOpen(false); setSetupOpen(false); setResetKey(key => key + 1);
    textarea.current?.focus();
  }, []);
  const selectMode = (mode: ModeId | null) => { setManualMode(mode); setSampleMode(null); setConfirmation(''); setMenuOpen(false); textarea.current?.focus(); };
  const loadExample = (mode: ModeId) => {
    setDraft(modes[mode].example); setManualMode(null); setConfirmation('');
    setSampleMode(liveAvailable && !error ? null : mode); textarea.current?.focus();
  };
  const submit = () => {
    if (!draft.trim() || oversized || isComposing || pending) return;
    const route = !fluid && manualMode === null ? 'Auto' : modes[selectedMode].label;
    setConfirmation(`${route} selected. UI demonstration only — no tool is running.`);
    setConfirmedSetup(`${model} · ${EFFORT_LABELS[selectedEffort]}${selectedMode !== 'general' && traySummary ? ` · ${traySummary}` : ''}`);
  };
  const navigateMenu = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') { event.preventDefault(); setMenuOpen(false); plusButton.current?.focus(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
    if (event.key === 'Home') { event.preventDefault(); buttons[0]?.focus(); }
    if (event.key === 'End') { event.preventDefault(); buttons.at(-1)?.focus(); }
  };

  return <div className="fluid-app" data-mode={displayMode} data-interface={fluid ? 'fluid' : 'classic'} data-pending={pending}>
    <div className="ambient" aria-hidden="true">{(['image', 'web', 'research', 'sketch'] as ModeId[]).map(mode => <div key={mode} className={`ambient-color ambient-${mode}`} />)}<div className="ambient-grid" /></div>
    <header className="site-header">
      <a href="/" className="wordmark" aria-label="ChatGPT Fluid home"><FluidMark /><span>ChatGPT <span className="wordmark-fluid">Fluid</span></span></a>
      <div className="comparison" aria-label="Interface style" role="group"><button aria-pressed={!fluid} onClick={() => { setFluid(false); setConfirmation(''); }}>Classic</button><button aria-pressed={fluid} onClick={() => { setFluid(true); setConfirmation(''); }}><FluidMark small />Fluid</button></div>
    </header>

    <main className="main-content">
      <div className="intro"><h1>What’s on your mind?</h1><p>{fluid ? 'Keep typing. Watch the possibilities unfold.' : 'One composer. Every capability behind a click.'}</p></div>
      <section className="composer-section" aria-label="Try the fluid composer">
        <div className={`composer${oversized ? ' composer-invalid' : ''}`}>
          <div className="composer-main">
            <button className={`icon-button add-button${menuOpen ? ' is-open' : ''}`} ref={plusButton} onClick={() => { setMenuOpen(!menuOpen); setSetupOpen(false); }} aria-label="Choose a capability" aria-expanded={menuOpen} aria-haspopup="menu" aria-controls="capability-menu"><Plus size={24} /></button>
            <label className="sr-only" htmlFor="prompt">Your prompt</label>
            <textarea id="prompt" ref={textarea} value={draft} onChange={event => editDraft(event.target.value)} onCompositionStart={() => setIsComposing(true)} onCompositionEnd={() => setIsComposing(false)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); } }} placeholder="Ask anything…" rows={1} spellCheck={false} aria-describedby="privacy-note preview-note prompt-feedback" aria-invalid={oversized} />
            <button className={`setup-trigger${setupVisible ? ' has-setup' : ''}`} ref={setupButton} aria-label="Response setup preview" aria-haspopup="dialog" aria-expanded={setupOpen} onClick={() => { setSetupOpen(!setupOpen); setMenuOpen(false); }}>
              <span className="setup-trigger-copy"><span className="setup-model">{setupVisible ? model : 'Auto'}</span><span className="setup-effort">{setupManual && <LockKeyhole size={10} />}{setupVisible ? `${EFFORT_LABELS[selectedEffort]} · preview` : 'Model + effort'}</span></span><ChevronDown size={15} />
            </button>
            <button className="submit-button" onClick={submit} disabled={!draft.trim() || oversized || pending || isComposing} aria-label="Preview selected route"><span>Preview</span><ArrowUpRight size={19} /></button>
          </div>
          {menuOpen && <div id="capability-menu" role="menu" className="capability-menu" ref={menu} onKeyDown={navigateMenu} aria-label="Capabilities">
            <button role="menuitemradio" aria-checked={manualMode === null} onClick={() => selectMode(null)}><Zap size={18} /><span><strong>Auto</strong><small>Let the prompt lead</small></span>{manualMode === null && <Check size={16} />}</button><div className="menu-divider" />
            {modeIds.map(mode => { const Icon = modes[mode].icon; return <button key={mode} role="menuitemradio" aria-checked={manualMode === mode} onClick={() => selectMode(mode)}><Icon size={18} /><span><strong>{modes[mode].label}</strong><small>{mode === 'sketch' ? 'Preview drawing input' : mode === 'image' ? 'Frame a visual idea' : mode === 'web' ? 'Choose sources and recency' : mode === 'research' ? 'Set the shape of an investigation' : 'Think, write, and work things out'}</small></span>{manualMode === mode && <Check size={16} />}</button>; })}
          </div>}
          {setupOpen && <div ref={setup} className="setup-popover" role="dialog" aria-label="Response setup preview" onKeyDown={event => { if (event.key === 'Escape') { setSetupOpen(false); setupButton.current?.focus(); } }}>
            <div className="popover-heading"><strong>Response setup</strong><span>Preview only</span></div>
            <p>Jev suggests effort. This demo maps it to a model preset. No generation model is called.</p>
            <label>Effort<select aria-label="Effort" value={effortOverride ?? 'auto'} onChange={event => { setEffortOverride(event.target.value === 'auto' ? null : event.target.value as EffortId); setConfirmation(''); }}><option value="auto">Auto · follow Jev</option><option value="brief">Brief</option><option value="balanced">Balanced</option><option value="deep">Deep</option></select></label>
            <label>Model<select aria-label="Model" value={modelOverrides[selectedMode] ?? 'auto'} onChange={event => { const value = event.target.value; setModelOverrides(previous => ({ ...previous, [selectedMode]: value === 'auto' ? undefined : value })); setConfirmation(''); }}><option value="auto">Auto · follow setup</option>{modelOptions.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
            <button className="text-button" onClick={() => { setEffortOverride(null); setModelOverrides({}); setSetupOpen(false); textarea.current?.focus(); }}>Return setup to Auto<RotateCcw size={13} /></button>
          </div>}
        </div>

        <div className="composer-meta" id="prompt-feedback">
          <div className="mode-slot">
            {hasSuggestion && (fluid || manualMode !== null) ? <button className={`mode-chip${pending ? ' is-updating' : ''}`} onClick={() => { setMenuOpen(!menuOpen); setSetupOpen(false); }} aria-label={`${prefix}: ${modes[selectedMode].label}. Choose a capability`}><CurrentIcon size={16} /><span><span className="chip-prefix">{prefix}: </span>{modes[selectedMode].label}</span><ChevronDown size={13} /></button> : <span className="auto-label"><FluidMark small />{fluid ? 'A little room for possibility' : 'Capabilities are in the + menu'}</span>}
            {manualMode !== null && <button className="icon-button return-auto" onClick={() => selectMode(null)} aria-label="Return to automatic routing"><X size={16} /></button>}
          </div>
          <div className="meta-actions"><span className="request-state" role="status">{pending ? <><span className="reading-mark" />{usableResult ? 'Updating suggestion…' : 'Reading intent…'}</> : sampleMode !== null ? 'Example' : manualMode !== null ? 'Manual' : usableResult && fluid ? 'Jev suggested' : ''}</span>{draft && <button className="icon-button reset-button" onClick={reset} aria-label="Reset prompt"><RotateCcw size={16} /></button>}</div>
        </div>
        <div className="notice-area" aria-live="polite" aria-atomic="true">
          {oversized ? <span className="error-copy">Your prompt is {bytes.toLocaleString()} bytes. Keep it under 2,000.</span> : error ? <span className="error-copy">{error}<button className="retry-button" onClick={() => setRetryKey(key => key + 1)}>Try again</button></span> : confirmation ? <div className="confirmation"><Check size={15} /><div><span>{confirmation}</span><small>{confirmedSetup}</small></div></div> : <span className="preview-note" id="preview-note">{fluid && hasSuggestion ? current.hint : 'A live intent experiment. Preview the setup; no tools are run.'}</span>}
        </div>
      <p className="privacy-note" id="privacy-note">{liveAvailable ? <>Drafts are sent to TypeSafe as you type. Tools and model choices are previews.</> : liveAvailable === false ? <>Live routing is unavailable. Explore labelled examples or choose a capability with +.</> : <>Checking live routing. You can explore an example while we connect.</>}</p>
        <div className="tool-stage" data-active={fluid && selectedMode !== 'general'}>
          <CapabilityTray mode={displayMode} resetKey={resetKey} onSummaryChange={setTraySummary} />
          {displayMode === 'general' && <div className="neutral-stage"><FluidMark /><p>{usableResult && fluid ? 'Some thoughts just need a conversation.' : 'Try changing “poster” to “checklist”.'}</p></div>}
        </div>
      </section>

      <section className="examples" aria-label="Example prompts"><div className="example-options">{(['image', 'web', 'research', 'sketch'] as ModeId[]).map(mode => { const Icon = modes[mode].icon; return <button key={mode} onClick={() => loadExample(mode)}><Icon size={16} /><span>{modes[mode].short}</span><ArrowUpRight size={13} className="example-arrow" /></button>; })}</div></section>
    </main>

    <footer className="site-footer"><span className="attribution"><span className={`status-dot${liveAvailable ? ' live' : ''}`} />{liveAvailable ? 'Live intent by ' : 'An experiment with '}<a href="https://typesafe.ai" target="_blank" rel="noreferrer">TypeSafe Jev<ArrowUpRight size={11} /></a></span><span className="independent">An independent interface concept</span><details className="how-it-works"><summary><Info size={15} />How it works</summary><div className="explanation"><h2>A small decision. A different interface.</h2><div className="decision-flow"><span>Your draft</span><ArrowUpRight size={14} /><span>Jev</span><ArrowUpRight size={14} /><span>Your setup</span></div><p>Jev reads capability and effort in one request. A model preset and useful controls follow. The preview models are never called.</p><p>Typing gets immediate acknowledgement. Confirmed suggestions wait for Jev. Unclear intent stays neutral; manual choices stay yours.</p><dl><div><dt>Current source</dt><dd>{source}</dd></div><div><dt>Classifier</dt><dd>{usableResult?.model ?? 'jev-1.13.0 (configured)'}</dd></div><div><dt>Last request round trip</dt><dd>{usableResult && manualMode === null && sampleMode === null ? `${usableResult.roundTripMs} ms` : 'No live measurement yet'}</dd></div>{usableResult?.timings && <><div><dt>Budget check</dt><dd>{usableResult.timings.reserveMs} ms</dd></div><div><dt>Jev request</dt><dd>{usableResult.timings.inferenceMs} ms</dd></div><div><dt>Budget settlement</dt><dd>{usableResult.timings.settleMs} ms</dd></div></>}{usableResult && resultDraft !== draft && pending && <div><dt>Draft status</dt><dd>Updated draft awaiting Jev</dd></div>}</dl><p className="disclosure-note">Our app doesn’t save drafts. Live drafts go to TypeSafe. Drawings remain in this tab and are not uploaded. Examples are predefined and labelled. Model presets are illustrative; not affiliated with OpenAI or TypeSafe.</p></div></details></footer>
  </div>;
}
