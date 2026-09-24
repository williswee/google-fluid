'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Undo2 } from 'lucide-react';
import {
  circularOrbit, EARTH_RADIUS_KM, ORBIT_TIME_SCALE,
  gameResult, nextGameMark, playGameMove, trickFromDraft,
  type GameCell, type GameMark, type Trick,
} from '../lib/play-tools';
import './play-tools.css';

function useReducedMotion() {
  // Stay still until the browser preference is known.
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function Orbit() {
  const [mass, setMass] = useState(1);
  const [radius, setRadius] = useState(1.6);
  const [running, setRunning] = useState(true);
  const reduced = useReducedMotion();
  const satellite = useRef<SVGGElement>(null);
  const angle = useRef(-35);
  const id = useId().replace(/:/g, '');
  const orbit = circularOrbit(mass, radius)!;
  const visualRadius = radius * 26;
  const moving = running && !reduced;

  useEffect(() => {
    if (!moving) return;
    let frame = 0;
    let previous = 0;
    const tick = (time: number) => {
      if (previous && !document.hidden) {
        const elapsed = Math.min((time - previous) / 1000, 0.1);
        angle.current = (angle.current + elapsed * 360 * ORBIT_TIME_SCALE / orbit.periodSeconds) % 360;
        satellite.current?.setAttribute('transform', `rotate(${angle.current} 160 126)`);
      }
      previous = time;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [moving, orbit.periodSeconds]);

  function reset() {
    setMass(1); setRadius(1.6); setRunning(true);
    angle.current = -35;
    satellite.current?.setAttribute('transform', 'rotate(-35 160 126)');
  }

  return <div className="play-tools pt-orbit">
    <div className="pt-heading"><h2 className="pt-title">A little more gravity.</h2><span>Interactive orbit</span></div>
    <div className="pt-orbit-layout">
      <div className="pt-orbit-visual">
        <svg className="pt-orbit-scene" viewBox="0 0 320 252" role="img" aria-label={`Circular orbit around an Earth-sized body: ${mass} Earth masses, radius ${radius} Earth radii. Speed ${orbit.speedKmS.toFixed(2)} kilometres per second.`}>
          <defs>
            <radialGradient id={id + '-planet'} cx="30%" cy="25%" r="80%"><stop offset="0" stopColor="#8ed3e7"/><stop offset=".45" stopColor="#408dbd"/><stop offset="1" stopColor="#123b68"/></radialGradient>
            <radialGradient id={id + '-shade'} cx="20%" cy="15%" r="95%"><stop offset=".45" stopColor="#09274b" stopOpacity="0"/><stop offset="1" stopColor="#09274b" stopOpacity=".85"/></radialGradient>
            <clipPath id={id + '-earth'}><circle cx="160" cy="126" r="26"/></clipPath>
          </defs>
          <path d="M24 126h272M160 18v216" stroke="#d5e4ee" strokeWidth=".8" strokeDasharray="2 5"/>
          <circle cx="160" cy="126" r="104" fill="none" stroke="#e0eaf1" strokeDasharray="2 6"/>
          <circle cx="160" cy="126" r={visualRadius} fill="none" stroke="#6096b9" strokeWidth="1.4" strokeDasharray="4 4"/>
          <path d={`M160 126h${visualRadius}`} stroke="#50758f" strokeWidth=".8" opacity=".7"/>
          <circle cx="160" cy="126" r="26" fill={`url(#${id}-planet)`}/>
          <g clipPath={`url(#${id}-earth)`} fill="#90b9a0">
            <path d="M139 106l9-6 7 4 2 7-5 5 4 6-6 5-7-5 1-7-5-3zM157 126l7 3 4 9-4 11-6 7-2-11-4-8zM170 102l12 4 7 11-12 2-5 7-7-5 1-9z"/>
            <path d="m140 102 20-2 15 3-8 2-10-1-8 2z" fill="#e5f2f3" opacity=".8"/>
            <circle cx="160" cy="126" r="26" fill={`url(#${id}-shade)`}/>
          </g>
          <circle cx="160" cy="126" r="26.5" fill="none" stroke="#b3d9e7" strokeWidth=".8"/>
          <g ref={satellite} transform="rotate(-35 160 126)">
            <g transform={`translate(${160 + visualRadius} 126)`}>
              <rect x="-11" y="-4" width="7" height="8" rx="1" fill="#3276a9" stroke="#fff" strokeWidth=".7"/>
              <rect x="4" y="-4" width="7" height="8" rx="1" fill="#3276a9" stroke="#fff" strokeWidth=".7"/>
              <rect x="-4" y="-5" width="8" height="10" rx="2" fill="#f6fafc" stroke="#3a657e" strokeWidth="1"/>
            </g>
          </g>
          <text x="16" y="235" className="pt-svg-note">Earth-sized body</text><text x="304" y="235" textAnchor="end" className="pt-svg-note">Time ×600</text>
        </svg>
        <div className="pt-orbit-actions">
          <button className="pt-button" type="button" disabled={reduced} onClick={() => setRunning(value => !value)}>{moving ? <Pause size={15}/> : <Play size={15}/>} {moving ? 'Pause orbit' : 'Resume orbit'}</button>
          <button className="pt-icon-button" type="button" onClick={reset} aria-label="Reset orbit"><RotateCcw size={17}/></button>
        </div>
      </div>
      <div className="pt-orbit-controls">
        <label className="pt-range-label"><span>Central mass <output>{mass.toFixed(2)} × Earth</output></span><input aria-label="Central mass in Earth masses" type="range" min=".25" max="3" step=".05" value={mass} onChange={event => setMass(Number(event.target.value))}/></label>
        <label className="pt-range-label"><span>Orbital radius <output>{radius.toFixed(2)} × Earth</output></span><input aria-label="Orbital radius in Earth radii" type="range" min="1.15" max="4" step=".05" value={radius} onChange={event => setRadius(Number(event.target.value))}/></label>
        <dl className="pt-orbit-readings"><div><dt>Orbital speed</dt><dd>{orbit.speedKmS.toFixed(2)} <span>km/s</span></dd></div><div><dt>One revolution</dt><dd>{(orbit.periodSeconds / 60).toFixed(1)} <span>min</span></dd></div><div><dt>Altitude</dt><dd>{Math.round(orbit.altitudeKm).toLocaleString('en-US')} <span>km</span></dd></div><div><dt>Gravity here</dt><dd>{orbit.accelerationMS2.toFixed(2)} <span>m/s²</span></dd></div></dl>
        <p className="pt-note">{reduced ? 'Reduced motion is on. The controls and calculations still work.' : 'More mass speeds up an orbit. A larger radius slows it down.'}</p>
      </div>
    </div>
    <details className="pt-details"><summary>How this model works</summary><p>A prebuilt Newtonian model of a circular orbit. Speed is v = √(GM/r); period is T = 2πr/v. The radius is measured from the centre. The body keeps Earth’s radius ({EARTH_RADIUS_KM.toLocaleString('en-US')} km) while its mass changes. Each adjustment sets a new stable orbit; it does not model an engine burn.</p><p>Animation runs at 600× real time. The orbit and planet share a distance scale; the satellite is enlarged so you can see it. No atmosphere, other bodies, eccentricity or relativity. <a href="https://science.nasa.gov/wp-content/uploads/2023/10/Space_Mathematics.pdf" target="_blank" rel="noopener noreferrer">Circular-orbit equations from NASA (PDF)</a>.</p></details>
  </div>;
}

function Mark({mark}: {mark: GameMark}) {
  return <svg viewBox="0 0 48 48" aria-hidden="true">{mark === 'X' ? <path d="m13 13 22 22m0-22L13 35"/> : <circle cx="24" cy="24" r="14"/>}</svg>;
}

function TicTacToe() {
  const [history, setHistory] = useState<readonly (readonly GameCell[])[]>([Array<GameCell>(9).fill(null)]);
  const board = history[history.length - 1];
  const result = gameResult(board);
  const turn = nextGameMark(board);
  const finished = Boolean(result.winner || result.draw);
  const message = result.winner ? `${result.winner} wins this round.` : result.draw ? 'A draw. Well played.' : `${turn}’s turn.`;
  function move(index: number) {
    const next = playGameMove(board, index);
    if (next !== board) setHistory(previous => [...previous, next]);
  }
  return <div className="play-tools pt-game">
    <div className="pt-heading"><h2 className="pt-title">Tic-tac-toe</h2><span>2 players · same device</span></div>
    <div className="pt-game-layout">
      <div className="pt-game-board" role="group" aria-label="Tic-tac-toe board">
        {board.map((mark, index) => <button type="button" className={`pt-game-cell ${mark ? 'pt-mark-' + mark.toLowerCase() : ''}${result.line.includes(index) ? ' is-winner' : ''}`} key={index} aria-label={`Row ${Math.floor(index / 3) + 1}, column ${index % 3 + 1}: ${mark ?? 'empty'}`} aria-disabled={Boolean(mark) || finished} onClick={() => move(index)}>{mark && <Mark mark={mark}/>}</button>)}
      </div>
      <div className="pt-game-copy">
        <div className="pt-game-turn" data-mark={result.winner ?? turn}>{!result.draw && <Mark mark={result.winner ?? turn}/>}<p aria-live="polite" aria-atomic="true">{message}</p></div>
        <p className="pt-note">Take turns placing X and O. Get three in a row, column or diagonal.</p>
        <div className="pt-game-actions"><button className="pt-button" type="button" onClick={() => setHistory([Array<GameCell>(9).fill(null)])}><RotateCcw size={15}/> New game</button><button className="pt-button pt-secondary" type="button" disabled={history.length < 2} onClick={() => setHistory(previous => previous.slice(0, -1))}><Undo2 size={15}/> Undo move</button></div>
        <p className="pt-note pt-game-footnote">Pass the device to your opponent. No computer player.</p>
      </div>
    </div>
  </div>;
}

function EasterEgg({draft}: {draft: string}) {
  const [trick, setTrick] = useState<Trick>(() => trickFromDraft(draft));
  const [phase, setPhase] = useState<'ready' | 'running' | 'done'>('ready');
  const reduced = useReducedMotion();
  useEffect(() => { setTrick(trickFromDraft(draft)); setPhase('ready'); }, [draft]);
  useEffect(() => { if (reduced && phase === 'running') setPhase('done'); }, [reduced, phase]);
  function choose(next: Trick) { setTrick(next); setPhase('ready'); }
  function run() { setPhase(reduced ? 'done' : 'running'); }
  return <div className="play-tools pt-easter">
    <div className="pt-heading"><h2 className="pt-title">A little search mischief.</h2><span>Just for fun</span></div>
    <div className="pt-trick-choices" role="group" aria-label="Choose an Easter egg"><button type="button" aria-pressed={trick === 'barrel'} onClick={() => choose('barrel')}>Barrel roll</button><button type="button" aria-pressed={trick === 'askew'} onClick={() => choose('askew')}>Askew</button></div>
    <div className="pt-trick-stage" data-trick={trick} data-phase={phase} data-reduced={reduced}>
      <div className="pt-trick-object" onAnimationEnd={() => setPhase('done')}>
        <svg viewBox="0 0 180 100" role="img" aria-label="A miniature Fluid search window">
          <rect x=".75" y=".75" width="178.5" height="98.5" rx="15" fill="white" stroke="#cbd9e9" strokeWidth="1.5"/>
          <text x="90" y="42" textAnchor="middle" className="pt-toy-word"><tspan fill="#4285f4">f</tspan><tspan fill="#ea4335">l</tspan><tspan fill="#bf8a00">u</tspan><tspan fill="#4285f4">i</tspan><tspan fill="#34a853">d</tspan></text>
          <rect x="29" y="55" width="122" height="22" rx="11" fill="#f5f8fc" stroke="#dce4ee"/>
          <circle cx="41" cy="65" r="3" fill="none" stroke="#6b809a" strokeWidth="1.3"/><path d="m43 67 3 3" stroke="#6b809a" strokeWidth="1.3"/>
          <path d="M56 66h57" stroke="#ccd8e7" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="140" cy="66" r="6" fill="#4285f4"/>
        </svg>
      </div>
    </div>
    <div className="pt-trick-footer"><div className="pt-trick-actions"><button className="pt-button" type="button" disabled={phase === 'running'} onClick={run}><Play size={15}/>{phase === 'ready' ? (trick === 'barrel' ? 'Do a barrel roll' : 'Make it askew') : 'Replay'}</button><button className="pt-button pt-secondary" type="button" onClick={() => setPhase('ready')}><RotateCcw size={15}/> Reset</button></div><p className="pt-note" aria-live="polite">{reduced ? 'Reduced motion is on. This preview stays still.' : phase === 'running' ? 'There it goes…' : phase === 'done' ? trick === 'askew' ? 'Just a little off-centre.' : 'A full turn. Back where we started.' : 'Only this little window moves.'}</p></div>
  </div>;
}

export default function PlayTools({mode, draft}: {mode: string; draft: string}) {
  if (mode === 'science') return <Orbit/>;
  if (mode === 'game') return <TicTacToe/>;
  if (mode === 'play') return <EasterEgg draft={draft}/>;
  return null;
}
