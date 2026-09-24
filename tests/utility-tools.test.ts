import { describe, expect, it } from 'vitest';
import { calculateTip, colorInk, evaluateExpression, formatDuration, hexToRgb, normalizeHex, parseBpm, parseColor, parseDuration, parseExpression, parseTip, remainingMilliseconds, rgbToHex } from '../lib/utility-tools';

describe('bounded arithmetic', () => {
  it.each([['24 * 18', 432], ['2 + 3 * 4', 14], ['(2+3)*4', 20], ['2^3^2', 512], ['-2^2', -4], ['2^-2', .25], ['200 * 15%', 30], ['.5 + 0.25', .75], ['9 ÷ 3 × 2', 6]])('computes %s', (expression, result) => expect(evaluateExpression(expression)).toBe(result));
  it.each(['alert(1)', 'Math.sqrt(4)', '1/0', '0/0', '1e100', '2**4', '2(3)', '1.2.3', '2+','((((2)', '2^9999', '1;2', 'x=4', '('.repeat(25)+'1'+')'.repeat(25)])('rejects unsafe or invalid input %s', expression => expect(evaluateExpression(expression)).toBeNull());
  it('parses bounded natural wrappers without extracting unrelated numbers', () => {
    expect(parseExpression('What is 24 * 18?')).toBe('24 * 18');
    expect(parseExpression('24 * 18 apples')).toBeNull();
  });
});
describe('bill and tip', () => {
  it('parses a bill, tip and split', () => expect(parseTip('Split $84 with 15% tip between 3 people')).toEqual({ bill: 84, percent: 15, people: 3 }));
  it('calculates monetary totals in cents', () => expect(calculateTip(84, 15, 2)).toEqual({ tip: 12.6, total: 96.6, each: 48.3 }));
  it('rejects invalid split or amounts', () => { expect(calculateTip(10, 10, 0)).toBeNull(); expect(calculateTip(NaN, 10, 2)).toBeNull(); expect(calculateTip(10, 10, 1.5)).toBeNull(); });
});
describe('clocks', () => {
  it('parses combined durations and decimals', () => { expect(parseDuration('timer 1 hour 2 minutes 3 seconds')).toBe(3723000); expect(parseDuration('timer 1.5 minutes')).toBe(90000); });
  it.each(['timer', 'timer -5 minutes', 'timer 0 seconds', 'timer 25 hours'])('rejects unspecified or out of range duration %s', query => expect(parseDuration(query)).toBeNull());
  it('formats countdown with ceiling and stopwatch with hundredths', () => { expect(formatDuration(1)).toBe('00:01'); expect(formatDuration(61234, true)).toBe('01:01.23'); expect(formatDuration(3600000)).toBe('01:00:00'); expect(formatDuration(-4)).toBe('00:00'); });
  it('uses the deadline, not tick counts, after a delayed tick', () => { expect(remainingMilliseconds(10000, 9800)).toBe(200); expect(remainingMilliseconds(10000, 12000)).toBe(0); });
  it('bounds the metronome', () => { expect(parseBpm('metronome at 80 bpm')).toBe(80); expect(parseBpm('metronome 120')).toBe(120); expect(parseBpm('300 bpm')).toBeNull(); });
});
describe('color values', () => {
  it('accepts hex and curated names', () => { expect(parseColor('color picker #4285f4')).toBe('#4285f4'); expect(parseColor('coral color')).toBe('#ff7f50'); expect(normalizeHex('#f00')).toBe('#ff0000'); expect(normalizeHex('zzzzzz')).toBeNull(); });
  it('round-trips channels and picks legible text', () => { expect(rgbToHex(hexToRgb('#4285f4'))).toBe('#4285f4'); expect(colorInk('#ffffff')).toBe('#000000'); expect(colorInk('#000000')).toBe('#ffffff'); });
});
