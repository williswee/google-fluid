# Fluid Search

A white Google-style search bar that takes the shape of the query. Ordinary language is classified by **TypeSafe Jev**; the same input unfolds into 27 useful search interfaces. This replaces the earlier ChatGPT composer prototype.

Try it at [googlefluid.vercel.app](https://googlefluid.vercel.app). The previous address redirects here; the repository remains private. This is an independent experiment, not affiliated with Google or TypeSafe.

## What to try

Type `/` in the search bar (or tap its `/` button) to browse all 27 interfaces and 43 prepared queries. Filter the list, navigate with arrows, and press Enter. Escape restores the draft and cursor. Every example has a distinct title, including Calculator / Tip & bill split and Unit converter / Currency converter. Choosing a tool is immediate and explicitly labelled **Selected by you**; editing the query returns to Jev.

A quiet, clickable hint below the empty bar introduces a new example every six seconds. It pauses on hover/focus, has a Pause control, stops while typing or offscreen, and stays static for reduced motion.

| Try | What you can do |
| --- | --- |
| `24 * 18 + 6` / `split $84 between 3 people with a 15% tip` | Calculate and adjust a tip or split |
| `set a timer for 5 minutes` / `start a stopwatch` | Start, pause, reset, record laps |
| `metronome at 80 bpm` | Set tempo and explicitly start sound |
| `color picker #4285f4` / `color picker coral` | Adjust RGB, choose a color and copy its hex |
| `10 km in miles` / `100 USD to EUR` | Convert local units or use a dated ECB rate |
| `will I need an umbrella in Tokyo tomorrow` | Real seven-day forecast, sunrise, units and day selection |
| `what does serendipity mean` / `define:ephemeral` | Meaning, original example and related words |
| `Dune Part Two` / `Interstellar` | Film facts, cast and movie-night timing |
| `Earth vs Mars` | Compare days/years/moons and calculate Mars age |
| `show me how gravity affects an orbit` | Adjust mass/radius in a Newtonian orbit model |
| `play the dinosaur game` / `404` | Jump cacti with Space, ↑ or touch; pause and restart |
| `play tic-tac-toe` | Play two-player X/O with undo and reset |
| `do a barrel roll` / `askew` | Replay a bounded visual toy |
| `round trip flights from Singapore to Tokyo` | Swap airports, choose dates, cabin and passengers |
| `hotels in Tokyo for 3 nights` | Set dates, guests, rooms, class and amenities |
| `wireless headphones under $200` | Set a budget, product type and condition |
| `images of Earth from space` / `images of the Moon` | Inspect attributed NASA references and refine an image search |
| `videos of the northern lights` | Choose source, duration and upload date |
| `quiet cafes in Singapore` | Load a real city map on request; refine the destination search |
| `AAPL stock performance` / `compound interest on $1000 for 10 years` | Explore markets or calculate an editable growth scenario |
| `latest news about reusable rockets` | Set topic, source, region and recency |
| `climate report filetype:pdf` / `design systems site:github.com` | Edit document or website filters |
| `solar energy after:2024-01-01` / `"jaguar speed" -car` | Dates, exact words and exclusions |

**Jev** means a real intent decision with measured round-trip time. **Search syntax** means local parsing, including incomplete prefixes such as `site:`. **Selected by you** means an explicit visitor choice. No keyword fallback pretends to be Jev. Numeric arithmetic bypasses search-operator parsing so multiplication is not mistaken for a wildcard.

Utilities run on-device. Weather supports Singapore/Tokyo and loads Open-Meteo data through a fixed-city endpoint. Currency supports USD/EUR/GBP/SGD through daily ECB reference rates via Frankfurter. No query text or amount is sent to those data providers. Curated dictionary, film and planet entries expose their sources in collapsed disclosures; unsupported entities keep the original Google query. Flight, hotel, shopping, stock, video and news controls prepare real outbound searches, with previews clearly labelled. They do not fabricate prices, availability, videos or headlines. The growth calculator performs local monthly compounding with editable assumptions; it is not a forecast. Images use two attributed NASA references. Maps load an OpenStreetMap iframe only after an explicit click; the city preview is distinct from the visitor’s destination search. The orbit lab is a prebuilt educational model, not generative AI or relativistic physics. `cache:` and `related:` are flagged as retired.

Inspired by **Anish Gupta (@anishfn)** and his open-source [ShapeShift](https://github.com/anishfn/shapeshift/tree/5e24166dcbde6e794f0bd5b1b4bd395aaee5fc19): discoverable slash commands, intent-to-widget mapping, and deterministic interactions after intent classification. These components were independently implemented; no source code or assets were copied. We do not adopt its silent offline keyword fallback or saved-card history.

## Run locally

Node.js 22 or newer:

```sh
npm install
cp .env.example .env.local
npm run dev
```

Default configuration disables live inference. To connect it, apply the isolated migration in `supabase/migrations/` to the existing Supabase Free project, then configure server-only `TYPESAFE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RATE_LIMIT_SECRET` (at least 32 characters), and `LIVE_INFERENCE_ENABLED=true`. Never expose values through `NEXT_PUBLIC_`, Git, logs or the browser. Use the same ledger for local, evaluation, preview and production.

## Architecture

`components/FluidSearch.tsx` owns the anchored input, provenance, slash palette and the Notes disclosure. `lib/search-presets.ts` is the shared discovery registry. `SearchTools.tsx` renders distinct functional controls. `lib/search-syntax.ts` parses and edits explicit operators without changing unrelated text. `lib/conversion.ts` contains deterministic unit math. UtilityTools, KnowledgeTools, PlayTools, TravelTools, DiscoveryTools and MarketTools isolate each interactive family. SearchHints owns the pausable discovery hint. CurrencyTool uses a validated fixed-currency endpoint; neither external-data endpoint accepts drafts.

Natural-language drafts dispatch after a 150 ms pause. `hooks/useIntent.ts` permits one request in flight, coalesces edits, ignores obsolete responses and retains exact-draft results in tab memory only. Dispatched calls finish accounting. IME composition and oversized drafts do not trigger inference.

`POST /api/intent` accepts `{ draft: string }`, limited to 2,000 UTF-8 bytes. The official server-only SDK asks one Choice question using `jev-1.13.0`, no automatic retries and a five-second provider timeout. The result includes mode, probabilities for all 27 routes, model, source (`live`), server latency and reserve/inference/settlement timings. The confidence gate remains 0.70 with a 0.20 winning margin; ambiguity returns general. Effort/model previews from the chat prototype were removed.

`GET /api/status` reports configuration readiness, not guaranteed budget or provider availability. The browser distinguishes immediate typing feedback from the confirmed route. The expanding panel is measured independently of the input, uses one bounded 280 ms height transition, and respects reduced motion.

## Budget and deployment

The same **US$5 total Jev allowance** covers visitors, development, evaluation and recording. Every paid attempt needs an atomic Supabase reservation. Success settles against reported token usage. Uncertain billing is not automatically refunded. Ledger failure blocks requests. There is no refill, billing upgrade, extra AI provider, or second database allowance.

Vercel Hobby runs the API in `icn1` alongside the existing Seoul Supabase database. API secrets stay in encrypted server environment variables. WAF and database rate limits remain in place. See [operations](docs/OPERATIONS.md) and [budget design](supabase/README.md).

The app stores no query text or conversation history. Live natural-language drafts are sent to TypeSafe as you type; the notice lives inside Notes and is also linked to the input for assistive technology. Explicit syntax, palette choices and widget edits do not call Jev. Weather and exchange endpoints fetch only whitelisted city/currency identifiers, with 15-minute and one-hour caching respectively. Metronome audio requires an explicit click and stops on unmount; timers/games are not persisted. Hosting/provider metadata processing is outside the app's prompt storage policy.

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
node scripts/measure-interaction.mjs https://googlefluid.vercel.app evaluation/results/new-search-browser-check.json
```

The `search-v4` sets each contain 54 cases, two per route. Both real Jev runs passed 54/54: development round-trip p50/p95 699/865 ms, held-out 981/2616 ms. These small authored English sets are acceptance checks, not a general accuracy or latency guarantee. The earlier 21-mode search-v2 sets completed 42/42 correct each; their historical reports remain unchanged. Dinosaur-specific validation includes explicit play, the 404 Easter egg, and technical/factual queries that must remain ordinary search. See [current delivery](docs/DELIVERY.md) for measured results.

The header has no brand link or Classic/Fluid switch. **Notes** lives beside the TypeSafe credit in the footer and includes attribution to [Anish Gupta](https://github.com/anishfn), privacy and implementation limits. The original dinosaur runner is also embedded in the app's real 404 page. Chrome's original is an offline game; this is our own independent implementation with no copied code or assets. Keyboard handling stays inside the game, so typing in search cannot jump or pause it accidentally.

## Previous prototype

Historical chat-composer evaluations, code history, and the 58-second chat video remain available. `scripts/record-demo.mjs` and `docs/VIDEO.md` belong to that previous interface and are not a recorder for the current search demo. No search video has been recorded: the user requested app review first.
