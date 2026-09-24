'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUp, Pause, Play, RotateCcw } from 'lucide-react';
import { createDinoRun, DINO, jumpDino, stepDino, type DinoObstacle, type DinoRun } from '../lib/dino-game';
import './dino-game.css';

type Phase = 'ready' | 'running' | 'paused' | 'crashed';
type PauseReason = 'manual' | 'focus' | 'hidden';

function Dinosaur({ crashed, airborne, stride }: { crashed: boolean; airborne: boolean; stride: boolean }) {
  // Original pixel drawing. The square snout, stepped tail and feet are drawn here.
  return <g fill="currentColor" shapeRendering="crispEdges">
    <path d="M17 1h13v3h4v12H23v5h5v3h-8v7H8v-4H4v-5H0v-8h4v6h5v-5h5V8h3z"/>
    <path d="M10 29h6v5h-2v4H8v-3h2z" transform={!airborne && stride ? 'translate(0 -3)' : undefined}/>
    <path d="M20 28h5v7h5v3H19v-5h1z" transform={!airborne && !stride ? 'translate(0 -3)' : undefined}/>
    {crashed ? <path d="m24 5 5 5m0-5-5 5" fill="none" stroke="white" strokeWidth="1.5"/> : <rect x="25" y="5" width="3" height="3" fill="white"/>}
    <path d="M28 13h6" stroke="white" strokeWidth="1"/>
  </g>;
}

function Cactus({ obstacle }: { obstacle: Pick<DinoObstacle, 'x' | 'width' | 'height'> }) {
  const { x, width, height } = obstacle;
  const stem = Math.max(5, Math.round(width * .34));
  const centre = Math.round((width - stem) / 2);
  return <g className="dino-cactus" transform={`translate(${x} ${DINO.groundY - height})`} fill="currentColor" shapeRendering="crispEdges">
    <rect x={centre} y="0" width={stem} height={height}/>
    <rect x="0" y={Math.round(height * .3)} width={Math.max(4, stem - 1)} height={Math.round(height * .35)}/>
    <rect x="0" y={Math.round(height * .57)} width={centre + stem} height="5"/>
    <rect x={width - Math.max(4, stem - 1)} y={Math.round(height * .18)} width={Math.max(4, stem - 1)} height={Math.round(height * .35)}/>
    <rect x={centre} y={Math.round(height * .44)} width={width - centre} height="5"/>
  </g>;
}

export default function DinoGame() {
  const [phase, setPhase] = useState<Phase>('ready');
  const [run, setRun] = useState<DinoRun>(() => createDinoRun(560));
  const [worldWidth, setWorldWidth] = useState(560);
  const [pauseReason, setPauseReason] = useState<PauseReason>('manual');
  const [reducedMotion, setReducedMotion] = useState(true);
  const wrapper = useRef<HTMLElement>(null);
  const arena = useRef<HTMLDivElement>(null);
  const runRef = useRef(run);
  const phaseRef = useRef<Phase>('ready');
  const widthRef = useRef(560);
  const id = useId();

  function changePhase(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }
  function pause(reason: PauseReason) {
    if (phaseRef.current !== 'running') return;
    setPauseReason(reason);
    changePhase('paused');
  }
  function focusArena() { arena.current?.focus({ preventScroll: true }); }
  function start() {
    const next = createDinoRun(widthRef.current);
    runRef.current = next;
    setRun(next);
    changePhase('running');
    focusArena();
  }
  function resume() {
    changePhase('running');
    focusArena();
  }
  function jump() {
    if (phaseRef.current !== 'running') return;
    const next = jumpDino(runRef.current);
    runRef.current = next;
    setRun(next);
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
    if (event.key === ' ' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!event.repeat) jump();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      pause('manual');
    }
  }

  useLayoutEffect(() => {
    const element = arena.current;
    if (!element) return;
    const measure = () => {
      const width = Math.max(240, Math.round(element.clientWidth));
      widthRef.current = width;
      setWorldWidth(width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const hidden = () => { if (document.hidden) pause('hidden'); };
    const blurred = () => pause('focus');
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', blurred);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('blur', blurred);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    let frame = 0;
    let previous: number | null = null;
    const tick = (now: number) => {
      if (phaseRef.current !== 'running') return;
      if (document.hidden) { pause('hidden'); return; }
      if (previous !== null) {
        // The pure engine caps and substeps elapsed time, including delayed frames.
        const next = stepDino(runRef.current, (now - previous) / 1000, widthRef.current);
        runRef.current = next;
        setRun(next);
        if (next.crashed) { changePhase('crashed'); return; }
      }
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  const airborne = run.jumpHeight > 0;
  const stride = phase === 'running' && !reducedMotion && Math.floor(run.distance / 18) % 2 === 0;
  const groundOffset = reducedMotion ? 0 : run.distance % 44;
  const cloudOffset = reducedMotion ? 0 : run.distance * .09 % (worldWidth + 100);
  const status = phase === 'ready' ? 'Ready. Start the game, then jump over the cacti.'
    : phase === 'running' ? 'Running. Jump over the cacti.'
    : phase === 'crashed' ? `Game over. Score ${run.score}. Restart to try again.`
    : pauseReason === 'hidden' ? 'Paused while the tab was hidden. Resume when you’re ready.'
    : pauseReason === 'focus' ? 'Paused when you left the game. Resume when you’re ready.'
    : 'Paused. Resume when you’re ready.';

  return <section ref={wrapper} className="dino-game" data-state={phase} data-reduced-motion={reducedMotion} aria-label="Dinosaur game" onBlurCapture={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) pause('focus');
  }}>
    <div className="dino-heading"><h2 className="dino-title">Dinosaur run</h2><div className="dino-score"><span>Score</span><output aria-label="Score" aria-live="off">{String(run.score).padStart(5, '0')}</output></div></div>
    <div ref={arena} className="dino-arena" tabIndex={0} role="group" aria-label="Dinosaur runner" aria-describedby={id + '-instructions'} onKeyDown={keyboard} onPointerDown={event => {
      if (event.button !== 0) return;
      focusArena();
      jump();
    }}>
      <svg className="dino-scene" viewBox={`0 0 ${worldWidth} ${DINO.worldHeight}`} height={DINO.worldHeight} aria-hidden="true" focusable="false">
        <g className="dino-sky" shapeRendering="crispEdges">
          <path d="M-18 0h12v-6h15v6h13v6h-40z" transform={`translate(${worldWidth + 35 - cloudOffset} 43)`}/>
          <path d="M-20 0h10v-7h13v-5h10v12h10v6h-43z" transform={`translate(${worldWidth * .52 - cloudOffset * .45} 69)`}/>
          <path d={`M${worldWidth - 58} 27h13v13h-13z`} className="dino-sun"/>
        </g>
        <path className="dino-horizon" d={`M0 ${DINO.groundY}H${worldWidth}`}/>
        <g className="dino-ground" transform={`translate(${-groundOffset} 0)`} shapeRendering="crispEdges">
          {Array.from({ length: Math.ceil(worldWidth / 44) + 2 }, (_, index) => <path key={index} d={`M${index * 44 + 3} ${DINO.groundY + 7}h12m15 7h5`}/>)}
        </g>
        {phase === 'ready' ? <Cactus obstacle={{ x: worldWidth - 52, width: 21, height: 34 }}/> : run.obstacles.map(obstacle => <Cactus obstacle={obstacle} key={obstacle.id}/>)}
        <g className="dino-player" data-grounded={!airborne} transform={`translate(${DINO.x} ${DINO.groundY - DINO.height - run.jumpHeight})`}>
          <Dinosaur crashed={phase === 'crashed'} airborne={airborne} stride={stride}/>
        </g>
      </svg>
      {phase !== 'running' && <div className="dino-overlay" aria-hidden="true"><span>{phase === 'ready' ? 'One small leap.' : phase === 'paused' ? 'Paused' : 'Nice run.'}</span><p>{phase === 'ready' ? 'Start when you’re ready.' : phase === 'paused' ? 'Your run is waiting.' : 'Give it another go.'}</p></div>}
    </div>
    <div className="dino-controls">
      <button className="dino-primary" type="button" onClick={() => {
        if (phase === 'running') pause('manual');
        else if (phase === 'paused') resume();
        else start();
      }}>{phase === 'running' ? <Pause size={16}/> : phase === 'crashed' ? <RotateCcw size={16}/> : <Play size={16}/>} {phase === 'ready' ? 'Start game' : phase === 'running' ? 'Pause' : phase === 'paused' ? 'Resume' : 'Restart'}</button>
      <button className="dino-jump" type="button" disabled={phase !== 'running'} onClick={() => { focusArena(); jump(); }}><ArrowUp size={16}/> Jump</button>
      {phase !== 'crashed' && <button className="dino-restart" type="button" disabled={phase === 'ready'} onClick={start}><RotateCcw size={16}/> Restart</button>}
    </div>
    <p className="dino-instructions" id={id + '-instructions'}><kbd>Space</kbd> or <kbd>↑</kbd> to jump. Tap the track or use Jump. <kbd>Esc</kbd> pauses.</p>
    <p className="dino-status" role="status" aria-live="polite" aria-atomic="true">{status}</p>
    {reducedMotion && <p className="dino-motion-note">Reduced motion is on. Only gameplay moves after you press Start.</p>}
  </section>;
}
