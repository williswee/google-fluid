'use client';

import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { Check, ChevronDown, PenLine, RotateCcw, Undo2 } from 'lucide-react';
import type { ModeId } from '@/lib/intent';
import '@/app/tray.css';

type CapabilityTrayProps = {
  mode: ModeId;
  resetKey: number;
  onSummaryChange: (summary: string) => void;
};
type Frame = 'Square' | 'Landscape' | 'Portrait';
type Scope = 'The web' | 'News' | 'Primary sources';
type Recency = 'Any time' | 'Past week' | 'Past month';
type Format = 'Briefing' | 'Comparison' | 'Report';
type Point = { x: number; y: number };
type Stroke = { points: Point[]; weight: number };

const ratios: Record<Frame, string> = { Square: '1:1', Landscape: '16:9', Portrait: '3:4' };
const reportSections: Record<Format, string[]> = {
  Briefing: ['The question', 'Key evidence', 'Takeaway'],
  Comparison: ['Criteria', 'Side-by-side findings', 'Trade-offs'],
  Report: ['Overview', 'Evidence & analysis', 'Sources & conclusions'],
};

function strokePath(stroke: Stroke) {
  const [first, ...rest] = stroke.points;
  if (!first) return '';
  return `M ${first.x} ${first.y} ${rest.length ? rest.map(point => `L ${point.x} ${point.y}`).join(' ') : `L ${first.x + .01} ${first.y + .01}`}`;
}

function GlobeDrawing() {
  return <svg className="tray-globe" viewBox="0 0 180 180" fill="none" aria-hidden="true">
    <circle cx="90" cy="90" r="61" />
    <ellipse cx="90" cy="90" rx="28" ry="61" />
    <ellipse cx="90" cy="90" rx="61" ry="23" />
    <path d="M29 90h122M90 29v122" />
    <path className="globe-axis" d="M11 90h8m142 0h8M90 11v8m0 142v8" />
    <circle className="globe-marker" cx="117" cy="64" r="4" />
    <path className="globe-orbit" d="M35 131c-24-4-16-33 19-63s79-48 94-34c10 9 1 27-13 43" />
  </svg>;
}

/** Reset remounts local configuration; changing capability preserves it in this tab. */
export default function CapabilityTray(props: CapabilityTrayProps) {
  return <CapabilityTrayState key={props.resetKey} {...props} />;
}

function CapabilityTrayState({ mode, onSummaryChange }: CapabilityTrayProps) {
  const [frame, setFrame] = useState<Frame>('Square');
  const [scope, setScope] = useState<Scope>('The web');
  const [recency, setRecency] = useState<Recency>('Any time');
  const [format, setFormat] = useState<Format>('Report');
  const [weight, setWeight] = useState(2);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [description, setDescription] = useState('');
  const activeStroke = useRef<{ pointerId: number; stroke: Stroke } | null>(null);
  const sketchDescriptionId = useId();
  const summary = mode === 'image' ? `${frame} image · ${ratios[frame]}`
    : mode === 'web' ? `${scope} · ${recency.toLowerCase()}`
      : mode === 'research' ? `${format} outline`
        : mode === 'sketch' ? `Local sketch · ${strokes.length} ${strokes.length === 1 ? 'stroke' : 'strokes'}${description.trim() ? ' · description added' : ''}`
          : '';

  useEffect(() => { onSummaryChange(summary); }, [summary, onSummaryChange]);
  useEffect(() => {
    if (mode !== 'sketch') {
      activeStroke.current = null;
      setCurrentStroke(null);
    }
  }, [mode]);

  const getPoint = (event: PointerEvent<SVGSVGElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.round(Math.min(640, Math.max(0, (event.clientX - box.left) / box.width * 640)) * 10) / 10,
      y: Math.round(Math.min(120, Math.max(0, (event.clientY - box.top) / box.height * 120)) * 10) / 10,
    };
  };
  const beginStroke = (event: PointerEvent<SVGSVGElement>) => {
    if (!event.isPrimary || event.button !== 0 || strokes.length >= 80) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke = { points: [getPoint(event)], weight };
    activeStroke.current = { pointerId: event.pointerId, stroke };
    setCurrentStroke(stroke);
  };
  const extendStroke = (event: PointerEvent<SVGSVGElement>) => {
    const active = activeStroke.current;
    if (!active || active.pointerId !== event.pointerId || active.stroke.points.length >= 600) return;
    const point = getPoint(event);
    const last = active.stroke.points.at(-1)!;
    if (Math.hypot(point.x - last.x, point.y - last.y) < .75) return;
    active.stroke = { ...active.stroke, points: [...active.stroke.points, point] };
    setCurrentStroke(active.stroke);
  };
  const finishStroke = (event: PointerEvent<SVGSVGElement>) => {
    const active = activeStroke.current;
    if (!active || active.pointerId !== event.pointerId) return;
    setStrokes(previous => [...previous, active.stroke]);
    activeStroke.current = null;
    setCurrentStroke(null);
  };
  const clearSketch = () => {
    activeStroke.current = null;
    setCurrentStroke(null);
    setStrokes([]);
    setDescription('');
  };

  if (mode === 'general') return null;

  return <section className={`capability-tray tray-${mode}`} aria-label={`${mode === 'image' ? 'Image' : mode === 'web' ? 'Search' : mode === 'research' ? 'Research' : 'Sketch'} setup preview`}>
    {mode === 'image' && <div className="image-setup tray-reveal" key="image">
      <div className="tray-heading"><h2>Frame your image</h2><span>Aspect ratio preview</span></div>
      <div className="frame-options" role="group" aria-label="Image aspect ratio">
        {(['Square', 'Landscape', 'Portrait'] as Frame[]).map(option => <button className="frame-option" key={option} aria-pressed={frame === option} onClick={() => setFrame(option)}>
          <span className="frame-drawing" aria-hidden="true"><span className={`ratio-frame ratio-${option.toLowerCase()}`}><span className="frame-horizon" /><span className="frame-sun" /></span></span>
          <span className="frame-label"><span>{option}</span><span className="frame-ratio">{ratios[option]}</span>{frame === option && <Check size={13} aria-hidden="true" />}</span>
        </button>)}
      </div>
    </div>}

    {mode === 'web' && <div className="search-setup tray-reveal" key="web">
      <div className="search-globe"><GlobeDrawing /><span>Choose where to look</span></div>
      <div className="search-settings">
        <div className="tray-heading"><h2>Narrow the search</h2></div>
        <div className="search-fields">
          <label className="tray-field"><span>Sources</span><span className="tray-select"><select value={scope} onChange={event => setScope(event.target.value as Scope)}><option>The web</option><option>News</option><option>Primary sources</option></select><ChevronDown size={14} aria-hidden="true" /></span></label>
          <label className="tray-field"><span>Recency</span><span className="tray-select"><select value={recency} onChange={event => setRecency(event.target.value as Recency)}><option>Any time</option><option>Past week</option><option>Past month</option></select><ChevronDown size={14} aria-hidden="true" /></span></label>
        </div>
        <p className="tray-note">Search setup only. No pages are retrieved.</p>
      </div>
    </div>}

    {mode === 'research' && <div className="research-setup tray-reveal" key="research">
      <div className="report-sheet" aria-label={`${format} outline preview`}>
        <div className="report-sheet-title"><span>{format}</span><span className="report-sheet-rule" /></div>
        <ol>{reportSections[format].map((section, index) => <li key={section}><span className="report-node" aria-hidden="true">{index + 1}</span><span>{section}</span></li>)}</ol>
      </div>
      <div className="research-settings">
        <div className="tray-heading"><h2>Shape the research</h2></div>
        <label className="tray-field"><span>Output structure</span><span className="tray-select"><select value={format} onChange={event => setFormat(event.target.value as Format)}><option>Briefing</option><option>Comparison</option><option>Report</option></select><ChevronDown size={14} aria-hidden="true" /></span></label>
        <p className="tray-note">An outline preview, ready for a deeper question.</p>
      </div>
    </div>}

    {mode === 'sketch' && <div className="sketch-setup tray-reveal" key="sketch">
      <div className="sketch-toolbar">
        <h2>Draw the idea</h2>
        <div className="sketch-tools">
          <div className="pen-weights" role="group" aria-label="Pen weight"><button aria-label="Fine pen" aria-pressed={weight === 2} onClick={() => setWeight(2)}><span className="pen-sample pen-fine" /></button><button aria-label="Bold pen" aria-pressed={weight === 4} onClick={() => setWeight(4)}><span className="pen-sample pen-bold" /></button></div>
          <button className="sketch-action" onClick={() => setStrokes(previous => previous.slice(0, -1))} disabled={!strokes.length} aria-label="Undo last stroke"><Undo2 size={17} /></button>
          <button className="sketch-action" onClick={clearSketch} disabled={!strokes.length && !description} aria-label="Clear sketch"><RotateCcw size={16} /></button>
        </div>
      </div>
      <div className="sketch-surface">
        <svg className="sketch-canvas" viewBox="0 0 640 120" preserveAspectRatio="none" onPointerDown={beginStroke} onPointerMove={extendStroke} onPointerUp={finishStroke} onPointerCancel={finishStroke} onLostPointerCapture={finishStroke} role="img" aria-label={description.trim() || `Local sketch with ${strokes.length} strokes`} aria-describedby={sketchDescriptionId}>
          {strokes.map((stroke, index) => <path key={index} d={strokePath(stroke)} strokeWidth={stroke.weight} />)}
          {currentStroke && <path d={strokePath(currentStroke)} strokeWidth={currentStroke.weight} />}
        </svg>
        {!strokes.length && !currentStroke && <div className="sketch-empty" aria-hidden="true"><PenLine size={18} /><span>Draw here, or describe it below</span></div>}
      </div>
      <label className="sketch-description"><span className="sr-only">Describe the drawing instead</span><input type="text" value={description} maxLength={200} onChange={event => setDescription(event.target.value)} placeholder="Or describe your drawing…" /></label>
      <p className="tray-note sketch-note" id={sketchDescriptionId}>{strokes.length >= 80 ? 'Sketch full. Undo or clear to draw again.' : 'Local sketch preview · stays in this tab'}</p>
    </div>}
  </section>;
}
