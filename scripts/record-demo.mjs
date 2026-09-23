import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import ffmpegPath from "ffmpeg-static";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const labels = { general: "General", image: "Create image", web: "Web search", research: "Deep research", sketch: "Sketch" };
const previewBanner = "Example preview — live Jev not connected";
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function optionsFrom(args) {
  const options = { baseUrl: "http://127.0.0.1:3000", examples: false };
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--examples") options.examples = true;
    else if (args[index] === "--base-url" && args[index + 1]) options.baseUrl = args[++index];
    else throw new Error("Use --base-url <origin> and/or --examples. See --help.");
  }
  let url;
  try { url = new URL(options.baseUrl); } catch { throw new Error("The base URL must be an HTTP(S) origin."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("The base URL must be an HTTP(S) origin without credentials, query, or path.");
  }
  options.baseUrl = url.origin;
  return options;
}

async function encode(args) {
  if (!ffmpegPath) throw new Error("ffmpeg-static is unavailable on this platform.");
  await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ["-hide_banner", "-loglevel", "error", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let error = "";
    child.stderr.on("data", (chunk) => { error = `${error}${chunk}`.slice(-2000); });
    child.on("error", () => reject(new Error("Could not start the installed ffmpeg-static binary.")));
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`Video encoding failed (${code}). ${error}`)));
  });
}

async function verifyVideo(filename) {
  const metadata = await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ["-hide_banner", "-nostats", "-i", filename, "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] });
    let output = "";
    child.stderr.on("data", (chunk) => { output = `${output}${chunk}`.slice(-12000); });
    child.on("error", () => reject(new Error("Could not verify the encoded video.")));
    child.on("close", (code) => code === 0 ? resolve(output) : reject(new Error("The encoded video could not be decoded successfully.")));
  });
  const match = metadata.match(/Duration:\s+(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const seconds = match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0;
  if (seconds < 45 || seconds > 60 || !/Video: h264[^\n]+1920x1080/.test(metadata)) {
    throw new Error("The encoded output did not verify as a 45–60 second 1920×1080 H.264 video.");
  }
  return seconds;
}

function vttTime(seconds) {
  const milliseconds = Math.round(seconds * 1000);
  return `${String(Math.floor(milliseconds / 3_600_000)).padStart(2, "0")}:${String(Math.floor(milliseconds / 60_000) % 60).padStart(2, "0")}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, "0")}.${String(milliseconds % 1000).padStart(3, "0")}`;
}

async function record(options) {
  // Status is read-only. Recording never bypasses the application's protected API.
  let status;
  try {
    const response = await fetch(`${options.baseUrl}/api/status`, { signal: AbortSignal.timeout(10_000), redirect: "error" });
    if (!response.ok) throw new Error();
    status = await response.json();
  } catch { throw new Error("The local/site status endpoint is unavailable. Start the reviewed application first."); }
  if (options.examples ? status.liveAvailable !== false : status.liveAvailable !== true) {
    throw new Error(options.examples
      ? "Example recording requires live inference disabled. Use a local server with LIVE_INFERENCE_ENABLED=false; the script does not fake its status."
      : "Live Jev is not connected. Connect and verify live inference, or explicitly use --examples for a labeled preview.");
  }

  const recordedAt = new Date().toISOString();
  const name = options.examples ? "chatgpt-fluid-preview" : "chatgpt-fluid-demo";
  const artifactDirectory = path.join(root, "artifacts");
  const takeDirectory = path.join(artifactDirectory, "recordings", recordedAt.replace(/[:.]/g, "-"));
  await mkdir(takeDirectory, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    recordVideo: { dir: takeDirectory, size: { width: 1920, height: 1080 } },
  });
  const videoStartedAt = performance.now();
  const page = await context.newPage();
  const video = page.video();
  page.setDefaultTimeout(8000);
  const captions = [];
  const decisions = [];
  let networkFailure = null;
  let storyStartedAt = 0;
  let durationSeconds = 0;
  let rawVideo;
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === "/api/intent" && !response.ok()) {
      networkFailure = `The real intent endpoint returned HTTP ${response.status()}.`;
    }
  });
  page.on("requestfailed", (request) => {
    if (new URL(request.url()).pathname === "/api/intent") networkFailure = "A real intent request failed.";
  });

  try {
    await page.goto(options.baseUrl, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("#privacy-note")).toContainText(options.examples ? "Live routing is unavailable" : "Drafts are sent to TypeSafe");
    // Recording-only annotations. No application state, responses, or mode DOM is modified.
    await page.evaluate(({ banner }) => {
      const caption = document.createElement("div");
      caption.id = "recording-caption";
      caption.setAttribute("aria-hidden", "true");
      Object.assign(caption.style, {
        position: "fixed", top: "148px", left: "50%", transform: "translateX(-50%)",
        width: "1100px", textAlign: "center", font: "500 28px/1.45 Geist, sans-serif",
        color: "#f2efea", letterSpacing: "-0.3px", pointerEvents: "none", zIndex: "10000",
      });
      document.body.append(caption);
      if (banner) {
        const disclosure = document.createElement("div");
        disclosure.textContent = banner;
        disclosure.id = "recording-example-disclosure";
        Object.assign(disclosure.style, {
          position: "fixed", top: "96px", left: "50%", transform: "translateX(-50%)",
          padding: "8px 18px", border: "1px solid #6b6253", borderRadius: "8px", background: "#27251f",
          color: "#e5cfaa", font: "500 18px/1.4 Geist, sans-serif", pointerEvents: "none", zIndex: "10001",
        });
        document.body.append(disclosure);
      }
    }, { banner: options.examples ? previewBanner : null });
    const prompt = page.getByRole("textbox", { name: "Your prompt" });
    const app = page.locator(".fluid-app");
    const elapsed = () => (performance.now() - storyStartedAt) / 1000;
    const guard = () => {
      if (networkFailure) throw new Error(`${networkFailure} No successful live film will be produced from this take.`);
      if (elapsed() > 58) throw new Error("This take exceeded its timing budget. No inference is sped up or cut; inspect the take before trying again.");
    };
    async function scene(text, endAt, action = async () => {}) {
      guard();
      const start = elapsed();
      captions.push({ start, text });
      await page.locator("#recording-caption").evaluate((element, value) => { element.textContent = value; }, text);
      await action();
      guard();
      // Preserve the real typing/inference time, then let the settled UI read.
      await sleep(Math.max(1200, (endAt - elapsed()) * 1000));
    }
    async function livePrompt(draft, mode, action) {
      const responsePromise = page.waitForResponse((response) => {
        if (new URL(response.url()).pathname !== "/api/intent" || response.request().method() !== "POST") return false;
        try { return response.request().postDataJSON().draft === draft; } catch { return false; }
      }, { timeout: 12_000 });
      // Attach the handler immediately so action errors cannot leave an unhandled timeout.
      const responseOutcome = responsePromise.then((response) => ({ response }), (error) => ({ error }));
      await action();
      const outcome = await responseOutcome;
      if (outcome.error) throw new Error("The real Jev response did not arrive. No mocked response or automatic retry was used.");
      const response = outcome.response;
      if (!response.ok()) throw new Error(`Real inference returned HTTP ${response.status()}; recording stopped.`);
      const result = await response.json();
      if (result.source !== "live" || result.mode !== mode) throw new Error(`Expected a real ${mode} decision, but the endpoint did not return it. Review the classifier; do not fake this transition.`);
      await expect(app).toHaveAttribute("data-mode", mode);
      await expect(page.getByRole("button", { name: `Suggested: ${labels[mode]}. Choose a capability` })).toBeVisible();
      await expect(page.getByText("Reading intent…", { exact: true })).toHaveCount(0);
      decisions.push({ mode: result.mode, model: result.model, serverLatencyMs: result.latencyMs, atSeconds: elapsed(), source: "live" });
    }
    async function typePrompt(draft, mode) {
      await livePrompt(draft, mode, async () => {
        await prompt.fill("");
        await prompt.pressSequentially(draft, { delay: 42 });
      });
    }
    async function example(button, mode) {
      await page.getByRole("button", { name: button, exact: true }).click();
      await expect(app).toHaveAttribute("data-mode", mode);
      await expect(page.getByRole("button", { name: `Example: ${labels[mode]}. Choose a capability` })).toBeVisible();
      await expect(page.getByText("Sample", { exact: true })).toBeVisible();
    }

    storyStartedAt = performance.now();
    await scene("Useful capabilities can stay hidden behind a click.", 6, async () => {
      await page.getByRole("button", { name: "Classic", exact: true }).click();
      await page.getByRole("button", { name: "Choose a capability", exact: true }).click();
      await expect(page.getByRole("menu", { name: "Capabilities" })).toBeVisible();
      await sleep(2500);
      await page.keyboard.press("Escape");
    });
    await page.getByRole("button", { name: "Fluid", exact: true }).click();

    if (options.examples) {
      await scene("A labeled example: creating an image.", 15, () => example("Imagine something", "image"));
      await scene("General stays neutral. This is a manual example, not a prediction.", 22, async () => {
        await page.getByRole("button", { name: "Choose a capability", exact: true }).click();
        await page.getByRole("menuitemradio", { name: /^General/ }).click();
        await expect(app).toHaveAttribute("data-mode", "general");
        await expect(page.getByText("Manual", { exact: true })).toBeVisible();
      });
      await scene("A labeled example: finding current information.", 29, () => example("Find the latest", "web"));
      await scene("A labeled example: investigating a question in depth.", 37, () => example("Go a little deeper", "research"));
      await scene("Sketch means you draw or attach an image to explain your idea.", 45, () => example("Draw your idea", "sketch"));
    } else {
      await scene("As you type, Jev reveals the likely capability.", 15, () => typePrompt("Create a minimal poster for a rooftop garden.", "image"));
      await scene("Change the meaning, and the interface follows.", 22, async () => {
        await livePrompt("Create a minimal maintenance checklist for a rooftop garden.", "general", async () => {
          await prompt.evaluate((element) => {
            const start = element.value.indexOf("poster");
            if (start < 0) throw new Error("The signature edit's starting word is missing.");
            element.focus();
            element.setSelectionRange(start, start + "poster".length);
          });
          await prompt.pressSequentially("maintenance checklist", { delay: 55 });
        });
      });
      await scene("Current information brings Web search into view.", 29, () => typePrompt("Find the latest news about reusable rockets.", "web"));
      await scene("A deeper question makes room for research.", 37, () => typePrompt("Research urban cooling methods and compare the evidence in a detailed report.", "research"));
      await scene("Want to draw your idea? Sketch becomes visible.", 45, () => typePrompt("Let me draw the room layout to show you what I mean.", "sketch"));
    }

    await scene("You can always choose a capability yourself.", 50, async () => {
      await page.getByRole("button", { name: "Choose a capability", exact: true }).click();
      await page.getByRole("menuitemradio", { name: /^Sketch/ }).click();
      await expect(page.getByRole("button", { name: "Selected: Sketch. Choose a capability" })).toBeVisible();
    });
    await scene("This previews the interface. No tool is running.", 54, async () => {
      await page.getByRole("button", { name: "Preview selected route" }).click();
      await expect(page.getByText("Sketch selected. UI demonstration only — no tool is running.", { exact: true })).toBeVisible();
    });
    const endCaption = options.baseUrl.includes("localhost") || options.baseUrl.includes("127.0.0.1")
      ? "ChatGPT Fluid · Built with TypeSafe Jev"
      : `${new URL(options.baseUrl).host} · Built with TypeSafe Jev`;
    await scene(endCaption, 58);
    durationSeconds = elapsed();
    if (durationSeconds < 45 || durationSeconds > 60 || networkFailure) throw new Error("The take did not meet the 45–60 second successful-recording criteria.");
  } finally {
    await context.close();
    rawVideo = await video.path();
    await browser.close();
  }

  const trimStart = Math.max(0, (storyStartedAt - videoStartedAt) / 1000);
  const temporaryMp4 = path.join(takeDirectory, `${name}.mp4`);
  // Trim only browser setup/teardown. The story keeps real wall-clock timing.
  await encode(["-y", "-i", rawVideo, "-ss", trimStart.toFixed(3), "-t", durationSeconds.toFixed(3), "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-movflags", "+faststart", temporaryMp4]);
  const encodedDurationSeconds = await verifyVideo(temporaryMp4);
  const mp4 = path.join(artifactDirectory, `${name}.mp4`);
  await rename(temporaryMp4, mp4);
  const cues = captions.map((caption, index) => `${vttTime(caption.start)} --> ${vttTime(captions[index + 1]?.start ?? durationSeconds)}\n${options.examples ? `${previewBanner}\n` : ""}${caption.text}`).join("\n\n");
  await writeFile(path.join(artifactDirectory, `${name}.vtt`), `WEBVTT\n\n${cues}\n`);
  await encode(["-y", "-ss", "12", "-i", mp4, "-frames:v", "1", path.join(artifactDirectory, `${name}-poster.png`)]);
  const packageData = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  await writeFile(path.join(artifactDirectory, `${name}.json`), `${JSON.stringify({
    recordedAt, mode: options.examples ? "labeled-examples" : "live", baseUrl: options.baseUrl,
    version: packageData.version, width: 1920, height: 1080, durationSeconds: encodedDurationSeconds, capturedDurationSeconds: durationSeconds, captionsBurnedIn: true,
    capture: "Actual browser interaction; no API interception, response replay, or inference speed changes.",
    rawVideo: path.relative(root, rawVideo), decisions, captions,
  }, null, 2)}\n`);
  console.log(`Recorded ${encodedDurationSeconds.toFixed(1)} seconds: ${path.relative(root, mp4)}`);
  console.log(`Captions, poster, and recording notes share the ${name} filename. Inspect the MP4 before publishing.`);
}

if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/record-demo.mjs [--base-url http://127.0.0.1:3000] [--examples]\nDefault: actual live Jev recording. --examples requires live disabled and keeps a visible example banner. Outputs a 1920×1080 captioned H.264 MP4 under artifacts/. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to reuse an installed Chromium.");
} else {
  Promise.resolve().then(() => record(optionsFrom(process.argv.slice(2)))).catch((error) => {
    console.error(error instanceof Error ? error.message : "Recording failed.");
    console.error("No successful new film is claimed. Any raw take is retained under artifacts/recordings/ for inspection; no live retry was attempted.");
    process.exitCode = 1;
  });
}
