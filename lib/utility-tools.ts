/** Deliberately small arithmetic grammar. No eval, functions, identifiers or JS. */
export function evaluateExpression(input: string): number | null {
  const source = input.replace(/[×x]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s/g, '');
  if (!source || source.length > 200 || /[^\d.+\-*/^()%]/.test(source)) return null;
  const tokens = source.match(/(?:\d+\.?\d*|\.\d+)|[()+\-*/^%]/g) ?? [];
  if (tokens.join('') !== source || tokens.length > 100) return null;
  let index = 0;
  let depth = 0;
  function primary(): number {
    if (++depth > 24) throw new Error('Too deeply nested');
    let value: number;
    if (tokens[index] === '(') {
      index++;
      value = sum();
      if (tokens[index++] !== ')') throw new Error('Missing parenthesis');
    } else {
      const token = tokens[index++];
      if (!token || !/^(?:\d+\.?\d*|\.\d+)$/.test(token)) throw new Error('Expected number');
      value = Number(token);
    }
    if (tokens[index] === '%') { index++; value /= 100; }
    depth--;
    return value;
  }
  function power(): number {
    const value = primary();
    if (tokens[index] !== '^') return value;
    index++;
    return value ** unary();
  }
  function unary(): number {
    if (tokens[index] === '+') { index++; return unary(); }
    if (tokens[index] === '-') { index++; return -unary(); }
    return power();
  }
  function product(): number {
    let value = unary();
    while (tokens[index] === '*' || tokens[index] === '/') {
      const operator = tokens[index++];
      const right = unary();
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (tokens[index] === '+' || tokens[index] === '-') {
      const operator = tokens[index++];
      const right = product();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }
  try {
    const result = sum();
    return index === tokens.length && Number.isFinite(result) && Math.abs(result) <= 1e15 ? result : null;
  } catch { return null; }
}

export function parseExpression(draft: string): string | null {
  const expression = draft.trim().replace(/^(?:calculate|compute|what is|what's|solve)\s+/i, '').replace(/[=?]+$/, '').trim();
  return evaluateExpression(expression) === null ? null : expression;
}

export function parseTip(draft: string): { bill: number; percent: number; people: number } | null {
  if (!/\b(?:tip|split)\b/i.test(draft)) return null;
  const bill = draft.match(/\$\s*(\d+(?:\.\d{1,2})?)/)?.[1]
    ?? draft.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:dollars?|usd)\b/i)?.[1];
  const percent = draft.match(/\b(\d+(?:\.\d+)?)\s*%/)?.[1];
  const people = draft.match(/\b(?:among|between|for)\s+(\d+)\s*(?:people|friends|persons)?\b/i)?.[1]
    ?? draft.match(/\b(\d+)\s*(?:people|friends|persons)\b/i)?.[1];
  return { bill: bill ? Math.min(Number(bill), 1e7) : 84, percent: percent ? Math.min(Number(percent), 100) : 15, people: people ? Math.max(1, Math.min(100, Number(people))) : 2 };
}

export function calculateTip(bill: number, percent: number, people: number) {
  if (![bill, percent, people].every(Number.isFinite) || bill < 0 || bill > 1e7 || percent < 0 || percent > 100 || !Number.isInteger(people) || people < 1 || people > 100) return null;
  const tipCents = Math.round(bill * percent);
  const billCents = Math.round(bill * 100);
  return { tip: tipCents / 100, total: (billCents + tipCents) / 100, each: (billCents + tipCents) / people / 100 };
}

export function parseDuration(draft: string): number | null {
  if (/-\s*\d/.test(draft)) return null;
  const matches = [...draft.matchAll(/\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/gi)];
  if (!matches.length) return null;
  const seconds = matches.reduce((sum, match) => sum + Number(match[1]) * (/^h/i.test(match[2]) ? 3600 : /^m/i.test(match[2]) ? 60 : 1), 0);
  return seconds > 0 && seconds <= 86400 ? Math.round(seconds * 1000) : null;
}

export function remainingMilliseconds(deadline: number, now: number): number { return Math.max(0, deadline - now); }
export function formatDuration(milliseconds: number, hundredths = false): string {
  const seconds = Math.max(0, hundredths ? Math.floor(milliseconds / 1000) : Math.ceil(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const tail = `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return `${hours ? `${String(hours).padStart(2, '0')}:` : ''}${tail}${hundredths ? `.${String(Math.floor(Math.max(0, milliseconds) % 1000 / 10)).padStart(2, '0')}` : ''}`;
}
export function parseBpm(draft: string): number | null {
  const match = draft.match(/\b(\d+)\s*(?:bpm|beats? per minute)\b/i) ?? draft.match(/\bmetronome\s+(?:at\s+)?(\d+)\b/i);
  if (!match) return null;
  const bpm = Number(match[1]);
  return bpm >= 30 && bpm <= 240 ? bpm : null;
}
const NAMED_COLORS: Record<string, string> = { coral: '#ff7f50', blue: '#4285f4', red: '#ea4335', green: '#34a853', yellow: '#fbbc04', purple: '#9334e6', black: '#000000', white: '#ffffff', teal: '#008080', orange: '#ffa500' };
export function normalizeHex(value: string): string | null {
  const hex = value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(hex)) return '#' + [...hex].map(char => char.repeat(2)).join('').toLowerCase();
  return /^[\da-f]{6}$/i.test(hex) ? '#' + hex.toLowerCase() : null;
}
export function parseColor(draft: string): string | null {
  const hex = draft.match(/#[\da-f]{6}\b|#[\da-f]{3}\b/i)?.[0];
  if (hex) return normalizeHex(hex);
  const color = draft.toLowerCase().match(/\b(coral|blue|red|green|yellow|purple|black|white|teal|orange)\b/)?.[1];
  return color ? NAMED_COLORS[color] : null;
}
export function hexToRgb(hex: string): [number, number, number] {
  const value = normalizeHex(hex) ?? '#4285f4';
  return [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16)];
}
export function rgbToHex(rgb: number[]): string { return '#' + rgb.map(value => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0')).join(''); }
export function colorInk(hex: string): '#000000' | '#ffffff' {
  const [r, g, b] = hexToRgb(hex).map(channel => { const value = channel / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; });
  return .2126 * r + .7152 * g + .0722 * b > .179 ? '#000000' : '#ffffff';
}
