export const CURRENCIES = ['USD', 'EUR', 'GBP', 'SGD'] as const;
export type Currency = typeof CURRENCIES[number];
export type ExchangeRate = { base: Currency; quote: Currency; rate: number; date: string };
export function isCurrency(value: unknown): value is Currency { return CURRENCIES.includes(value as Currency); }
export function parseCurrency(draft: string): { amount: number; from: Currency; to: Currency } | null {
  const text = draft.trim().replace(/^convert\s+/i, '').replace(/\bUS\$/g, 'USD ').replace(/\$/g, 'USD ').replace(/€/g, 'EUR ').replace(/£/g, 'GBP ');
  const match = text.match(/^(?:(USD|EUR|GBP|SGD)\s*)?(-?\d+(?:\.\d+)?)\s*(USD|EUR|GBP|SGD)?\s+(?:in|to|into)\s+(USD|EUR|GBP|SGD)\s*\??$/i);
  if (!match || (!match[1] && !match[3])) return null;
  if (match[1] && match[3] && match[1].toUpperCase() !== match[3].toUpperCase()) return null;
  const from = (match[1] || match[3]).toUpperCase() as Currency;
  const to = match[4].toUpperCase() as Currency;
  const amount = Number(match[2]);
  return Number.isFinite(amount) ? { amount, from, to } : null;
}
export function validRate(value: unknown, from: Currency, to: Currency): value is ExchangeRate {
  if (!value || typeof value !== 'object') return false;
  const row = value as ExchangeRate;
  return row.base === from && row.quote === to && Number.isFinite(row.rate) && row.rate > 0 && /^\d{4}-\d{2}-\d{2}$/.test(row.date);
}
