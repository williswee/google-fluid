import {describe,it,expect} from 'vitest';
import {compoundGrowth,parseGrowthInputs,newsSearch,marketSearch} from '../lib/market-tools';
describe('compound growth',()=>{
 it('matches zero-rate contributions and monthly compounding',()=>{
  expect(compoundGrowth(1000,100,0,10)?.at(-1)).toEqual({year:10,balance:13000,contributed:13000});
  expect(compoundGrowth(1000,0,12,1)?.at(-1)?.balance).toBeCloseTo(1000*1.01**12,8);
  expect(compoundGrowth(0,100,12,1)?.at(-1)?.balance).toBeCloseTo(100*((1.01**12-1)/.01),8);
 });
 it('seeds explicit amounts, rates and years while keeping other inputs editable',()=>{expect(parseGrowthInputs('compound $2,000 at 4% for 12 years')).toEqual({initial:'2000',rate:'4',years:'12',monthly:'100'});});
 it('supports losses and rejects invalid or unbounded inputs',()=>{
  expect(compoundGrowth(1000,0,-20,1)?.at(-1)?.balance).toBeLessThan(1000);
  for(const value of [NaN,Infinity,-1,1e8])expect(compoundGrowth(value,100,5,10)).toBeNull();
  expect(compoundGrowth(1,1,1,2.5)).toBeNull();expect(compoundGrowth(1,1,1,51)).toBeNull();
 });
});
describe('market and news searches',()=>{
 it('encodes topic/source/recency/sort without letting text replace the URL',()=>{
  const url=new URL(newsSearch('rockets & Mars','Reuters','Past day','Latest coverage','Singapore'));
  expect(url.origin).toBe('https://www.google.com');expect(url.searchParams.get('tbm')).toBe('nws');expect(url.searchParams.get('tbs')).toBe('qdr:d,sbd:1');expect(url.searchParams.get('q')).toBe('rockets & Mars site:reuters.com Singapore');
 });
 it('includes every chosen market filter',()=>{
  expect(new URL(marketSearch('AAPL','Earnings','1 year')).searchParams.get('q')).toBe('AAPL earnings 1 year');
 });
});
