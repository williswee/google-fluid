# Current delivery — Impeccable polish, 24 September 2026

Preserved the white Google-style world, anchored search field, all 22 modes and footer-only disclosures. Improved mobile placeholder and menu typography, shared keyboard focus, hover/pressed feedback and footer readability. Notes retains its copy and credits with clear sections; closing it or pressing Escape restores focus to the actual opener. Slash navigation scrolls only its list, whose height adapts to available viewport space. Removed obsolete header/example CSS.

Fixed native Enter activation for utility controls, suppressed ticking clock announcements in favour of settled action feedback, and blocked copying an invalid hex field with linked recovery text. No server, routing, provider, budget, key, repository visibility or hosting-tier changes.

Verification: 310 unit/integration tests and 44 browser scenarios pass; production build passes. One batched visual review at 1440, 813, 390 and 320px covered landing, palette, calculator, color, dinosaur and Notes. No overflow or page errors; reduced motion works at all four widths. One narrow Notes-diagram alignment correction was confirmed on desktop and mobile. Browser inference was mocked for interaction checks; no fresh routing benchmark is claimed.

Production verified: https://chatgptfluid.vercel.app. Deployment https://chatgptfluid-mkjxkujzf-williswees-projects.vercel.app (`dpl_9SzqP7ZDKZqbkiKZtZ4TSyEE3J8k`), implementation commit `ab37aa1`, READY. Public browser checks passed for desktop/mobile layout, updated placeholder, Enter activation, Notes focus restoration and invalid color copy prevention. No page errors or inference requests. Report: `evaluation/results/search-polish-production.json`.

---

# Historical delivery — quieter chrome and Dinosaur run, 24 September 2026

Removed the top brand and Classic/Fluid switch. The interface is always fluid. Renamed How it works to Notes and moved its trigger/disclosure to the footer. Notes explicitly credits ShapeShift OSS and Anish Gupta (@anishfn), with links to both the project and author.

Added a 22nd intent, Dinosaur run, and two prepared queries (30 total). Natural play requests and bare `404` route through Jev; selecting `/dinosaur` is immediate and labelled Selected by you. An original local SVG/physics runner provides Space/ArrowUp/touch jump, score, cacti, collision, pause/resume/restart, and automatic pause on blur/hidden tab. No global game key handlers, automatic start, audio, storage or extra provider. A real HTTP404 route embeds the same playable component with a home link. Chrome's original is an offline game; Notes distinguishes that inspiration from our 404 use.

Verification:

- 310 unit/integration tests and production build pass.
- 39 browser scenarios pass: 38 on the full run and the corrected test-selector case on its targeted confirmation; no app defect or retry was involved.
- Batched visuals at 1440px, 813px and 390px: no horizontal overflow or page errors. All three missing-route checks returned HTTP404.
- Focused live Jev check: 4/4 dinosaur queries routed to dino; all four technical/factual/negated requests avoided the game. Exact expected labels were 10/11: “what does HTTP404 mean” selected Dictionary rather than general search, whose unknown-term panel links to Google. This is recorded rather than counted as an exact match. Three existing route regressions passed. Report: `evaluation/results/search-v3-dino-focused.json`.
- The expanded search-v3 datasets contain 44 cases per split; no claim of a full new benchmark. Historical search-v2 results remain unchanged.

Same private repository, Vercel Hobby project and US$5 ledger. No video work.

Production verified at https://chatgptfluid.vercel.app. Deployment https://chatgptfluid-4ou0np8j7-williswees-projects.vercel.app (`dpl_5aDsong8uBFbp6x8c2g25HPgKFvW`), implementation commit `70f8de9`.

The public browser smoke check passed without fixtures or retries: no header/toggle, correct footer Notes and author links, real Jev routing of `404` to dino, keyboard jump, automatic pause when returning to the search field, mobile fit, playable HTTP404 response and return-home navigation. No page errors. The single live routing check measured 1,120 ms server latency and 1,549 ms from input to confirmed mode; this is one observation, not a latency guarantee. Report: `evaluation/results/search-v3-dino-production.json`.

---

# Historical delivery — Fluid Search interactive tools, 24 September 2026

The public app now has 21 interfaces and 28 prepared queries discoverable through `/`. The example grid is removed. How it works contains privacy, affiliation, routing details, limitations, and the optional manual mode lock. The query is preserved when browsing/cancelling the palette, including its selection range. Choosing a tool is immediate and labelled Selected by you; a subsequent edit returns to Jev.

## Working interfaces

Calculator and tip splitting; unit and currency conversion; countdown timer; stopwatch/laps; explicitly started metronome audio; RGB/color picker and clipboard; real forecasts for Singapore/Tokyo; two dictionary entries; two film cards with movie-night timing; Earth/Mars comparison; adjustable circular-orbit model; two-player tic-tac-toe; barrel roll/askew. Existing document/site/date/exact-search, Maps, market and news refinements remain available.

Open-Meteo supplies actual weather through a fixed-city endpoint. Frankfurter supplies daily ECB reference rates for four allowed currencies. Both are free and require no account/key. Source details include dates and limits. Other knowledge is curated and cited; the orbit model is prebuilt Newtonian physics, not AI generation. No live stock prices, map results or news headlines are fabricated.

## Verification

- `npm test`: 291 unit/integration tests pass, including shared budget accounting, external-data validation, safe arithmetic and widget logic.
- `npm run build`: passes.
- Playwright: 34/34 fixture tests pass, including slash keyboard/caret, IME, stale responses, manual overrides, clipboard, audio start/cleanup, game outcomes, currency overflow, mobile and reduced motion.
- One batched visual pass covered desktop 1440px, the user's 907px viewport and mobile 390px. Independent finish review: pass, no further visual fixes. Arithmetic/wildcard collision found and fixed with four regressions.
- Real Jev development: 42/42 correct, p50 663.65 ms, p95 1245.30 ms round trip.
- Real Jev held-out: 42/42 correct, p50 778.11 ms, p95 2219.02 ms round trip.
- These small English sets are acceptance checks through the protected local endpoint; they do not establish broad model accuracy or worldwide performance. Reports: `evaluation/results/search-v2-development.json` and `search-v2-held-out.json`.

Same Vercel Hobby project, private repo, Seoul region, encrypted secrets and US$5 shared ledger. No allowance reset, new paid provider or upgrade. No new video work.

## Public deployment verified

Production: https://chatgptfluid.vercel.app. Deployment https://chatgptfluid-67wsgbq1h-williswees-projects.vercel.app (`dpl_HipvTwxFNHdDKdvBXwiKzgQxvhUD`), implementation commit `409be46`.

All 21 public-browser routes passed with intact drafts, caret/selection and input bounds: 17 real Jev decisions and four local-syntax transitions. No page errors or mobile overflow. Live request round trips were 377–1586 ms, median 438 ms; these exclude the 152–156 ms typing pause and panel reveal. Syntax transitions painted in 7–15 ms and made no inference calls. This is a small sequential smoke check, not a worldwide latency guarantee. Full record: `evaluation/results/search-v2-production-browser.json`.

Hosted weather returned seven actual Tokyo forecast days; hosted currency returned the dated ECB USD/EUR reference rate. No fixtures were used for these production checks. GitHub visibility verified PRIVATE. Existing budget enforcement and credentials are unchanged.

---

# Historical delivery — first Fluid Search release, 24 September 2026

The user replaced the ChatGPT composer concept with a white Google-style fluid search bar and explicitly deferred video work. The standalone folder, private repository, Vercel hostname, server secrets, Seoul function region, and shared US$5 Jev ledger are retained.

## Search experience

Twelve routes: general, weather, finance, places, movies, convert, define, documents, site, news, date and precise. Jev classifies natural-language searches with one Choice question. Explicit syntax is parsed on-device, supports mixed removable filters and partial prefixes, and is labelled Search syntax. Manual and example states retain their own labels. The input/caret stays anchored while the lower shell changes height and presents useful controls.

Length/weight/temperature conversions calculate locally. Currency and unsupported conversions open Google instead of displaying an unrelated number. Other modes offer editable refinements and real Google/Maps destinations on explicit action. No weather, financial, map, film, dictionary or news data is invented. Retired cache:/related: operators receive a notice.

## Current verification

- 181 unit/integration tests pass, including atomic PostgreSQL budget tests, 57 syntax cases and 29 conversion cases.
- 20 browser cases passed: the 19-case fixture suite plus the additional unsupported-conversion regression. The API is intercepted in these tests; these counts do not measure Jev accuracy.
- Production build passes. Desktop/mobile visual verification covers all twelve shapes; the final 390px check has no overflow and no interactive targets below 44px.
- New search-v1 live evaluation: development 24/24, held-out 24/24, both completed without errors. The protected local endpoint's development client p50/p95 was 684.54/1147.82 ms; held-out 695.66/1125.46 ms. These small authored English sets are acceptance checks, not general accuracy guarantees or production latency measurements.
- Reports: evaluation/results/2026-09-24T01-58-28-580Z-search-development.json and 2026-09-24T02-00-24-744Z-search-held-out.json. Prior chat reports remain historical evidence only.

## Search production verification

Public URL: https://chatgptfluid.vercel.app. Ready deployment: https://chatgptfluid-16hzixiqn-williswees-projects.vercel.app (`dpl_7iSq3sRFYWG3sQEt4AToBqqjuxT8`, implementation commit `1f7081c`). Vercel inspection confirms function region `icn1`; no secrets, allowance, hosting tier or repository visibility changed.

All twelve authored public-browser cases passed: eight successful real Jev requests and four deterministic local-syntax transitions. The four syntax cases made zero inference requests. All twelve preserved draft contents, input bounds and selection. No browser errors; no horizontal overflow at 390px.

- Live request round trips: 415–1,698 ms across eight cases, including the first request. Six were 415–719 ms; the first weather request was 1,698 ms and the movie request was 1,534 ms. These measurements exclude the 151–155 ms typing pause and subsequent UI animation.
- Immediate typing acknowledgement: 1–15 ms in those eight cases.
- Explicit syntax mode paint: 9–14 ms across four cases, measured to the next frame after the mode changes. The panel reveal itself lasts 280 ms when reduced motion is off.
- Full measurements: `evaluation/results/search-v1-production-browser.json`. This is a small sequential deployment check, not a global latency guarantee.

A fresh Impeccable review used its fallback reviewer contract because the harness has no named-agent loader. The verdict pass scored both listed fixes resolved: current product/design persistence and supporting-text contrast. Its ship verdict covers those two fixes; details are in `.impeccable/critique/2026-09-24-search-finish.md`.

No search video was created or re-recorded. Existing video artifacts remain the historical ChatGPT prototype, as requested.

---

# Historical delivery — ChatGPT prototype, 23 September 2026

## Project and outputs

- Local project: /Users/williswee/Downloads/Code/jev-ui-demo. Moved out of Slothware Ventures with Git history, settings, deployment link, dependencies, and artifacts intact. No old path references remain in source.
- Public interface: https://chatgptfluid.vercel.app (HTTP 200, no login required). Live Jev routing is enabled with the shared US$5 guard. Revision 2 production deployment: https://chatgptfluid-q00stgduk-williswees-projects.vercel.app (revision 2, code commit b99f720).
- Source: https://github.com/williswee/chatgpt-fluid (private, main).
- Live recording: artifacts/chatgpt-fluid-demo.mp4, 58.03 seconds, 1920×1080 H.264, captions burned in. Recorded against https://chatgptfluid.vercel.app with real Jev responses; no mocked API responses, replay, or inference-speed edits. Caption, poster, metadata, and raw-take companions are in artifacts/.
- The earlier example-only preview is separately named and visibly labelled throughout.

## Original launch verification

- npm test: 76 tests pass, including real PostgreSQL logic via local PGlite.
- npm run build: passes from the relocated folder.
- Ten Playwright interaction scenarios pass with controlled fixtures; desktop/mobile browser review found no framework errors or horizontal overflow.
- Origin validation now supports Next's normalized localhost URL while verifying the actual Host and protocol. Regression tests reject mismatched host, port, scheme, and forwarded-header spoofing.
- Live development evaluation: 15/15 correct; client round-trip p50 773.01 ms, p95 2100.33 ms.
- Live held-out evaluation: 15/15 correct; client round-trip p50 726.29 ms, p95 1262.93 ms.
- Both evaluations used jev-1.13.0 through the budget-protected local endpoint. Cold starts are included. These small, authored English sets are a demo acceptance check, not a general benchmark. Full reports are in evaluation/results/.
- A public browser check verified all five modes with actual Jev responses, intact drafts, no page errors, and no horizontal overflow at 390×844. This is a deployment smoke check, separate from the authored evaluation.
- The recording verifies five actual decisions: Image, General after a semantic edit, Web, Research, and user-provided Sketch.

## Operating limits

- Existing Supabase Free project contains the isolated fluid_private US$5 ledger. Server credentials can access both narrow RPC functions.
- Active Vercel Hobby WAF: POST /api/intent, 120 requests/60 seconds/IP. Database rate limiting is global across deployments.
- TypeSafe, Supabase, and rate-limit secrets are configured as sensitive server-only Vercel values with explicit approval in production and preview. No secrets are in Git or browser code.
- Live inference is enabled locally and on Vercel. All environments use the same ledger. The server-only kill switch can disable inference without changing the allowance.

## Original public activation

The public status endpoint returned HTTP 200 with liveAvailable=true. A real public POST /api/intent returned HTTP 200, source=live, mode=image, model=jev-1.13.0, and measured server latency of 2,118 ms (2,451 ms client round trip for that single smoke request). The existing ledger and cap are unchanged.

A public recording attempt encountered HTTP 503 and stopped without producing a successful film. The later five-mode browser check and complete public recording passed. The final recording preserves real response timing (server latency 810–1,989 ms across its five decisions) and ends with the public URL. Failed or uncertain calls retain their full budget reservations; no retry or refund bypass was introduced.

## Revision 2 — compact composer and adaptive setup

User-approved after the Impeccable review: compact pill, unfolding mode-specific tool tray, immediate neutral typing feedback, and effort plus named model previews. Image frame choices, search scope/recency, research outline format, and a local sketch input are functional configuration controls. No additional AI provider or downstream tool is called. Manual settings, draft position, and caret are preserved.

- Typing pause reduced from 350 to 150 ms. One in-flight request coalesces subsequent edits into the latest draft. Immediate acknowledgement is distinct from a confirmed decision.
- Jev classifies capability and effort in one request. The interface maps those values to illustrative model presets; the actual classifier remains jev-1.13.0.
- 90 unit/integration tests, 17 fixture browser tests, and the production build pass. Browser tests include stable textarea bounds, caret, coalescing, effort/model overrides, keyboard controls, 44px mobile targets, and local drawing controls. Desktop/mobile visual checks passed; the required design detector returned no findings.
- Existing dataset regressions: development 15/15, round-trip p50/p95 743.85/1796.8 ms; previously evaluated held-out-labelled 15/15, 778.63/1455.05 ms. These are reused capability regression sets, not fresh held-out benchmarks or effort-accuracy measurements. Reports are in evaluation/results.
- Six additional authored local-handler checks matched expected capability/effort; their measured Jev stage was 319–414 ms, with budget database/network work making up a substantial part of total latency. These do not measure production or a browser. See v2-stage-profile-local.json for context and stages.

### Revised public verification

Production deployment `dpl_EUmYTmEih8YW5G1dwjVu3Xmu5xHA` is Ready and aliased to chatgptfluid.vercel.app. The function region is verified as `icn1` (Seoul), matching the existing Supabase database. This follows Vercel's documented recommendation to locate functions near their database. Hosting remains on Hobby; the shared budget path is unchanged.

Six authored browser cases were repeated before and after the region change, with no mocks or retries. All six selected the intended capability, including image → general after a semantic edit; the interface displayed the returned brief, balanced, and deep effort values. These are small sequential deployment checks, not broad performance or model-accuracy benchmarks.

| Measurement | US East function (`iad1`) | Seoul function (`icn1`) |
| --- | --- | --- |
| Immediate typing acknowledgement | 3–19 ms | 2–14 ms |
| Request dispatch after input | 152–154 ms | 153–155 ms |
| Actual request round trip, all six cases | 1,722–3,786 ms | 430–1,293 ms |
| First request | 2,516 ms | 1,293 ms |
| Subsequent five requests | 1,722–3,786 ms | 430–631 ms |
| Jev stage | 179–301 ms | 199–306 ms |

The request round trip starts at dispatch; add the measured typing pause for input-to-response time (the response measurement ends before the subsequent React render). Immediate acknowledgement does not claim an instant inference result. The first post-deployment request is included, not discarded. Timing varies by network, cold starts, provider, and database conditions. One baseline settlement stage lasted 2,504 ms. No explicit refund or retry was made for uncertain accounting; a client timeout alone cannot establish whether the database committed. Revised settlement stages took 49–216 ms.

Both checks preserved textarea bounds, draft contents, and selection for all six cases; no page errors occurred and the interface fit 390×844 without horizontal overflow. Reports: `evaluation/results/v2-production-browser-iad1.json` and `evaluation/results/v2-production-browser-icn1.json`.

### Refreshed live recording

`artifacts/chatgpt-fluid-demo.mp4` was replaced by the completed revision 2 film recorded at 2026-09-23 14:13:01 UTC against the public Seoul deployment. Verified duration: **58.03 seconds**; 1920×1080 H.264, burned-in captions, no audio. It demonstrates five real live decisions, landscape image framing, the poster → maintenance checklist semantic edit, search controls, research setup, and drawing a room outline on the local sketch surface. The model and effort presets visibly change with the accepted route.

The five decisions took 395–447 ms on the server, including both budget operations and Jev. The separate browser smoke reports above measure round trip; these server numbers do not replace those. The recording preserves actual inference timing and contains no mocks, replays, or speed changes. Encoding/complete-stream decoding and scene-frame visual review passed. Captions, poster, recording metadata (including deployment and source commit), and raw capture remain in the ignored local `artifacts/` directory. The repository remains private.
