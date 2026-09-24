import { describe, expect, it } from 'vitest';
import { convertValue, parseConversion, unitGroup } from '../lib/conversion';

describe('local unit conversions', () => {
  it('converts the example accurately and reverses the result', () => {
    const miles = convertValue(10, 'km', 'mi');
    expect(miles).toBeCloseTo(6.2137119223733395, 12);
    expect(convertValue(miles!, 'mi', 'km')).toBeCloseTo(10, 12);
  });

  it.each([
    [1, 'ft', 'in', 12],
    [100, 'cm', 'm', 1],
    [1, 'lb', 'oz', 16],
    [1, 'kg', 'g', 1000],
    [32, 'F', 'C', 0],
    [100, 'C', 'F', 212],
    [273.15, 'K', 'C', 0],
    [-40, 'C', 'F', -40],
  ] as const)('converts %s %s to %s', (amount, from, to, expected) => {
    expect(convertValue(amount, from, to)).toBeCloseTo(expected, 10);
  });

  it('accepts absolute zero in every temperature scale', () => {
    expect(convertValue(-273.15, 'C', 'K')).toBeCloseTo(0, 10);
    expect(convertValue(-459.67, 'F', 'K')).toBeCloseTo(0, 10);
    expect(convertValue(0, 'K', 'F')).toBeCloseTo(-459.67, 10);
  });

  it.each([
    [-273.16, 'C', 'F'],
    [-459.68, 'F', 'K'],
    [-0.01, 'K', 'C'],
  ] as const)('rejects temperatures below absolute zero: %s %s', (amount, from, to) => {
    expect(convertValue(amount, from, to)).toBeNull();
  });

  it('rejects non-finite numbers and unrelated unit groups', () => {
    expect(convertValue(NaN, 'km', 'mi')).toBeNull();
    expect(convertValue(Infinity, 'C', 'F')).toBeNull();
    expect(convertValue(-Infinity, 'kg', 'lb')).toBeNull();
    expect(convertValue(2, 'km', 'kg')).toBeNull();
    expect(convertValue(2, 'kg', 'C')).toBeNull();
  });

  it('identifies measurement families for compatible selectors', () => {
    expect(unitGroup('mi')).toBe('Length');
    expect(unitGroup('oz')).toBe('Weight');
    expect(unitGroup('F')).toBe('Temperature');
  });
});

describe('conversion query parsing', () => {
  it.each([
    ['10 km in miles', { value: 10, from: 'km', to: 'mi' }],
    ['Convert 2.5 kilograms to pounds', { value: 2.5, from: 'kg', to: 'lb' }],
    ['32 °F into °C', { value: 32, from: 'F', to: 'C' }],
    ['-40 celsius as fahrenheit', { value: -40, from: 'C', to: 'F' }],
    ['1000 metres to kilometers', { value: 1000, from: 'm', to: 'km' }],
  ])('parses %s', (query, expected) => {
    expect(parseConversion(query as string)).toEqual(expected);
  });

  it.each(['100 USD in SGD', '$10 to euros', 'convert money', '10 km in kg', '-1 K to C', '-300 C to F', 'a few miles to km', '', '10 unknown to miles'])('does not invent a conversion for %s', query => {
    expect(parseConversion(query)).toBeNull();
  });
});
