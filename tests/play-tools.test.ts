import { describe, expect, it } from 'vitest';
import { circularOrbit, EARTH_GM_KM3_S2, EARTH_RADIUS_KM, gameResult, nextGameMark, playGameMove, trickFromDraft, WINNING_LINES, type GameCell } from '../lib/play-tools';

describe('circular-orbit model', () => {
  it('matches the approximate speed and period of a 400 km Earth orbit', () => {
    const orbit = circularOrbit(1, (EARTH_RADIUS_KM + 400) / EARTH_RADIUS_KM)!;
    expect(orbit.altitudeKm).toBeCloseTo(400, 8);
    expect(orbit.speedKmS).toBeCloseTo(7.6726, 3);
    expect(orbit.periodSeconds / 60).toBeCloseTo(92.4143, 2);
    expect(orbit.accelerationMS2).toBeCloseTo(8.694, 2);
  });
  it('obeys mass and radius scaling instead of just changing the illustration', () => {
    const baseline = circularOrbit(1, 2)!;
    const heavy = circularOrbit(4, 2)!;
    const distant = circularOrbit(1, 8)!;
    expect(heavy.speedKmS / baseline.speedKmS).toBeCloseTo(2, 10);
    expect(heavy.periodSeconds / baseline.periodSeconds).toBeCloseTo(.5, 10);
    expect(distant.speedKmS / baseline.speedKmS).toBeCloseTo(.5, 10);
    expect(distant.periodSeconds / baseline.periodSeconds).toBeCloseTo(8, 10);
    expect(distant.accelerationMS2 / baseline.accelerationMS2).toBeCloseTo(1 / 16, 10);
    expect(baseline.speedKmS ** 2 * baseline.radiusKm).toBeCloseTo(EARTH_GM_KM3_S2, 5);
  });
  it.each([[0, 2], [-1, 2], [1, 1], [1, .5], [NaN, 2], [1, Infinity], [Infinity, 2]])('rejects impossible input %s, %s', (mass, radius) => {
    expect(circularOrbit(mass, radius)).toBeNull();
  });
});

describe('local tic-tac-toe', () => {
  it.each(WINNING_LINES)('recognizes a winning line %j', (...line) => {
    const board = Array<GameCell>(9).fill(null);
    line.forEach(index => { board[index] = 'O'; });
    expect(gameResult(board)).toEqual({ winner: 'O', line, draw: false });
  });
  it('alternates turns and does not mutate previous positions', () => {
    const start = Array<GameCell>(9).fill(null);
    const first = playGameMove(start, 4);
    const second = playGameMove(first, 0);
    expect(start.every(cell => cell === null)).toBe(true);
    expect(first[4]).toBe('X');
    expect(second[0]).toBe('O');
    expect(nextGameMark(second)).toBe('X');
    expect(gameResult(second)).toEqual({winner: null, line: [], draw: false});
  });
  it('recognizes a full-board draw and rejects further moves', () => {
    const board: GameCell[] = ['X','O','X','X','O','O','O','X','X'];
    expect(gameResult(board)).toEqual({winner: null, line: [], draw: true});
    expect(playGameMove(board, 0)).toBe(board);
  });
  it('ends a round as soon as a player wins, even when empty cells remain', () => {
    let board: readonly GameCell[] = Array<GameCell>(9).fill(null);
    for (const move of [0, 3, 1, 4, 2]) board = playGameMove(board, move);
    expect(gameResult(board).winner).toBe('X');
    expect(playGameMove(board, 8)).toBe(board);
    expect(gameResult(board).draw).toBe(false);
  });
  it('ignores occupied squares and invalid positions', () => {
    const board: GameCell[] = ['X',null,null,null,null,null,null,null,null];
    for (const invalid of [0, -1, 9, 1.5, NaN]) expect(playGameMove(board, invalid)).toBe(board);
  });
});

describe('Easter egg variation', () => {
  it('chooses only the requested prebuilt variant inside the play tool', () => {
    expect(trickFromDraft('make it ASKEW')).toBe('askew');
    expect(trickFromDraft('do a barrel roll')).toBe('barrel');
    expect(trickFromDraft('playful search')).toBe('barrel');
    expect(trickFromDraft('unaskewed')).toBe('barrel');
  });
});
