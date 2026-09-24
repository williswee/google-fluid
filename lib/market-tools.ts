export type GrowthPoint = { year: number; balance: number; contributed: number };
export function compoundGrowth(initial: number, monthly: number, annualPercent: number, years: number): GrowthPoint[] | null {
  if (![initial,monthly,annualPercent,years].every(Number.isFinite) || initial < 0 || initial > 1e7 || monthly < 0 || monthly > 1e6 || annualPercent < -50 || annualPercent > 50 || !Number.isInteger(years) || years < 1 || years > 50) return null;
  const points: GrowthPoint[] = [{year:0,balance:initial,contributed:initial}];
  let balance=initial;
  for(let month=1;month<=years*12;month++) { balance=balance*(1+annualPercent/1200)+monthly; if(month%12===0)points.push({year:month/12,balance,contributed:initial+monthly*month}); }
  return points;
}
export function marketSearch(query:string,view:string,period:string) {
  const url=new URL('https://www.google.com/search');url.searchParams.set('q',[query.trim(),view.toLowerCase(),period==='All time'?'':period].filter(Boolean).join(' '));return url.toString();
}
export const NEWS_SOURCES = { All:'', Reuters:'reuters.com', AP:'apnews.com', BBC:'bbc.com' } as const;
export const NEWS_PERIODS = { 'Any time':'', 'Past day':'d', 'Past week':'w', 'Past month':'m' } as const;
export function newsSearch(topic:string,source:keyof typeof NEWS_SOURCES,period:keyof typeof NEWS_PERIODS,view:string,region:string) {
 const url=new URL('https://www.google.com/search');
 url.searchParams.set('q',[topic.trim(),NEWS_SOURCES[source]?`site:${NEWS_SOURCES[source]}`:'',view==='Explainers'?'explained':'',region==='World'?'':region].filter(Boolean).join(' '));
 url.searchParams.set('tbm','nws');const filters=[NEWS_PERIODS[period]?`qdr:${NEWS_PERIODS[period]}`:'',view==='Latest coverage'?'sbd:1':''].filter(Boolean);if(filters.length)url.searchParams.set('tbs',filters.join(','));
 return url.toString();
}

export function parseGrowthInputs(draft:string) {
 const amount = /(?:\$|USD\s*)\s*([\d,]+(?:\.\d+)?)/i.exec(draft);
 const years = /([0-9]+)\s*years?/i.exec(draft);
 const rate = /(-?\d+(?:\.\d+)?)\s*%/.exec(draft);
 return { initial:amount?amount[1].replaceAll(',',''):'1000', years:years?.[1]??'10', rate:rate?.[1]??'5', monthly:'100' };
}
