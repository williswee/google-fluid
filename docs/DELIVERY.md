# Delivery status — 23 September 2026

## Project and outputs

- Local project: /Users/williswee/Downloads/Code/jev-ui-demo. Moved out of Slothware Ventures with Git history, settings, deployment link, dependencies, and artifacts intact. No old path references remain in source.
- Public interface: https://chatgptfluid.vercel.app (HTTP 200, no login required). Live Jev routing is enabled with the shared US$5 guard. Production deployment: https://chatgptfluid-43mlfubv1-williswees-projects.vercel.app.
- Source: https://github.com/williswee/chatgpt-fluid (private, main).
- Live recording: artifacts/chatgpt-fluid-demo.mp4, 58.03 seconds, 1920×1080 H.264, captions burned in. Recorded against https://chatgptfluid.vercel.app with real Jev responses; no mocked API responses, replay, or inference-speed edits. Caption, poster, metadata, and raw-take companions are in artifacts/.
- The earlier example-only preview is separately named and visibly labelled throughout.

## Verification

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

## Public activation

The public status endpoint returned HTTP 200 with liveAvailable=true. A real public POST /api/intent returned HTTP 200, source=live, mode=image, model=jev-1.13.0, and measured server latency of 2,118 ms (2,451 ms client round trip for that single smoke request). The existing ledger and cap are unchanged.

A public recording attempt encountered HTTP 503 and stopped without producing a successful film. The later five-mode browser check and complete public recording passed. The final recording preserves real response timing (server latency 810–1,989 ms across its five decisions) and ends with the public URL. Failed or uncertain calls retain their full budget reservations; no retry or refund bypass was introduced.

## Revision 2 — compact composer and adaptive setup

User-approved after the Impeccable review: compact pill, unfolding mode-specific tool tray, immediate neutral typing feedback, and effort plus named model previews. Image frame choices, search scope/recency, research outline format, and a local sketch input are functional configuration controls. No additional AI provider or downstream tool is called. Manual settings, draft position, and caret are preserved.

- Typing pause reduced from 350 to 150 ms. One in-flight request coalesces subsequent edits into the latest draft. Immediate acknowledgement is distinct from a confirmed decision.
- Jev classifies capability and effort in one request. The interface maps those values to illustrative model presets; the actual classifier remains jev-1.13.0.
- 90 unit/integration tests, 17 fixture browser tests, and the production build pass. Browser tests include stable textarea bounds, caret, coalescing, effort/model overrides, keyboard controls, 44px mobile targets, and local drawing controls. Desktop/mobile visual checks passed; the required design detector returned no findings.
- Existing dataset regressions: development15/15, round-trip p50/p95 743.85/1796.8 ms; previously evaluated held-out-labelled15/15, 778.63/1455.05 ms. These are reused capability regression sets, not fresh held-out benchmarks or effort-accuracy measurements. Reports are in evaluation/results.
- Six additional authored local-handler checks matched expected capability/effort; their measured Jev stage was319–414ms, with budget database/network work making up a substantial part of total latency. These do not measure production or a browser. See v2-stage-profile-local.json for context and stages.
- Public deployment verification and the refreshed recording are tracked below after deployment.
