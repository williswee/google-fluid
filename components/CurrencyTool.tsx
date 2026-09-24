'use client';
import { useEffect, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { CURRENCIES, parseCurrency, validRate, type Currency, type ExchangeRate } from '../lib/currency';
import { buildGoogleSearchUrl } from '../lib/search-syntax';
export default function CurrencyTool({ draft }: { draft: string }) {
  const parsed = parseCurrency(draft);
  const [amount, setAmount] = useState(String(parsed?.amount ?? 100));
  const [from, setFrom] = useState<Currency>(parsed?.from ?? 'USD');
  const [to, setTo] = useState<Currency>(parsed?.to ?? 'EUR');
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { const value = parseCurrency(draft); if (value) { setAmount(String(value.amount)); setFrom(value.from); setTo(value.to); } }, [draft]);
  const supported = Boolean(parsed);
  useEffect(() => {
    setRate(null); setError('');
    if (!supported || from === to) return;
    const controller = new AbortController();
    fetch(`/api/currency?from=${from}&to=${to}`, { signal: controller.signal }).then(async r => { const data = await r.json(); if (!r.ok || !validRate(data, from, to)) throw new Error('Rate unavailable.'); return data; }).then(data => { if (!controller.signal.aborted) setRate(data); }).catch(() => { if (!controller.signal.aborted) setError('Rate unavailable.'); });
    return () => controller.abort();
  }, [from, to, supported, attempt]);
  if (!parsed) return <div className="currency-tool"><h2>Currency converter</h2><a className="tool-link" href={buildGoogleSearchUrl(draft)} target="_blank" rel="noopener noreferrer">Look up this conversion on Google</a></div>;
  const currentRate = rate?.base === from && rate.quote === to ? rate : null;
  const value = amount.trim() && Number.isFinite(Number(amount)) ? Number(amount) : null;
  const computed = value === null ? null : from === to ? value : currentRate ? value * currentRate.rate : null;
  const answer = computed !== null && Number.isFinite(computed) ? computed : null;
  const invalid = value === null || (computed !== null && !Number.isFinite(computed));
  return <div className="converter"><div className="tool-topline"><h2>Currency converter</h2><span>ECB reference rate</span></div><div className="conversion-pair"><label><span className="sr-only">Amount</span><input type="number" aria-label="Currency amount" value={amount} onChange={e => setAmount(e.target.value)} /><select aria-label="Source currency" value={from} onChange={e => setFrom(e.target.value as Currency)}>{CURRENCIES.map(code => <option key={code}>{code}</option>)}</select></label><button className="swap-button" type="button" aria-label="Swap currencies" onClick={() => { setFrom(to); setTo(from); }}><ArrowLeftRight size={22} /></button><div className="conversion-result"><output aria-label="Converted currency value">{answer === null ? '—' : answer.toLocaleString('en-US', { maximumFractionDigits:2 })}</output><select aria-label="Target currency" value={to} onChange={e => setTo(e.target.value as Currency)}>{CURRENCIES.map(code => <option key={code}>{code}</option>)}</select></div></div>{invalid && <p className="field-error" role="status">Enter a smaller, valid amount.</p>}{error && <p role="status">{error} <button type="button" className="tool-link" onClick={() => setAttempt(n => n + 1)}>Retry</button></p>}{!currentRate && from !== to && !error && <span className="sr-only" role="status">Loading reference rate.</span>}<details className="source-details"><summary>{currentRate ? `Rate · ${currentRate.date}` : 'About this rate'}</summary><p>Daily ECB reference data via <a href="https://frankfurter.dev" target="_blank" rel="noopener noreferrer">Frankfurter</a>. This is not a trading quote; bank fees are not included. Only currency codes are requested. {currentRate && `1 ${from} = ${currentRate.rate} ${to}.`}</p></details></div>;
}
