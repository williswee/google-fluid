# Google Fluid — revised 30-second demo

The current film is `artifacts/google-fluid-demo-30s-v3.mp4`: exactly 30 seconds, 1920 × 1080, 30 fps, H.264, landscape, captions and no audio. It records the public site at https://googlefluid.vercel.app. All six searches receive real Jev decisions. The 35.75-second capture plays at the user-requested **1.3× speed**, followed by a 2.5-second end card. The playback label was removed at the user’s request; speed, timing, zooms, captions and footage are unchanged from v2.

| Finished time | Scene |
| --- | --- |
| 0–4.3s | Flights from Singapore to Tokyo; select One way. |
| 4.3–8.05s | Hotels in Tokyo for 2 guests; select Pool. |
| 8.05–12.15s | Images of the earth; show the loaded NASA Earth reference. |
| 12.15–16.75s | Sunrise in Singapore tomorrow; focus on the live forecast and sunrise time. |
| 16.75–20.6s | What does serendipity mean; show the dictionary definition. |
| 20.6–27.5s | Play the dinosaur game; Start and jump using the real keyboard controls. |
| 27.5–30s | Only: “Fluid search that changes shape :)” |

Camera moves keep the query and useful controls readable. The travel controls prepare searches, the Earth image is an attributed curated reference, and weather comes from the app's existing Open-Meteo endpoint. The Jev provenance badge remains visible. A recording-only pointer, click rings, captions, camera crops and the end card are editorial additions. No application state or API response is changed; the entire footage segment receives the same 1.3× speedup.

## Record or re-edit

```sh
node scripts/record-search-demo.mjs
node scripts/record-search-demo.mjs --render /absolute/path/to/v2/take.json
```

The recorder requires Playwright Chromium, `ffmpeg-static`, Arial on macOS, and live inference at the public origin. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to use an installed Chromium. Each real request uses the same shared budget guard as the site. The recorder checks all six routes, the loaded Earth image, tomorrow's forecast, the dictionary entry and real gameplay. A failed route or scene stops the take; there are no automatic retries. Re-editing makes no network or inference requests.

The encoder trims the removable black alignment marker, applies the uniform speedup, adds the camera and captions, and verifies a complete decode with exactly 30 seconds of 1080p H.264 video. Companion VTT captions, poster, contact sheet and JSON metadata use the same `google-fluid-demo-30s-v3` stem. Raw footage and capture logs remain under `artifacts/recordings/`. All media stays local and excluded from Git.

See the current entry in [DELIVERY.md](DELIVERY.md) for the take, measured decision times and checks. Earlier edits below are retained as historical records; they are not the current film.

---

# Previous Google Fluid edit — 30-second demo

The previous film is `artifacts/google-fluid-demo-30s.mp4`: 1920 × 1080, 30 fps, H.264, exactly 30 seconds, captioned, landscape, without audio. It records https://googlefluid.vercel.app with real Jev decisions and a manually selected dinosaur game. Smooth editorial zooms focus on the query, full travel panels, color controls and gameplay. Typing and inference remain at normal speed.

| Time | Scene |
| --- | --- |
| 0–7s | Type a Singapore-to-Tokyo flight query; Jev reveals the planner; select One way. |
| 7–14s | Change to hotels in Tokyo; Jev replaces the flight controls; select Pool. |
| 14–20.2s | Type a coral color-picker query; Jev reveals the tool; drag Blue to change the swatch. |
| 20.2–27.4s | Open `/`, filter dinosaur examples, choose the runner, Start and jump; pull back to the empty search bar. |
| 27.4–30s | Closing card: googlefluid.vercel.app and TypeSafe Jev credit. |

The Jev badge stays visible during automatic routing. The game shows “Selected by you.” The trip controls prepare searches; no prices or availability are invented. A recording-only pointer and click rings make real interactions visible. Captions, a clear caption band, camera crops and the closing card are editorial additions; application state and API responses are untouched.

## Previous recording notes

The commands and storyboard in this historical section describe the first edit. The current recorder uses the six-search v2 sequence documented above; retrieve the earlier recorder from Git history to re-render the first take.

```sh
node scripts/record-search-demo.mjs
node scripts/record-search-demo.mjs --render /absolute/path/to/take.json
```

Recording requires Playwright Chromium, `ffmpeg-static`, a macOS Arial font (or an updated font path in the script), and live inference enabled at the public origin. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to reuse an installed Chromium. Live requests pass through the existing shared budget guard. The recorder verifies the three expected real decisions, source labels and gameplay, and stops if a scene exceeds its timing window. There are no automatic retries. Re-editing an existing take makes no network or inference requests.

The alignment marker is removed before the story. The encoder locates it, trims setup/teardown, performs camera moves without speeding up the capture, and verifies full decode, duration, resolution and codec. Captures and MP4s remain ignored local artifacts. Companion files are `google-fluid-demo-30s.vtt`, `google-fluid-demo-30s-poster.png`, and `google-fluid-demo-30s.json`. Timestamped raw footage and capture logs are under `artifacts/recordings/`.

Recorded 24 September 2026. The delivered take contains three Jev requests: Flights, Hotels and Color. Their measured request-to-confirmed-UI times were 833, 892 and 703 ms (including assertion overhead); server times were 672, 723 and 582 ms. A first take was retained but discarded because it ended gameplay before a visible jump. Total recording attempts used six protected Jev requests; final editing used none. These measurements describe this capture, not a general latency guarantee.

---

# Historical ChatGPT composer recording

The sections below document the former interface and its existing 45–60-second artifacts. That recorder does not apply to the current Google Fluid site.

The recorder captures the actual browser at 1920 × 1080 and produces a captioned, landscape H.264 MP4 lasting 45–60 seconds. Its default storyboard aims for 58 seconds. It does not mock responses, change application state, speed up inference, or hide failed live requests.

## Live recording

Start the reviewed application with live Jev and its shared budget ledger connected. Then run:

```sh
node scripts/record-demo.mjs --base-url http://127.0.0.1:3000
```

To film the deployed application, use its verified origin:

```sh
node scripts/record-demo.mjs --base-url https://chatgptfluid.vercel.app
```

The script checks `/api/status` before opening the browser and requires `liveAvailable: true`. Each typed prompt must receive a real successful `/api/intent` response with the expected mode and `source: "live"`; the script also verifies that the corresponding suggestion has appeared in the interface. A wrong prediction, timeout, unavailable service, or excessive duration stops the take. There are no automatic retries. Live requests use the same protected endpoint and consume the same shared US$5 allowance as visitors.

Playwright Chromium and the installed `ffmpeg-static` development dependency are required. If Chromium is not already installed, use `npx playwright install chromium`. To reuse a compatible existing executable, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its absolute path before running the command. Run `node scripts/record-demo.mjs --help` for options. The recorder does not start the web server.

## Live storyboard

| Target time | Actual interaction | Caption |
| --- | --- | --- |
| 0–6s | Select Classic, open the + menu, let the capabilities remain readable, then close it. | “Useful capabilities can stay hidden behind a click.” |
| 6–15s | Select Fluid and type “Create a minimal poster for a rooftop garden.” Wait for the real Image decision and select Landscape. | “A thought reveals its tools, effort, and suggested model.” |
| 15–22s | Select the word “poster” and type “maintenance checklist.” Wait for the real General decision. | “Change the meaning. The text stays put; the setup follows.” |
| 22–29s | Type “Find the latest news about reusable rockets.” Wait for Web search. | “Current information reveals search and recency controls.” |
| 29–37s | Type “Research urban cooling methods and compare the evidence in a detailed report.” Wait for Deep research. | “A deeper question unfolds a research setup.” |
| 37–45s | Type “Let me draw the room layout to show you what I mean.” Wait for Sketch and draw a room outline on the local surface. | “Want to draw your idea? A drawing surface appears.” |
| 45–50s | Open the menu and select Sketch manually, leaving the “Selected” chip visible. | “Every suggestion stays under your control.” |
| 50–54s | Submit once, keeping the confirmation visible. | “A setup preview, without running a downstream model.” |
| 54–58s | Hold the final frame. A remote recording names the actual recorded host; a localhost recording makes no live-site claim. | “ChatGPT Fluid · Built with TypeSafe Jev” or the recorded host. |

The poster-to-checklist revision is the signature moment. If Jev does not make that transition in the real take, improve and re-evaluate the classifier before claiming it works. The recorder will not manually substitute the expected mode.

The script adds visible recording-only captions to the page DOM. These annotations do not change the production files, app controls, mode state, or network responses. It preserves the actual typing and inference time, holds each settled interface long enough to read, and trims only browser setup and teardown. A slow take may stop rather than being squeezed into a misleading timeline. After encoding, it decodes the output and verifies its actual duration, resolution, and H.264 codec before replacing the final MP4.

## Labeled example preview

When live inference is unavailable, start a local server with `LIVE_INFERENCE_ENABLED=false` and explicitly run:

```sh
node scripts/record-demo.mjs --base-url http://127.0.0.1:3000 --examples
```

This mode requires the actual status endpoint to report `liveAvailable: false`. It does not fake availability or intercept responses. Throughout the film, a persistent banner reads **“Example preview — live Jev not connected.”** Captions repeat that disclosure in the companion subtitle file.

The example storyboard opens the real Classic menu, switches to Fluid, and clicks the built-in Image, Web, Research, and Sketch sample cards. General is shown as an explicit manual selection. There is no simulated typing-driven prediction or semantic edit. The interface's “Example,” “Sample,” and “Manual” labels remain visible. The final preview is a demonstration of the interface, not evidence of live Jev performance.

## Outputs and review

Live mode writes:

- `artifacts/chatgpt-fluid-demo.mp4` — captioned H.264 video, no audio.
- `artifacts/chatgpt-fluid-demo.vtt` — companion WebVTT captions.
- `artifacts/chatgpt-fluid-demo-poster.png` — a still from the finished video.
- `artifacts/chatgpt-fluid-demo.json` — recording time, origin, package version, mode, duration, caption timing, and real decision metadata.

Example mode uses the `chatgpt-fluid-preview` filename stem so it cannot replace the live film. Raw WebM takes remain in timestamped directories under ignored `artifacts/recordings/`, including incomplete takes useful for diagnosis. A successful new take replaces the corresponding final output; a failed take is never reported as successful. The recording notes identify the current output and capture time.

Before sharing, inspect the complete MP4 at normal speed. Confirm the captions are readable without sound, every source label is honest, the composer remains readable, the semantic transition is visible in a live take, no credentials or personal data appear, and the output stays within 45–60 seconds. Verify a displayed public address resolves to the reviewed deployment. Record the reviewed commit or deployment identifier alongside the delivery notes. Keep raw takes private and out of Git.

The script creates a reproducible take, not a claim that recording has already happened. A real video and its metadata must exist before reporting the film as complete.
