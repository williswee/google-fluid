/** Circular-orbit approximation. NASA Earth facts give GM ≈ 398,600 km³/s². */
export const EARTH_GM_KM3_S2 = 398600;
export const EARTH_RADIUS_KM = 6371;
export const ORBIT_TIME_SCALE = 600;

export function circularOrbit(earthMasses: number, earthRadii: number) {
  if (!Number.isFinite(earthMasses) || !Number.isFinite(earthRadii) || earthMasses <= 0 || earthRadii <= 1) return null;
  const radiusKm = earthRadii * EARTH_RADIUS_KM;
  const gravitationalParameter = earthMasses * EARTH_GM_KM3_S2;
  const speedKmS = Math.sqrt(gravitationalParameter / radiusKm);
  const periodSeconds = 2 * Math.PI * radiusKm / speedKmS;
  return {
    radiusKm,
    altitudeKm: radiusKm - EARTH_RADIUS_KM,
    speedKmS,
    periodSeconds,
    accelerationMS2: gravitationalParameter / radiusKm ** 2 * 1000,
  };
}

export type GameMark = 'X' | 'O';
export type GameCell = GameMark | null;
export const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
] as const;

export function gameResult(board: readonly GameCell[]): { winner: GameMark | null; line: readonly number[]; draw: boolean } {
  for (const line of WINNING_LINES) {
    const mark = board[line[0]];
    if (mark && line.every(index => board[index] === mark)) return { winner: mark, line, draw: false };
  }
  return { winner: null, line: [], draw: board.length === 9 && board.every(Boolean) };
}

export function nextGameMark(board: readonly GameCell[]): GameMark {
  return board.filter(Boolean).length % 2 === 0 ? 'X' : 'O';
}

/** Invalid or completed moves preserve the current board. */
export function playGameMove(board: readonly GameCell[], index: number): readonly GameCell[] {
  const result = gameResult(board);
  if (board.length !== 9 || !Number.isInteger(index) || index < 0 || index > 8 || board[index] || result.winner || result.draw) return board;
  return board.map((cell, position) => position === index ? nextGameMark(board) : cell);
}

export type Trick = 'barrel' | 'askew';
export function trickFromDraft(draft: string): Trick {
  return /\baskew\b/i.test(draft) ? 'askew' : 'barrel';
}
