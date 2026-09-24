import { describe, expect, it } from 'vitest';
import { buildGoogleSearchUrl, parseSearchSyntax, removeSearchToken, upsertSearchOperator } from '../lib/search-syntax';

describe('literal local search syntax', () => {
  it.each(['', 'weather in Singapore', 'stocks and maps', 'define a new product', 'news this week', 'PDF report on climate change', 'convert 32 F to C', 'temperature -5 degrees', "don't change this", 'ordinary (parenthetical) wording', 'constructor:unknown toString:unknown'])('leaves natural-language intent to Jev: %s', draft => {
    expect(parseSearchSyntax(draft).mode).toBeNull();
  });

  it.each([
    ['site:example.com', 'site', 'site', 'example.com', 'operator'],
    ['filetype:pdf', 'documents', 'filetype', 'pdf', 'operator'],
    ['ext:csv', 'documents', 'filetype', 'csv', 'syntax'],
    ['after:2025-01-01', 'date', 'after', '2025-01-01', 'operator'],
    ['before:2026', 'date', 'before', '2026', 'operator'],
    ['intitle:report', 'precise', 'intitle', 'report', 'syntax'],
    ['allintitle:report', 'precise', 'allintitle', 'report', 'syntax'],
    ['inurl:docs', 'precise', 'inurl', 'docs', 'syntax'],
    ['allinurl:docs', 'precise', 'allinurl', 'docs', 'syntax'],
    ['intext:climate', 'precise', 'intext', 'climate', 'syntax'],
    ['allintext:climate', 'precise', 'allintext', 'climate', 'syntax'],
    ['weather:Singapore', 'weather', 'weather', 'Singapore', 'intent-shorthand'],
    ['stocks:AAPL', 'finance', 'stocks', 'AAPL', 'intent-shorthand'],
    ['map:Singapore', 'places', 'map', 'Singapore', 'intent-shorthand'],
    ['movie:Arrival', 'movies', 'movie', 'Arrival', 'intent-shorthand'],
    ['define:serendipity', 'define', 'define', 'serendipity', 'intent-shorthand'],
    ['source:Reuters', 'news', 'source', 'Reuters', 'intent-shorthand'],
  ])('recognizes %s without presenting a shorthand as a confirmed operator', (draft, mode, key, value, provenance) => {
    const parsed = parseSearchSyntax(draft);
    expect(parsed.mode).toBe(mode);
    expect(parsed.tokens).toEqual([expect.objectContaining({ raw: draft, start: 0, end: draft.length, key, value, provenance, complete: true })]);
  });

  it('allows a typed prefix to open its setup before the value is finished', () => {
    expect(parseSearchSyntax('site:')).toMatchObject({ mode: 'site', tokens: [{ raw: 'site:', value: '', complete: false }] });
    expect(parseSearchSyntax('site: filetype:')).toMatchObject({ mode: 'documents', tokens: [{ value: '', complete: false }, { value: '', complete: false }] });
    expect(parseSearchSyntax('sit').mode).toBeNull();
  });

  it('preserves modifiers and prioritizes a shorthand, then documents, site, date, precision', () => {
    const parsed = parseSearchSyntax('"annual report" after:2025 site:gov filetype:pdf');
    expect(parsed.mode).toBe('documents');
    expect(parsed.tokens.map(token => token.key)).toEqual(['exact', 'after', 'site', 'filetype']);
    expect(parseSearchSyntax('weather:Singapore filetype:pdf').mode).toBe('weather');
    expect(parseSearchSyntax('movie:Arrival weather:Paris').mode).toBe('movies');
    expect(parseSearchSyntax('after:2025 site:gov').mode).toBe('site');
  });

  it.each(['"site:example.com"', '“site:example.com”', "'site:example.com'", '‘site:example.com’', '"site:example.com', '“site:example.com'])('does not interpret operators inside a quotation: %s', draft => {
    const parsed = parseSearchSyntax(draft);
    expect(parsed.mode).not.toBe('site');
    expect(parsed.tokens).toHaveLength(1);
    expect(parsed.tokens[0].raw).toBe(draft);
    expect(parsed.tokens[0].key).not.toBe('site');
  });

  it('protects unknown quoted syntax and escaped quotes from accidental nested operators', () => {
    expect(parseSearchSyntax('custom:"site:gov filetype:pdf"').tokens).toEqual([]);
    expect(parseSearchSyntax('"say \\"site:gov\\" now"').tokens).toHaveLength(1);
    expect(parseSearchSyntax('https://example.com/?q=site:gov').mode).toBeNull();
    expect(parseSearchSyntax('parasite:example.com').mode).toBeNull();
  });

  it('parses quoted operator values without leaking nested syntax into separate tokens', () => {
    const parsed = parseSearchSyntax('intitle:"site:gov report" site:“example.com”');
    expect(parsed.tokens.map(token => [token.key, token.value])).toEqual([['intitle', 'site:gov report'], ['site', 'example.com']]);
    expect(parseSearchSyntax('site:"example.com').tokens[0].complete).toBe(false);
  });

  it('recognizes exclusion, grouping, boolean joins and standalone wildcard', () => {
    const parsed = parseSearchSyntax('(coffee OR tea) AND * -instant -"cold brew" a|b');
    expect(parsed.mode).toBe('precise');
    expect(parsed.tokens.map(token => token.kind)).toEqual(['group', 'boolean', 'group', 'boolean', 'wildcard', 'exclusion', 'exclusion', 'boolean']);
    expect(parsed.tokens.filter(token => token.kind === 'exclusion').map(token => token.value)).toEqual(['instant', 'cold brew']);
    expect(parseSearchSyntax('coffee or tea and milk').mode).toBeNull();
    expect(parseSearchSyntax('2*4').mode).toBeNull();
    expect(parseSearchSyntax('-site:example.com').mode).toBe('precise');
  });

  it('records removed operators but never routes from them', () => {
    expect(parseSearchSyntax('cache:example.com related:example.com cache:other.test')).toMatchObject({ mode: null, deprecated: ['cache:', 'related:'] });
    expect(parseSearchSyntax('cache:example.com site:gov').mode).toBe('site');
    expect(parseSearchSyntax('"related:example.com"').deprecated).toEqual([]);
  });

  it('tracks exact UTF-16 spans through emoji and multilingual text', () => {
    const draft = '🌧️ 東京 site:例え.jp filetype:pdf';
    const parsed = parseSearchSyntax(draft);
    for (const token of parsed.tokens) expect(draft.slice(token.start, token.end)).toBe(token.raw);
    expect(parsed.tokens[0].start).toBe(draft.indexOf('site:'));
    expect(removeSearchToken(draft, parsed.tokens[0])).toBe('🌧️ 東京 filetype:pdf');
  });
});

describe('non-destructive query editing', () => {
  it('removes only the selected span and one redundant separator', () => {
    const draft = 'climate site:gov\nunknown:retain filetype:pdf';
    const [site, filetype] = parseSearchSyntax(draft).tokens;
    expect(removeSearchToken(draft, site)).toBe('climate \nunknown:retain filetype:pdf');
    expect(removeSearchToken(draft, filetype)).toBe('climate site:gov\nunknown:retain');
    expect(removeSearchToken('site:gov climate', parseSearchSyntax('site:gov climate').tokens[0])).toBe('climate');
  });

  it('ignores stale or invalid token positions', () => {
    const token = parseSearchSyntax('site:gov climate').tokens[0];
    expect(removeSearchToken('new site:gov climate', token)).toBe('new site:gov climate');
    expect(removeSearchToken('anything', { start: -1, end: 5, raw: 'thing' })).toBe('anything');
    expect(removeSearchToken('anything', { start: 0, end: 99, raw: 'anything' })).toBe('anything');
    expect(removeSearchToken('anything', { start: .1, end: 5, raw: 'anyth' })).toBe('anything');
  });

  it('upserts aliases once while preserving unknown text, other filters and quoted mentions', () => {
    const draft = '🌱 "filetype:csv" custom:retain ext:docx site:gov filetype:txt';
    expect(upsertSearchOperator(draft, 'filetype', 'pdf')).toBe('🌱 "filetype:csv" custom:retain filetype:pdf site:gov');
    expect(upsertSearchOperator('climate', 'ext', 'csv')).toBe('climate filetype:csv');
    expect(upsertSearchOperator('climate\n', 'after', '2025')).toBe('climate\nafter:2025');
  });

  it('removes all filters of one family when its field is cleared', () => {
    expect(upsertSearchOperator('cat site:a.test site:b.test filetype:pdf', 'site', '')).toBe('cat filetype:pdf');
    expect(upsertSearchOperator('cat site:', 'site', ' ')).toBe('cat');
    expect(upsertSearchOperator('cat unknown:keep', 'site', '')).toBe('cat unknown:keep');
  });

  it('supports exact and exclusion editing without deleting surrounding text', () => {
    expect(upsertSearchOperator('coffee -instant site:gov', 'exclusion', 'cold brew')).toBe('coffee -"cold brew" site:gov');
    expect(upsertSearchOperator('the "old phrase" unknown:keep', 'exact', 'new phrase')).toBe('the "new phrase" unknown:keep');
    expect(upsertSearchOperator('tea', 'exact', 'a "quoted" idea')).toBe('tea "a \\"quoted\\" idea"');
  });

  it('round-trips escaped exact values without accumulating extra escapes', () => {
    const value = 'a \"quoted\" idea';
    const first = upsertSearchOperator('query', 'exact', value);
    expect(parseSearchSyntax(first).tokens[0].value).toBe(value);
    expect(upsertSearchOperator(first, 'exact', parseSearchSyntax(first).tokens[0].value)).toBe(first);
  });

  it('makes explicitly added numeric exclusions unambiguous', () => {
    const draft = upsertSearchOperator('annual report', 'exclusion', '2020');
    expect(draft).toBe('annual report -\"2020\"');
    expect(parseSearchSyntax(draft).tokens[0]).toMatchObject({ key: 'exclusion', value: '2020' });
    expect(upsertSearchOperator(draft, 'exclusion', '')).toBe('annual report');
  });

  it('quotes operator-shaped field content instead of creating an unintended second filter', () => {
    const result = upsertSearchOperator('climate', 'site', 'example.com filetype:pdf');
    const parsed = parseSearchSyntax(result);
    expect(parsed.tokens).toHaveLength(1);
    expect(parsed.tokens[0]).toMatchObject({ key: 'site', value: 'example.com filetype:pdf' });
  });

  it('adds a filter safely around unfinished quotation rather than consuming unrelated text', () => {
    expect(upsertSearchOperator('"unfinished phrase', 'site', 'gov')).toBe('site:gov "unfinished phrase');
    expect(upsertSearchOperator('custom:"unfinished phrase', 'filetype', 'pdf')).toBe('filetype:pdf custom:"unfinished phrase');
    expect(upsertSearchOperator('site:"unfinished', 'site', 'gov')).toBe('site:gov');
  });
});

describe('Google destination', () => {
  it.each(['weather Singapore', '🌧️ 東京 site:例え.jp', '"x & y" + -z #?', 'https://other.test/?a=1&b=2', 'file:///private/example', 'javascript:alert(1)', ''])('keeps the complete query inside a fixed HTTPS search URL', query => {
    const result = new URL(buildGoogleSearchUrl(query));
    expect(result.protocol).toBe('https:');
    expect(result.host).toBe('www.google.com');
    expect(result.pathname).toBe('/search');
    expect([...result.searchParams.keys()]).toEqual(['q']);
    expect(result.searchParams.get('q')).toBe(query);
    expect(result.username).toBe('');
    expect(result.password).toBe('');
    expect(result.hash).toBe('');
  });
});
