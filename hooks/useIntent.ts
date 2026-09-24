'use client';

import { useEffect, useRef, useState } from 'react';
import { MODES, type IntentResult } from '../lib/intent';

export const INTENT_PAUSE_MS = 150;
export type DisplayResult = IntentResult & { roundTripMs: number };
type Job = { draft: string; revision: number };

/** One paid request at a time; edits replace the queued draft, never the active one. */
export function useIntent(draft: string, enabled: boolean, retryKey: number) {
  const [decision, setDecision] = useState<{ draft: string; result: DisplayResult } | null>(null);
  const [failure, setFailure] = useState<{ draft: string; message: string } | null>(null);
  const revision = useRef(0);
  const mounted = useRef(false);
  const active = useRef(false);
  const queued = useRef<Job | null>(null);
  const cache = useRef(new Map<string, DisplayResult>());

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; revision.current++; queued.current = null; }; }, []);

  useEffect(() => {
    const currentRevision = ++revision.current;
    queued.current = null;
    setFailure(null);
    if (!enabled) { if (!draft.trim()) setDecision(null); return; }
    const hit = cache.current.get(draft);
    if (hit) { setDecision({ draft, result: hit }); return; }

    async function dispatch() {
      if (active.current || !mounted.current || !queued.current) return;
      const job = queued.current;
      queued.current = null;
      if (job.revision !== revision.current) return;
      active.current = true;
      const startedAt = performance.now();
      try {
        // Dispatched calls finish accounting even if the draft changes in the meantime.
        const response = await fetch('/api/intent', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft: job.draft }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Live routing is unavailable. Choose a search tool or try again.');
        if (!data || !MODES.includes(data.mode) || data.source !== 'live') {
          throw new Error('Live routing is unavailable. Choose a search tool or try again.');
        }
        const result: DisplayResult = { ...data, roundTripMs: Math.round(performance.now() - startedAt) };
        if (cache.current.size >= 30) cache.current.delete(cache.current.keys().next().value!);
        cache.current.set(job.draft, result);
        if (mounted.current && job.revision === revision.current) {
          setDecision({ draft: job.draft, result });
          setFailure(null);
        }
      } catch (error) {
        if (mounted.current && job.revision === revision.current) {
          setDecision(null);
          setFailure({ draft: job.draft, message: error instanceof Error ? error.message : 'Live routing is unavailable. Choose a search tool or try again.' });
        }
      } finally {
        active.current = false;
        // The queued job carries its own revision; this closure never reuses an old draft.
        if (mounted.current && queued.current) void dispatch();
      }
    }

    const timer = window.setTimeout(() => { queued.current = { draft, revision: currentRevision }; void dispatch(); }, INTENT_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, enabled, retryKey]);

  const error = enabled && failure?.draft === draft ? failure.message : '';
  // Derived during render, so the input gets feedback without waiting for the debounce.
  const pending = enabled && !error && decision?.draft !== draft;
  return { result: decision?.result ?? null, resultDraft: decision?.draft ?? '', pending, error };
}
