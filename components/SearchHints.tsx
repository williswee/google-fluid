'use client';
import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { EXAMPLES, SEARCH_EXAMPLES, type SearchExample } from '../lib/search-presets';

const HINT_IDS = ['flights', 'hotels', 'calculate-2', 'images', 'video', 'shopping', 'finance-2', 'places', 'dino'];
const hints = HINT_IDS.map(id => SEARCH_EXAMPLES.find(item => item.id === id)!);

export default function SearchHints({ active, onBrowse, onChoose }: { active: boolean; onBrowse: () => void; onChoose: (example: SearchExample) => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(preference.matches);
    const visibility = () => setHidden(document.hidden);
    sync(); visibility();
    preference.addEventListener('change', sync); document.addEventListener('visibilitychange', visibility);
    return () => { preference.removeEventListener('change', sync); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => { if (!active) setEngaged(false); }, [active]);
  useEffect(() => {
    if (!active || !root.current) return;
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting));
    observer.observe(root.current); return () => observer.disconnect();
  }, [active]);
  useEffect(() => {
    if (!active || !visible || hidden || paused || reduced || engaged) return;
    const interval = window.setInterval(() => setIndex(value => (value + 1) % (hints.length + 1)), 6000);
    return () => window.clearInterval(interval);
  }, [active, visible, hidden, paused, reduced, engaged]);
  if (!active) return null;
  const example = index ? hints[index - 1] : null;
  return <div ref={root} className="search-hints" aria-label="Search tips" onMouseEnter={() => setEngaged(true)} onMouseLeave={() => setEngaged(false)} onFocus={() => setEngaged(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setEngaged(false); }}>
    <button className="search-hint" type="button" onClick={() => example ? onChoose(example) : onBrowse()}><span key={index}>{example ? <>Try <strong>{example.query}</strong></> : <>Type <kbd>/</kbd> to explore all {EXAMPLES.length} tools</>}</span></button>
    {!reduced && <button className="hint-pause" type="button" aria-label={paused ? 'Resume search tips' : 'Pause search tips'} onClick={() => setPaused(value => !value)}>{paused ? <Play size={13} /> : <Pause size={13} />}</button>}
  </div>;
}
