import {describe,it,expect} from 'vitest';
import {MODES} from '../lib/intent';
import {SEARCH_EXAMPLES,filterExamples} from '../lib/search-presets';
describe('search discovery',()=>{
 it('gives every example a distinct, meaningful title while retaining all modes',()=>{
  const titles=SEARCH_EXAMPLES.map(x=>x.title);
  expect(titles.every(Boolean)).toBe(true);
  expect(new Set(titles).size).toBe(titles.length);
  expect(new Set(SEARCH_EXAMPLES.map(x=>x.mode))).toEqual(new Set(MODES));
 });
 it('finds examples by distinct title as well as category and query',()=>{
  expect(filterExamples('tip bill').map(x=>x.id)).toContain('calculate-2');
  expect(filterExamples('convert').map(x=>x.id)).toEqual(['convert','convert-2']);
  expect(filterExamples('weather').map(x=>x.id)).toEqual(['weather','weather-2']);
  expect(filterExamples('color picker')).toHaveLength(2);
 });
});
