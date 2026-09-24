# Fluid Search

A white Google-style search bar that takes the shape of the query. Ordinary language is classified by **TypeSafe Jev**; the same input unfolds into twelve useful search tools. This replaces the earlier ChatGPT composer prototype.

Try it at [chatgptfluid.vercel.app](https://chatgptfluid.vercel.app). The existing URL and private repository are retained during the pivot. This is an independent experiment, not affiliated with Google or TypeSafe.

## What to try

| Query | Interface |
| --- | --- |
| will I need an umbrella in Tokyo tomorrow | Forecast period controls |
| 10 km in miles | Working local unit converter |
| quiet cafes in Singapore | Place categories and Google Maps link |
| what does serendipity mean | Definition, synonyms and etymology |
| AAPL stock performance | Price, news, earnings and comparisons |
| Dune Part Two showtimes | Showtimes, trailer, reviews and cast |
| latest news about reusable rockets | News and recency controls |
| climate change report filetype:pdf | Selectable document formats |
| design systems site:github.com | Website scope editor |
| solar energy after:2024-01-01 before:2025-01-01 | Date range controls |
| "jaguar speed" -car | Exact phrases and exclusions |
| why do cats purr | General web search |

**Jev** means a live intent classification, with measured browser request time. **Search syntax** means deterministic local parsing, including partial prefixes such as `site:`. **Selected** means the visitor chose the tool or refinement. **Example** means an explicitly labelled fallback with no live prediction. The UI never substitutes keyword rules and calls them Jev.

The converter computes compatible length, weight and temperature units on-device. Other controls refine a search or open Google results on explicit visitor action. No weather, market, map, film, dictionary or news results are fetched or invented. Currency rates are looked up on Google. `cache:` and `related:` are flagged as retired; older Boolean and field syntax may not be honored by Google. See [Google's supported operators](https://support.google.com/websearch/answer/2466433?hl=en) and [documentation updates](https://developers.google.com/search/updates).

## Run locally

Node.js 22 or newer:

```sh
npm install
cp .env.example .env.local
npm run dev
```

Default configuration disables live inference. To connect it, apply the isolated migration in `supabase/migrations/` to the existing Supabase Free project, then configure server-only `TYPESAFE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RATE_LIMIT_SECRET` (at least 32 characters), and `LIVE_INFERENCE_ENABLED=true`. Never expose values through `NEXT_PUBLIC_`, Git, logs or the browser. Use the same ledger for local, evaluation, preview and production.

## Architecture

`components/FluidSearch.tsx` owns the anchored input, comparison, provenance and examples. `SearchTools.tsx` renders distinct functional controls. `lib/search-syntax.ts` parses and edits explicit operators without changing unrelated text. `lib/conversion.ts` contains deterministic unit math.

Natural-language drafts dispatch after a 150 ms pause. `hooks/useIntent.ts` permits one request in flight, coalesces edits, ignores obsolete responses and retains exact-draft results in tab memory only. Dispatched calls finish accounting. IME composition and oversized drafts do not trigger inference.

`POST /api/intent` accepts `{ draft: string }`, limited to 2,000 UTF-8 bytes. The official server-only SDK asks one Choice question using `jev-1.13.0`, no automatic retries and a five-second provider timeout. The result includes mode, probabilities for all twelve routes, model, source (`live`), server latency and reserve/inference/settlement timings. The confidence gate remains 0.70 with a 0.20 winning margin; ambiguity returns general. Effort/model previews from the chat prototype were removed.

`GET /api/status` reports configuration readiness, not guaranteed budget or provider availability. The browser distinguishes immediate typing feedback from the confirmed route. The expanding panel is measured independently of the input, uses one bounded 280 ms height transition, and respects reduced motion.

## Budget and deployment

The same **US$5 total Jev allowance** covers visitors, development, evaluation and recording. Every paid attempt needs an atomic Supabase reservation. Success settles against reported token usage. Uncertain billing is not automatically refunded. Ledger failure blocks requests. There is no refill, billing upgrade, extra AI provider, or second database allowance.

Vercel Hobby runs the API in `icn1` alongside the existing Seoul Supabase database. API secrets stay in encrypted server environment variables. WAF and database rate limits remain in place. See [operations](docs/OPERATIONS.md) and [budget design](supabase/README.md).

The app stores no query text or conversation history. Live natural-language drafts are sent to TypeSafe as you type; the notice appears beside the field. Explicit syntax, local conversions and offline examples do not call Jev. Hosting/provider metadata processing is outside the app's prompt storage policy.

## Verification

```sh
npm test
npm run build
npm run test:e2e
```

Browser tests use controlled fixtures and do not establish real model accuracy or latency. Use an installed Chromium through `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, or install Playwright Chromium.

Live checks consume the shared allowance and never run during ordinary builds/tests:

```sh
npm run evaluate -- --base-url http://127.0.0.1:3000 --split development
npm run evaluate -- --base-url http://127.0.0.1:3000 --split held-out
node scripts/measure-interaction.mjs https://chatgptfluid.vercel.app evaluation/results/new-search-browser-check.json
```

The new `search-v1` evaluation has separate 24-case development and held-out sets covering all twelve routes. Both first runs completed 24/24 correctly. These small authored English sets are acceptance checks, not broad accuracy claims. Reports distinguish local endpoint latency from public browser measurements. The browser script checks eight live decisions and four local-syntax transitions, without mocks or retries. Existing report files are never overwritten. See [current delivery](docs/DELIVERY.md).

## Previous prototype

Historical chat-composer evaluations, code history, and the 58-second chat video remain available. `scripts/record-demo.mjs` and `docs/VIDEO.md` belong to that previous interface and are not a recorder for the current search demo. No search video has been recorded: the user requested app review first.
