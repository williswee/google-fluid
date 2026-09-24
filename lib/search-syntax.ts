import type { ModeId } from './intent';

export type SearchTokenProvenance = 'operator' | 'syntax' | 'intent-shorthand' | 'deprecated';
export type SearchToken = {
  kind: string;
  label: string;
  value: string;
  raw: string;
  /** UTF-16 offsets, matching textarea selection and String.slice. */
  start: number;
  end: number;
  provenance: SearchTokenProvenance;
  complete: boolean;
  key?: string;
};
export type ParsedSearchSyntax = {
  mode: ModeId | null;
  tokens: SearchToken[];
  deprecated: string[];
};
export type EditableSearchOperator = 'site' | 'filetype' | 'ext' | 'after' | 'before' | 'exclusion' | 'exact';

type OperatorDefinition = { key: string; label: string; provenance: SearchTokenProvenance; mode?: ModeId };
const operators: Record<string, OperatorDefinition> = {
  site: { key: 'site', label: 'Site', provenance: 'operator', mode: 'site' },
  filetype: { key: 'filetype', label: 'File type', provenance: 'operator', mode: 'documents' },
  ext: { key: 'filetype', label: 'File type', provenance: 'syntax', mode: 'documents' },
  before: { key: 'before', label: 'Before', provenance: 'operator', mode: 'date' },
  after: { key: 'after', label: 'After', provenance: 'operator', mode: 'date' },
  intitle: { key: 'intitle', label: 'In title', provenance: 'syntax', mode: 'precise' },
  allintitle: { key: 'allintitle', label: 'All in title', provenance: 'syntax', mode: 'precise' },
  inurl: { key: 'inurl', label: 'In URL', provenance: 'syntax', mode: 'precise' },
  allinurl: { key: 'allinurl', label: 'All in URL', provenance: 'syntax', mode: 'precise' },
  intext: { key: 'intext', label: 'In text', provenance: 'syntax', mode: 'precise' },
  allintext: { key: 'allintext', label: 'All in text', provenance: 'syntax', mode: 'precise' },
  // These reveal a local setup; they are not claims about supported Google operators.
  weather: { key: 'weather', label: 'Weather shorthand', provenance: 'intent-shorthand', mode: 'weather' },
  stocks: { key: 'stocks', label: 'Stock shorthand', provenance: 'intent-shorthand', mode: 'finance' },
  map: { key: 'map', label: 'Places shorthand', provenance: 'intent-shorthand', mode: 'places' },
  movie: { key: 'movie', label: 'Movie shorthand', provenance: 'intent-shorthand', mode: 'movies' },
  define: { key: 'define', label: 'Definition shorthand', provenance: 'intent-shorthand', mode: 'define' },
  source: { key: 'source', label: 'Source shorthand', provenance: 'intent-shorthand', mode: 'news' },
  cache: { key: 'cache', label: 'Removed: cache:', provenance: 'deprecated' },
  related: { key: 'related', label: 'Removed: related:', provenance: 'deprecated' },
};
const quoteEnds: Record<string, string> = { '"': '"', '“': '”', "'": "'", '‘': '’' };
const isQuote = (character: string) => Object.hasOwn(quoteEnds, character);
const isExactQuote = (character: string) => character === '"' || character === '“';
const unescapeQuoted = (value: string, closing: string) => value.replace(/\\(.)/gs, (escaped, character: string) => character === '\\' || character === closing ? character : escaped);
const isWordEnd = (character: string) => /\s/.test(character) || character === '(' || character === ')' || character === '|';

function readQuoted(draft: string, start: number) {
  const closing = quoteEnds[draft[start]];
  let cursor = start + 1;
  while (cursor < draft.length) {
    if (draft[cursor] === '\\' && cursor + 1 < draft.length) { cursor += 2; continue; }
    if (draft[cursor] === closing) {
      return { end: cursor + 1, value: unescapeQuoted(draft.slice(start + 1, cursor), closing), closed: true };
    }
    cursor += 1;
  }
  return { end: draft.length, value: unescapeQuoted(draft.slice(start + 1), closing), closed: false };
}

function readBare(draft: string, start: number) {
  let cursor = start;
  let openQuote = false;
  while (cursor < draft.length && !isWordEnd(draft[cursor])) {
    // Quoted portions inside unknown words/operators still shield their contents.
    if (isExactQuote(draft[cursor])) {
      const quoted = readQuoted(draft, cursor);
      cursor = quoted.end;
      openQuote = !quoted.closed;
    } else {
      cursor += 1;
    }
  }
  return { end: cursor, value: draft.slice(start, cursor), openQuote };
}

function scanSearchSyntax(draft: string): ParsedSearchSyntax & { openQuote: boolean } {
  const tokens: SearchToken[] = [];
  const deprecated: string[] = [];
  const routes: { mode: ModeId; priority: number; start: number }[] = [];
  let openQuote = false;
  let cursor = 0;
  const addToken = (start: number, end: number, token: Omit<SearchToken, 'start' | 'end' | 'raw'>) => {
    tokens.push({ ...token, start, end, raw: draft.slice(start, end) });
  };
  const precise = (start: number) => routes.push({ mode: 'precise', priority: 1, start });

  while (cursor < draft.length) {
    const start = cursor;
    const character = draft[cursor];
    if (/\s/.test(character)) { cursor += 1; continue; }

    if (isQuote(character)) {
      const quoted = readQuoted(draft, start);
      const exact = isExactQuote(character);
      addToken(start, quoted.end, {
        kind: exact ? 'exact' : 'quoted', label: exact ? 'Exact phrase' : 'Quoted text',
        value: quoted.value, key: exact ? 'exact' : undefined, provenance: 'syntax', complete: quoted.closed,
      });
      // Single quotation marks protect text, but do not claim Google's exact-match semantics.
      if (exact) precise(start);
      openQuote ||= !quoted.closed;
      cursor = quoted.end;
      continue;
    }

    if (character === '(' || character === ')') {
      addToken(start, start + 1, { kind: 'group', label: character === '(' ? 'Open group' : 'Close group', value: character, provenance: 'syntax', complete: true });
      cursor += 1;
      continue;
    }

    if (character === '|') {
      addToken(start, start + 1, { kind: 'boolean', label: 'Either term', value: 'OR', key: 'or', provenance: 'syntax', complete: true });
      precise(start);
      cursor += 1;
      continue;
    }

    if (character === '*' && (cursor + 1 === draft.length || isWordEnd(draft[cursor + 1]))) {
      addToken(start, start + 1, { kind: 'wildcard', label: 'Wildcard', value: '*', provenance: 'syntax', complete: true });
      precise(start);
      cursor += 1;
      continue;
    }

    if (character === '-' && (isQuote(draft[cursor + 1]) || /[\p{L}_]/u.test(draft[cursor + 1] ?? ''))) {
      const quoted = isQuote(draft[cursor + 1]) ? readQuoted(draft, cursor + 1) : null;
      const bare = quoted ? null : readBare(draft, cursor + 1);
      const end = quoted?.end ?? bare!.end;
      const value = quoted?.value ?? bare!.value;
      const closed = quoted?.closed ?? !bare!.openQuote;
      addToken(start, end, { kind: 'exclusion', label: 'Exclude', value, key: 'exclusion', provenance: 'operator', complete: closed && value.length > 0 });
      precise(start);
      openQuote ||= !closed;
      cursor = end;
      continue;
    }

    const operatorMatch = /^([a-zA-Z]+):/.exec(draft.slice(cursor));
    const spelling = operatorMatch?.[1].toLowerCase();
    const definition = spelling && Object.hasOwn(operators, spelling) ? operators[spelling] : undefined;
    if (operatorMatch && definition) {
      const valueStart = start + operatorMatch[0].length;
      const quoted = isQuote(draft[valueStart]) ? readQuoted(draft, valueStart) : null;
      const bare = quoted ? null : readBare(draft, valueStart);
      const end = quoted?.end ?? bare!.end;
      const value = quoted?.value ?? bare!.value;
      const closed = quoted?.closed ?? !bare!.openQuote;
      addToken(start, end, {
        kind: definition.provenance === 'deprecated' ? 'deprecated' : definition.provenance === 'intent-shorthand' ? 'shorthand' : 'operator',
        key: definition.key, label: definition.label, value,
        provenance: definition.provenance, complete: closed && value.length > 0,
      });
      if (definition.provenance === 'deprecated') {
        const label = `${definition.key}:`;
        if (!deprecated.includes(label)) deprecated.push(label);
      } else if (definition.mode) {
        const priority = definition.provenance === 'intent-shorthand' ? 5 : definition.mode === 'documents' ? 4 : definition.mode === 'site' ? 3 : definition.mode === 'date' ? 2 : 1;
        routes.push({ mode: definition.mode, priority, start });
      }
      openQuote ||= !closed;
      cursor = end;
      continue;
    }

    const bare = readBare(draft, cursor);
    const word = bare.value;
    if (word === 'OR' || word === 'AND') {
      addToken(start, bare.end, { kind: 'boolean', label: word === 'OR' ? 'Either term' : 'Both terms', value: word, key: word.toLowerCase(), provenance: 'syntax', complete: true });
      precise(start);
    }
    openQuote ||= bare.openQuote;
    cursor = Math.max(cursor + 1, bare.end);
  }

  routes.sort((left, right) => right.priority - left.priority || left.start - right.start);
  return { mode: routes[0]?.mode ?? null, tokens, deprecated, openQuote };
}

/** Local, literal syntax only. Natural-language intent is left to Jev. */
export function parseSearchSyntax(draft: string): ParsedSearchSyntax {
  const { mode, tokens, deprecated } = scanSearchSyntax(draft);
  return { mode, tokens, deprecated };
}

/** Returns a destination only; submitting/navigation always remains a user action. */
export function buildGoogleSearchUrl(query: string): string {
  const destination = new URL('https://www.google.com/search');
  destination.searchParams.set('q', query);
  return destination.toString();
}

/** Stale token positions are ignored rather than deleting unrelated edited text. */
export function removeSearchToken(draft: string, token: Pick<SearchToken, 'start' | 'end' | 'raw'>): string {
  const { start, end, raw } = token;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > draft.length || draft.slice(start, end) !== raw) return draft;
  let left = draft.slice(0, start);
  let right = draft.slice(end);
  // Remove at most one redundant horizontal separator, preserving line breaks and the rest of the draft.
  if ((start === 0 || /[ \t]$/.test(left)) && /^[ \t]/.test(right)) right = right.slice(1);
  else if (end === draft.length && /[ \t]$/.test(left)) left = left.slice(0, -1);
  return left + right;
}

function quotedValue(value: string) {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

/** Replaces one filter family, leaving unknown query text and other filters intact. */
export function upsertSearchOperator(draft: string, key: EditableSearchOperator, value: string): string {
  const normalizedKey = key === 'ext' ? 'filetype' : key;
  if (!['site', 'filetype', 'after', 'before', 'exclusion', 'exact'].includes(normalizedKey)) return draft;
  const parsed = scanSearchSyntax(draft);
  const matches = parsed.tokens.filter(token => token.key === normalizedKey);
  const nextValue = value.trim();
  if (!nextValue) return [...matches].reverse().reduce(removeSearchToken, draft);

  const needsQuotes = /[\s()|"“”]/u.test(nextValue) || (normalizedKey === 'exclusion' && !/^[\p{L}_]/u.test(nextValue));
  const encoded = needsQuotes ? quotedValue(nextValue) : nextValue;
  const replacement = normalizedKey === 'exact' ? quotedValue(nextValue)
    : normalizedKey === 'exclusion' ? `-${encoded}`
      : `${normalizedKey}:${encoded}`;

  if (matches.length) {
    const withoutDuplicates = matches.slice(1).reverse().reduce(removeSearchToken, draft);
    const first = matches[0];
    return withoutDuplicates.slice(0, first.start) + replacement + withoutDuplicates.slice(first.end);
  }
  // Prepend when a quote is unfinished; appending would accidentally put the new filter inside it.
  if (parsed.openQuote) return `${replacement} ${draft}`;
  return draft ? `${draft}${/\s$/.test(draft) ? '' : ' '}${replacement}` : replacement;
}
