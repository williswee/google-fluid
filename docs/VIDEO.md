# Reproducible demo recording

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
| 6–15s | Select Fluid and type “Create a minimal poster for a rooftop garden.” Wait for the real Image decision. | “As you type, Jev reveals the likely capability.” |
| 15–22s | Select the word “poster” and type “maintenance checklist.” Wait for the real General decision. | “Change the meaning, and the interface follows.” |
| 22–29s | Type “Find the latest news about reusable rockets.” Wait for Web search. | “Current information brings Web search into view.” |
| 29–37s | Type “Research urban cooling methods and compare the evidence in a detailed report.” Wait for Deep research. | “A deeper question makes room for research.” |
| 37–45s | Type “Let me draw the room layout to show you what I mean.” Wait for Sketch, which means user drawing input. | “Want to draw your idea? Sketch becomes visible.” |
| 45–50s | Open the menu and select Sketch manually, leaving the “Selected” chip visible. | “You can always choose a capability yourself.” |
| 50–54s | Submit once, keeping the confirmation visible. | “This previews the interface. No tool is running.” |
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
