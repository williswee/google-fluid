'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, Copy, Delete, Flag, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { calculateTip, colorInk, evaluateExpression, formatDuration, hexToRgb, normalizeHex, parseBpm, parseColor, parseDuration, parseExpression, parseTip, remainingMilliseconds, rgbToHex } from '../lib/utility-tools';
import './utility-tools.css';

type Props = { mode: string; draft: string };
const money = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function TipCalculator({ draft }: { draft: string }) {
  const parsed = parseTip(draft);
  const [bill, setBill] = useState(String(parsed?.bill ?? 84));
  const [percent, setPercent] = useState(String(parsed?.percent ?? 15));
  const [people, setPeople] = useState(String(parsed?.people ?? 2));
  useEffect(() => { const next = parseTip(draft); if (next) { setBill(String(next.bill)); setPercent(String(next.percent)); setPeople(String(next.people)); } }, [draft]);
  const total = [bill, percent, people].every(value => value.trim()) ? calculateTip(Number(bill), Number(percent), Number(people)) : null;
  return <div className="utility-widget tip-widget">
    <div className="tool-topline"><h2>Tip & split</h2><span>{/\$\s*\d|\d\s*(?:dollars?|usd)/i.test(draft) ? 'USD' : 'Editable example · USD'}</span></div>
    <div className="utility-fields tip-fields">
      <label>Bill amount<input aria-label="Bill amount in dollars" type="number" min="0" max="10000000" step="0.01" value={bill} onChange={event => setBill(event.target.value)} /></label>
      <label>Tip percentage<input aria-label="Tip percentage" type="number" min="0" max="100" value={percent} onChange={event => setPercent(event.target.value)} /></label>
      <label>People<input aria-label="Number of people" type="number" min="1" max="100" step="1" value={people} onChange={event => setPeople(event.target.value)} /></label>
    </div>
    <div className="tip-result"><div><span>Each person pays</span><output aria-label="Each person pays">{total ? money(total.each) : '—'}</output></div><dl><div><dt>Tip</dt><dd>{total ? money(total.tip) : '—'}</dd></div><div><dt>Total</dt><dd>{total ? money(total.total) : '—'}</dd></div></dl></div>
    {!total && <p className="utility-feedback" role="status">Enter a bill, a tip from 0–100%, and 1–100 people.</p>}
  </div>;
}

function Calculator({ draft }: { draft: string }) {
  const parsed = parseExpression(draft);
  const [expression, setExpression] = useState(parsed ?? '24 × 18');
  useEffect(() => { const next = parseExpression(draft); if (next) setExpression(next); }, [draft]);
  const result = evaluateExpression(expression);
  const keys = ['AC', '(', ')', '⌫', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '%', '+'];
  return <div className="utility-widget calculator-widget">
    <div className="tool-topline"><h2>Calculator</h2>{!parsed && <span>Editable example</span>}</div>
    <div className="calculator-display"><label className="sr-only" htmlFor="calculator-expression">Calculation</label><input id="calculator-expression" value={expression} maxLength={200} onChange={event => setExpression(event.target.value)} autoComplete="off" spellCheck={false} /><output aria-label="Calculation result">{result === null ? '—' : Number(result.toPrecision(12)).toLocaleString('en-US', { maximumFractionDigits: 10 })}</output></div>
    <div className="calculator-keys" aria-label="Calculator keypad">{keys.map(key => <button type="button" key={key} aria-label={key === 'AC' ? 'Clear calculation' : key === '⌫' ? 'Delete last character' : key === '×' ? 'Multiply' : key === '÷' ? 'Divide' : key === '−' ? 'Subtract' : key === '+' ? 'Add' : key === '%' ? 'Percent' : undefined} className={/[÷×−+%]/.test(key) ? 'calculator-operation' : ''} onClick={() => setExpression(value => key === 'AC' ? '' : key === '⌫' ? value.slice(0, -1) : (value + key).slice(0, 200))}>{key === '⌫' ? <Delete size={18} /> : key}</button>)}</div>
  </div>;
}

function Timer({ draft }: { draft: string }) {
  const feedbackId = useId();
  const duration = parseDuration(draft);
  const [minutes, setMinutes] = useState(String((duration ?? 300000) / 60000));
  const [total, setTotal] = useState(duration ?? 300000);
  const [remaining, setRemaining] = useState(duration ?? 300000);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const running = deadline !== null;
  useEffect(() => { const next = parseDuration(draft); if (next !== null) { setMinutes(String(next / 60000)); setTotal(next); setRemaining(next); setDeadline(null); setFinished(false); } }, [draft]);
  useEffect(() => {
    if (deadline === null) return;
    const tick = () => { const next = remainingMilliseconds(deadline, Date.now()); setRemaining(next); if (next === 0) { setDeadline(null); setFinished(true); } };
    tick(); const interval = window.setInterval(tick, 100);
    return () => window.clearInterval(interval);
  }, [deadline]);
  const validMinutes = minutes.trim() !== '' && Number(minutes) > 0 && Number(minutes) <= 1440;
  const reset = () => { setDeadline(null); setMinutes(String(total / 60000)); setRemaining(total); setFinished(false); };
  return <div className="utility-widget timer-widget">
    <div className="tool-topline"><h2>Timer</h2><label className="timer-duration">Minutes<input aria-label="Timer duration in minutes" type="number" min="0.01" max="1440" step="any" value={minutes} disabled={running} aria-invalid={!validMinutes} aria-describedby={!validMinutes ? feedbackId : undefined} onChange={event => { setMinutes(event.target.value); const next = Number(event.target.value) * 60000; if (next > 0 && next <= 86400000) { setTotal(next); setRemaining(next); setFinished(false); } }} /></label></div>
    <output className="utility-clock" aria-label="Time remaining" aria-live="off">{formatDuration(remaining)}</output>
    <div className="timer-track" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, remaining / total * 100))}%` }} /></div>
    <div className="utility-actions"><button className="utility-primary" type="button" disabled={!validMinutes} onClick={() => { if (running) { setRemaining(remainingMilliseconds(deadline, Date.now())); setDeadline(null); } else { const start = remaining > 0 ? remaining : total; setRemaining(start); setFinished(false); setDeadline(Date.now() + start); } }}>{running ? <Pause size={17} /> : <Play size={17} />}{running ? 'Pause' : remaining < total && remaining > 0 ? 'Resume' : 'Start timer'}</button><button type="button" onClick={reset}><RotateCcw size={16} />Reset</button></div>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{!validMinutes ? 'Timer duration needs a valid value.' : finished ? 'Time is up.' : running ? 'Timer running.' : remaining < total ? `Timer paused at ${formatDuration(remaining)}.` : 'Timer ready.'}</p>{finished && <p className="timer-done"><Check size={17} />Time is up.</p>}
    {!validMinutes && <p id={feedbackId} className="utility-feedback">Enter a duration greater than 0 and up to 1,440 minutes, or Reset to the last valid duration.</p>}
    {!duration && <span className="utility-default">5 minutes to start. Set your own duration above.</span>}
  </div>;
}

function Stopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const [announcement, setAnnouncement] = useState('Stopwatch ready.');
  const start = useRef(0);
  const accrued = useRef(0);
  useEffect(() => { if (!running) return; const interval = window.setInterval(() => setElapsed(accrued.current + performance.now() - start.current), 30); return () => window.clearInterval(interval); }, [running]);
  const current = () => accrued.current + (running ? performance.now() - start.current : 0);
  function toggle() {
    if (running) {
      accrued.current = current();
      setElapsed(accrued.current);
      setRunning(false);
      setAnnouncement(`Stopwatch paused at ${formatDuration(accrued.current, true)}.`);
    } else {
      start.current = performance.now();
      setRunning(true);
      setAnnouncement(elapsed > 0 ? 'Stopwatch resumed.' : 'Stopwatch running.');
    }
  }
  function lap() {
    const value = current();
    setLaps(values => [...values, value]);
    setAnnouncement(`Lap ${laps.length + 1} at ${formatDuration(value, true)}.`);
  }
  function reset() {
    setRunning(false); accrued.current = 0; setElapsed(0); setLaps([]);
    setAnnouncement('Stopwatch reset.');
  }
  return <div className="utility-widget stopwatch-widget">
    <div className="tool-topline"><h2>Stopwatch</h2><span>{laps.length ? `${laps.length} lap${laps.length === 1 ? '' : 's'}` : 'Ready when you are'}</span></div>
    <output className="utility-clock" aria-label="Elapsed time" aria-live="off">{formatDuration(elapsed, true)}</output>
    <div className="utility-actions"><button type="button" className="utility-primary" onClick={toggle}>{running ? <Pause size={17} /> : <Play size={17} />}{running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start stopwatch'}</button><button type="button" disabled={!running || laps.length >= 20} onClick={lap}><Flag size={16} />Lap</button><button type="button" aria-label="Reset stopwatch" onClick={reset}><RotateCcw size={16} />Reset</button></div>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    {laps.length > 0 && <ol className="stopwatch-laps" aria-label="Lap times">{laps.map((lap, index) => <li key={index}><span>Lap {index + 1}</span><span>+{formatDuration(lap - (laps[index - 1] ?? 0), true)}</span><time>{formatDuration(lap, true)}</time></li>).reverse()}</ol>}
  </div>;
}

function Metronome({ draft }: { draft: string }) {
  const [bpm, setBpm] = useState(parseBpm(draft) ?? 80);
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [beat, setBeat] = useState(0);
  const [error, setError] = useState('');
  const audio = useRef<AudioContext | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; void audio.current?.close().catch(() => {}); audio.current = null; }; }, []);
  useEffect(() => { const next = parseBpm(draft); if (next) setBpm(next); }, [draft]);
  useEffect(() => {
    if (!running || !audio.current) return;
    const context = audio.current;
    let next = context.currentTime + .04;
    let count = 0;
    const scheduled: { at: number; beat: number }[] = [];
    const tick = () => {
      if (context.state !== 'running') return;
      while (next < context.currentTime + .1) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = count % 4 === 0 ? 1000 : 720;
        gain.gain.setValueAtTime(0, next);
        gain.gain.linearRampToValueAtTime(.16, next + .003);
        gain.gain.exponentialRampToValueAtTime(.001, next + .045);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(next); oscillator.stop(next + .05);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        scheduled.push({ at: next, beat: count % 4 });
        next += 60 / bpm; count++;
      }
      while (scheduled.length && scheduled[0].at <= context.currentTime) setBeat(scheduled.shift()!.beat);
    };
    const interval = window.setInterval(tick, 25); tick();
    const hide = () => { if (document.hidden) { setRunning(false); void context.suspend().catch(() => {}); } };
    document.addEventListener('visibilitychange', hide);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', hide); };
  }, [running, bpm]);
  const toggle = async () => {
    if (running) { setRunning(false); await audio.current?.suspend(); return; }
    setStarting(true); setError('');
    try {
      const Context = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) throw new Error('Audio is not supported in this browser.');
      if (!audio.current || audio.current.state === 'closed') audio.current = new Context();
      await audio.current.resume();
      if (alive.current) { setBeat(0); setRunning(true); }
    } catch { if (alive.current) setError('Sound could not start. Check browser audio permissions and try again.'); }
    finally { if (alive.current) setStarting(false); }
  };
  return <div className="utility-widget metronome-widget"><div className="tool-topline"><h2>Metronome</h2><span>4 beats per bar</span></div><div className="tempo-display"><output aria-label="Beats per minute">{bpm}</output><span>BPM</span></div><label className="sr-only" htmlFor="metronome-tempo">Tempo</label><input id="metronome-tempo" className="utility-slider" type="range" min="30" max="240" value={bpm} aria-valuetext={`${bpm} beats per minute`} onChange={event => setBpm(Number(event.target.value))} /><div className="metronome-beats" aria-hidden="true">{[0, 1, 2, 3].map(value => <span key={value} className={running && beat === value ? 'beat-active' : ''}>{value + 1}</span>)}</div><div className="utility-actions"><button type="button" className="utility-primary" onClick={() => void toggle()} disabled={starting}>{running ? <Pause size={17} /> : <Volume2 size={17} />}{starting ? 'Starting…' : running ? 'Stop sound' : 'Start sound'}</button><button type="button" onClick={() => setBpm(80)}>80 BPM</button><button type="button" onClick={() => setBpm(120)}>120 BPM</button></div>{error && <p role="status" className="utility-feedback">{error}</p>}</div>;
}

function ColorPicker({ draft }: { draft: string }) {
  const [hex, setHex] = useState(parseColor(draft) ?? '#4285f4');
  const [field, setField] = useState(hex);
  const [copied, setCopied] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const copyRevision = useRef(0);
  const feedbackId = useId();
  useEffect(() => { const next = parseColor(draft); if (next) { copyRevision.current++; setHex(next); setField(next); setCopied(''); } }, [draft]);
  const rgb = hexToRgb(hex);
  const validField = normalizeHex(field);
  const update = (value: string) => { copyRevision.current++; setHex(value); setField(value); setCopied(''); };
  const editField = (value: string) => {
    copyRevision.current++; setField(value); setCopied('');
    const normalized = normalizeHex(value);
    if (normalized) setHex(normalized);
  };
  const copy = async () => {
    const value = normalizeHex(field);
    if (!value) return;
    const revision = ++copyRevision.current;
    try {
      await navigator.clipboard.writeText(value);
      if (revision === copyRevision.current) setCopied('Copied');
    } catch {
      if (revision === copyRevision.current) { input.current?.focus(); input.current?.select(); setCopied('Select and copy the hex value'); }
    }
  };
  return <div className="utility-widget color-widget"><div className="tool-topline"><h2>Color picker</h2><span>RGB</span></div><div className="color-workspace"><label className="color-swatch" style={{ backgroundColor: hex, color: colorInk(hex) }}><input aria-label="Choose a color" type="color" value={hex} onChange={event => update(event.target.value)} /><span>{hex.toUpperCase()}</span><small>Choose a color</small></label><div className="color-controls"><div className="color-hex"><label><span className="sr-only">Hex color</span><input ref={input} aria-label="Hex color" value={field} maxLength={7} spellCheck={false} aria-invalid={!validField} aria-describedby={!validField ? feedbackId : undefined} onChange={event => editField(event.target.value)} /></label><button type="button" aria-label="Copy hex color" disabled={!validField} onClick={() => void copy()}>{copied === 'Copied' ? <Check size={17} /> : <Copy size={17} />}</button></div>{!validField && <p id={feedbackId} className="utility-feedback">Enter a valid hex color, like #4285f4.</p>}{['Red', 'Green', 'Blue'].map((name, index) => <label className="color-channel" key={name}><span>{name}</span><input type="range" aria-label={`${name} channel`} min="0" max="255" value={rgb[index]} onChange={event => { const next = [...rgb]; next[index] = Number(event.target.value); update(rgbToHex(next)); }} /><output>{rgb[index]}</output></label>)}</div></div><p className="sr-only" role="status">{copied}</p></div>;
}

export default function UtilityTools({ mode, draft }: Props) {
  switch (mode) {
    case 'calculate': return /\b(?:tip|split)\b/i.test(draft) ? <TipCalculator draft={draft} /> : <Calculator draft={draft} />;
    case 'timer': return <Timer draft={draft} />;
    case 'stopwatch': return <Stopwatch />;
    case 'metronome': return <Metronome draft={draft} />;
    case 'color': return <ColorPicker draft={draft} />;
    default: return null;
  }
}
