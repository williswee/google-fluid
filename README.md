# ChatGPT Fluid

An independent interaction demo of a composer that adapts as you type. TypeSafe Jev predicts whether a draft is an ordinary request, an image request, a web lookup, a request to draw or attach visual input, or a research task. The compact composer reveals mode-specific controls and a suggested effort/model setup, with a coordinated background response before submission. Typing is acknowledged immediately; confirmed suggestions still wait for Jev.

The interface takes inspiration from ChatGPT and has its own identity. This project is not affiliated with OpenAI or TypeSafe. It does not run ChatGPT skills: submission only confirms the selected route and states that no tool is running. It produces no generated content or mock answers.

The public interface is deployed at [chatgptfluid.vercel.app](https://chatgptfluid.vercel.app). Live Jev routing is enabled under the shared US$5 launch allowance. Manual selection and explicitly labelled examples remain available when live routing is unavailable. The repository is private and will only be made public on an explicit request. See [delivery status](docs/DELIVERY.md) for verified checks, recording details, and operating limits.

## Run locally

Requires Node.js 22 or newer and npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

Open the localhost URL printed by Next.js. With the default `LIVE_INFERENCE_ENABLED=false`, example exploration remains available and is labeled as such. It is not live Jev inference.

To enable live routing:

1. Use an existing TypeSafe API key and an existing Supabase Free project. Apply the SQL migration in `supabase/migrations/` through the Supabase SQL editor before enabling requests.
2. Set `TYPESAFE_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Set `RATE_LIMIT_SECRET` to a random secret containing at least 32 characters.
3. Set `LIVE_INFERENCE_ENABLED=true` and restart the development server. Keep every value server-only; none uses a `NEXT_PUBLIC_` prefix.

Do not put credentials in source code, screenshots, recordings, issue text, or committed environment files. The server never sends these credentials to the browser.

## How it works

The browser sends the current draft to `POST /api/intent`. The server validates the request, reserves from a shared budget in Supabase, and asks Jev two parallel Choice questions: capability and effort (brief, balanced, deep). The response contains one mode, five capability probabilities, an effort and three effort probabilities, the classifier model identifier, and measured request/stage latencies. Uncertain classifications stay in the ordinary composer state. A manual selection remains available to the visitor.

Sketch means user-provided drawing input: “Let me draw the room layout to show you” should expose Sketch. “Generate a sketch of a cat” requests model-generated output and belongs to Image. “Sketch out a plan” requests a written outline and stays General. The demo previews those capability choices. Its local drawing input stays in tab memory; it does not generate content, upload drawings, search pages, or run research jobs.

```ts
// POST /api/intent
{ draft: string }

// Successful response
{
  mode: "general" | "image" | "web" | "research" | "sketch";
  probabilities: Record<"general" | "image" | "web" | "research" | "sketch", number>;
  effort: "brief" | "balanced" | "deep";
  effortProbabilities: Record<"brief" | "balanced" | "deep", number>;
  timings: { reserveMs: number; inferenceMs: number; settleMs: number };
  model: string;
  latencyMs: number;
  source: "live";
}

// Error response (with an appropriate non-2xx HTTP status)
{ code: string; error: string }

// GET /api/status
{ liveAvailable: boolean }
```

`liveAvailable` reports server configuration readiness. It does not promise provider availability or remaining budget. `/api/intent` performs the authoritative checks for each request. Programmatic evaluation sends an `Origin` header matching the site's origin, just as the browser does.

## Responsive setup previews

The browser acknowledges typing immediately and sends after a 150 ms pause. It permits one request in flight and replaces queued work with the latest draft, ignoring obsolete results without cancelling their budget settlement. A 30-entry exact-draft cache lives only in the current tab. Mode changes keep the input geometry stable. Model/effort controls and tray configuration can be changed manually; Preview reports the selected setup without running it.

Jev effort is independently confidence-gated; ambiguous effort stays balanced. The app then maps capability and effort to illustrative model presets (brief: GPT-6 Luna, balanced: GPT-6 Sol, deep: GPT-6 Astra; image: GPT Image 2.5 Flare or Sunburst). These are UI choices, not another model call or a claimed model-selection benchmark. Names were checked against the [official model catalog](https://developers.openai.com/api/docs/models) on 23 September 2026. The classifier remains Jev.

`Server-Timing` and response stage timings separate the budget check, Jev request, and settlement. The browser's round trip is separately measured. A faster acknowledgement is not a claim of instantaneous inference. The delivery notes distinguish the original acceptance results from the revised production checks and recording.

## Cost, privacy, and deployment

The demo has one application-enforced **US$5 launch allowance**, shared by visitors, local live testing, evaluation, and recording. Supabase atomically reserves the maximum permitted upstream attempt before it runs; successful calls settle to reported input usage. Failed or uncertain attempts retain their conservative reservation. There are no automatic retries, refills, billing upgrades, or new paid integrations. Budget or ledger failures stop live inference and leave labeled example exploration available. See [operations notes](docs/OPERATIONS.md) for setup and verification.

Live inference sends draft text to TypeSafe as the visitor types, before Preview is pressed. The application does not persist prompt text or completed conversations. The Supabase ledger stores operational accounting and daily HMAC-based client identifiers for rate limiting; it does not store raw IP addresses or prompts. Hosting and inference providers may process request metadata under their own policies. Visitors should not enter sensitive information. The interface labels fixture examples separately from live predictions.

Production is intended for Vercel Hobby with Supabase Free. Set the five server environment variables in the selected Vercel project, apply the migration, then deploy. Keep live inference disabled until these checks pass. Reuse the same Supabase ledger across local work and production so the launch allowance is shared. A second database would create a second allowance and must not be used as a refill.

## Checks and evaluation

```sh
npm test
npm run build
npm run test:e2e
```

The browser suite intercepts both API endpoints with controlled fixtures. It checks debounce, stale responses, manual overrides, outages, IME composition, UTF-8 limits, source labels, Classic/Fluid switching, and keyboard access; it does not establish real model accuracy or latency. Install Playwright's Chromium with `npx playwright install chromium` if it is not already present, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a compatible existing Chromium executable. The test runner reuses an existing local server or starts one automatically.

Live evaluation is separate and consumes the shared allowance. It is never part of the default test or build commands.

To measure the actual browser interaction and the protected server stages on six authored cases:

```sh
node scripts/measure-interaction.mjs https://chatgptfluid.vercel.app evaluation/results/new-browser-check.json
```

Use a new report filename. This also spends from the shared allowance; there are no mocks or automatic retries.

```sh
# Development set: 15 authored prompts, balanced across five modes.
npm run evaluate -- --base-url http://localhost:3000

# Held-out acceptance set: run after the routing contract is settled.
npm run evaluate -- --split held-out --base-url http://localhost:3000
```

Use the same origin the server is listening on; `http://127.0.0.1:3000` is also supported. Run `npm run evaluate -- --help` for options. The harness sends requests sequentially through the normal protected API, stops at the first error, and does not retry. It writes a uniquely named JSON report under `evaluation/results/`; an existing report is never overwritten. Reports contain authored case IDs, labels, predictions, probability distributions, and timings, not private visitor drafts or raw error responses.

Accuracy is reported on completed live responses, with failures and completion counts shown separately. Latency includes cold starts and uses nearest-rank p50/p95: client timing includes HTTP round trip, while server timing covers validation, budget reservation, Jev, and settlement. A partial run is explicitly labeled and is not a full-set result.

The development and held-out sets are separate. Do not tune on held-out failures and continue calling the same set unseen. These small English-only sets check the demo; they do not establish broad model accuracy. The measured acceptance run classified all 15 development and 15 held-out prompts correctly. Held-out client p50/p95 was 726.29/1262.93 ms, including cold starts; these small authored sets are not a general accuracy benchmark. See [delivery status](docs/DELIVERY.md) and the committed reports for the exact context. See [evaluation notes](evaluation/README.md).

## Sharing the work

[The video plan](docs/VIDEO.md) defines a captioned 45–60 second recording of the actual interface, including a mid-prompt change of intent. Keep live versus illustrative behavior visible throughout. Before making the repository public, review its Git history for credentials, remove private operational artifacts, and update this README with the verified deployment URL and only genuinely measured results.
