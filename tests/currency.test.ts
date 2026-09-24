import { describe,it,expect } from 'vitest';
import { parseCurrency,validRate } from '../lib/currency';
describe('currency parameters',()=>{
  it.each(['100 USD to EUR','$100 in EUR','convert 100 USD into EUR'])('parses %s',q=>expect(parseCurrency(q)).toEqual({amount:100,from:'USD',to:'EUR'}));
  it.each(['USD 100 EUR to GBP','100 GBP to JPY','100 dollars to EUR','price USD','100 USD to EUR and send money'])('rejects unsupported or ambiguous %s',q=>expect(parseCurrency(q)).toBeNull());
  it('rejects mismatched or invalid rates',()=>{expect(validRate({base:'EUR',quote:'USD',rate:1.2,date:'2026-09-24'},'USD','EUR')).toBe(false);expect(validRate({base:'USD',quote:'EUR',rate:-1,date:'2026-09-24'},'USD','EUR')).toBe(false);});
});
