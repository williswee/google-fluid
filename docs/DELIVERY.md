# Current delivery — Fluid Search, 24 September 2026

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

Public deployment details and browser measurements are added after verification below. No search video was created or re-recorded.

---

# Historical delivery — ChatGPT prototype, 23 September 2026

## Project and outputs

- Local project: /Users/williswee/Downloads/Code/jev-ui-demo. Moved out of Slothware Ventures with Git history, settings, deployment link, dependencies, and artifacts intact. No old path references remain in source.
- Public interface: https://chatgptfluid.vercel.app (HTTP 200, no login required). Live Jev routing is enabled with the shared US$5 guard. Current production deployment: https://chatgptfluid-q00stgduk-williswees-projects.vercel.app (revision 2, code commit b99f720).
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
