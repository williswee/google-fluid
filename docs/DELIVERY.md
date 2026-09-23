# Delivery status — 23 September 2026

## Project and outputs

- Local project: /Users/williswee/Downloads/Code/jev-ui-demo. Moved out of Slothware Ventures with Git history, settings, deployment link, dependencies, and artifacts intact. No old path references remain in source.
- Public interface: https://chatgptfluid.vercel.app (HTTP 200, no login required). Currently in explicitly labelled example mode while approval to store the TypeSafe key in Vercel is pending.
- Source: https://github.com/williswee/chatgpt-fluid (private, main).
- Live recording: artifacts/chatgpt-fluid-demo.mp4, 58.03 seconds, 1920×1080 H.264, captions burned in. Recorded against localhost with real Jev responses; no mocked API responses, replay, or inference-speed edits. Caption, poster, metadata, and raw-take companions are in artifacts/.
- The earlier example-only preview is separately named and visibly labelled throughout.

## Verification

- npm test: 76 tests pass, including real PostgreSQL logic via local PGlite.
- npm run build: passes from the relocated folder.
- Ten Playwright interaction scenarios pass with controlled fixtures; desktop/mobile browser review found no framework errors or horizontal overflow.
- Origin validation now supports Next's normalized localhost URL while verifying the actual Host and protocol. Regression tests reject mismatched host, port, scheme, and forwarded-header spoofing.
- Live development evaluation: 15/15 correct; client round-trip p50 773.01 ms, p95 2100.33 ms.
- Live held-out evaluation: 15/15 correct; client round-trip p50 726.29 ms, p95 1262.93 ms.
- Both evaluations used jev-1.13.0 through the budget-protected local endpoint. Cold starts are included. These small, authored English sets are a demo acceptance check, not a general benchmark. Full reports are in evaluation/results/.
- The recording verifies five actual decisions: Image, General after a semantic edit, Web, Research, and user-provided Sketch.

## Operating limits

- Existing Supabase Free project contains the isolated fluid_private US$5 ledger. Server credentials can access both narrow RPC functions.
- Active Vercel Hobby WAF: POST /api/intent, 120 requests/60 seconds/IP. Database rate limiting is global across deployments.
- Supabase and rate-limit secrets are configured as sensitive server-only Vercel values with explicit approval. No secrets are in Git or browser code.
- Local TypeSafe key works and local inference is enabled. Hosted inference remains disabled pending the separate credential-export approval requested by automatic approval review.

## Remaining hosted activation

After the user approves storing the TypeSafe API key in Vercel, securely configure TYPESAFE_API_KEY and LIVE_INFERENCE_ENABLED=true for the demo, redeploy, verify a real public request and browser transition, and update this status. The existing ledger and cap must remain unchanged.
