import { expect, test, type Page, type Route } from "@playwright/test";
import { EFFORTS, MODES, type EffortId, type ModeId } from "../lib/intent";

// All inference in this suite is an intercepted test fixture. These checks
// verify interaction behavior, not Jev accuracy or live inference latency.
function fixture(mode: ModeId, effort: EffortId = "balanced") {
  return {
    mode,
    probabilities: Object.fromEntries(MODES.map((candidate) => [candidate, candidate === mode ? 0.8 : 0.05])),
    effort,
    effortProbabilities: Object.fromEntries(EFFORTS.map((candidate) => [candidate, candidate === effort ? 0.9 : 0.05])),
    model: "jev-1.13.0",
    latencyMs: 81,
    source: "live",
  };
}

async function setup(page: Page, options: { live?: boolean; delayed?: boolean; mode?: ModeId } = {}) {
  const requests: { draft: string; route: Route }[] = [];
  await page.route("**/api/status", (route) => route.fulfill({ json: { liveAvailable: options.live !== false } }));
  await page.route("**/api/intent", async (route) => {
    const { draft } = route.request().postDataJSON() as { draft: string };
    requests.push({ draft, route });
    if (!options.delayed) await route.fulfill({ json: fixture(options.mode ?? "image") });
  });
  await page.goto("/");
  await expect(page.locator("#privacy-note")).toContainText(options.live === false ? "Live routing is unavailable" : "Drafts are sent to TypeSafe");
  return { requests, prompt: page.getByRole("textbox", { name: "Your prompt" }), app: page.locator(".fluid-app") };
}

test("debounces edits and keeps the caret and prompt stable through a prediction", async ({ page }) => {
  const { requests, prompt, app } = await setup(page, { delayed: true });
  await page.clock.install();
  await prompt.fill("Create a poster");
  // Acknowledge the keystroke before the 150 ms debounce or any network result.
  await expect(app).toHaveAttribute("data-pending", "true");
  await expect(page.getByText("Reading intent…", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.clock.runFor(75);
  await prompt.fill("Create a poster for a rooftop garden");
  await page.clock.runFor(75);
  expect(requests).toHaveLength(0);
  await page.clock.runFor(76);
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].draft).toBe("Create a poster for a rooftop garden");
  await expect(page.getByText("Reading intent…", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview selected route" })).toBeDisabled();
  const before = await prompt.boundingBox();
  const selection = await prompt.evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd]);
  await requests[0].route.fulfill({ json: fixture("image") });
  await expect(app).toHaveAttribute("data-mode", "image");
  await expect(prompt).toBeFocused();
  await expect(prompt).toHaveValue("Create a poster for a rooftop garden");
  expect(await prompt.evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd])).toEqual(selection);
  expect(await prompt.boundingBox()).toEqual(before);
  await expect(page.getByRole("button", { name: "Suggested: Create image. Choose a capability" })).toBeVisible();
});

test("coalesces edits into one latest draft while one request is in flight", async ({ page }) => {
  const { requests, prompt, app } = await setup(page, { delayed: true });
  await page.clock.install();
  await prompt.fill("Create a poster for the park");
  await page.clock.runFor(151);
  await expect.poll(() => requests.length).toBe(1);
  await prompt.fill("Find official park opening hours");
  await page.clock.runFor(151);
  await prompt.fill("Find the latest official park opening hours");
  await page.clock.runFor(151);
  expect(requests).toHaveLength(1);
  await expect(app).toHaveAttribute("data-pending", "true");
  await requests[0].route.fulfill({ json: fixture("image") });
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].draft).toBe("Find the latest official park opening hours");
  // The stale image decision must never be committed while the latest request waits.
  await expect(app).toHaveAttribute("data-mode", "general");
  await expect(page.getByRole("button", { name: /^Suggested:/ })).toHaveCount(0);
  await requests[1].route.fulfill({ json: fixture("web", "brief") });
  await expect(app).toHaveAttribute("data-mode", "web");
  await expect(app).toHaveAttribute("data-pending", "false");
  await expect(page.getByRole("button", { name: "Suggested: Web search. Choose a capability" })).toBeVisible();
  await expect(prompt).toHaveValue("Find the latest official park opening hours");
});

test("keeps the confirmed presentation marked as updating until the new result arrives", async ({ page }) => {
  const { requests, prompt, app } = await setup(page, { delayed: true });
  await prompt.fill("Create a poster");
  await expect.poll(() => requests.length).toBe(1);
  await requests[0].route.fulfill({ json: fixture("image") });
  await expect(app).toHaveAttribute("data-mode", "image");
  await page.clock.install();
  await prompt.fill("Create a checklist");
  await expect(app).toHaveAttribute("data-pending", "true");
  await expect(page.getByText("Updating suggestion…", { exact: true })).toBeVisible();
  await expect(app).toHaveAttribute("data-mode", "image");
  await expect(page.getByRole("button", { name: "Preview selected route" })).toBeDisabled();
  expect(requests).toHaveLength(1);
  await page.clock.runFor(151);
  await expect.poll(() => requests.length).toBe(2);
  await requests[1].route.fulfill({ json: fixture("general", "brief") });
  await expect(app).toHaveAttribute("data-mode", "general");
  await expect(app).toHaveAttribute("data-pending", "false");
  await expect(prompt).toHaveValue("Create a checklist");
});

test("deleting the draft clears pending state and ignores the dispatched result", async ({ page }) => {
  const { requests, prompt, app } = await setup(page, { delayed: true });
  await prompt.fill("Create an illustration");
  await expect.poll(() => requests.length).toBe(1);
  await prompt.fill("");
  await expect(app).toHaveAttribute("data-pending", "false");
  await requests[0].route.fulfill({ json: fixture("image") });
  await expect(app).toHaveAttribute("data-mode", "general");
  await expect(prompt).toBeEmpty();
  await expect(page.getByRole("button", { name: /^Suggested:/ })).toHaveCount(0);
  expect(requests).toHaveLength(1);
});

test("manual selection holds through edits and in-flight responses until Auto returns", async ({ page }) => {
  const { requests, prompt, app } = await setup(page, { delayed: true });
  await prompt.fill("Create an illustration of a garden");
  await expect.poll(() => requests.length).toBe(1);
  await page.getByRole("button", { name: "Choose a capability", exact: true }).click();
  await page.getByRole("menuitemradio", { name: /Sketch/ }).click();
  await expect(app).toHaveAttribute("data-mode", "sketch");
  await requests[0].route.fulfill({ json: fixture("image") });
  await prompt.fill("Now find the latest news");
  await page.waitForTimeout(450);
  expect(requests).toHaveLength(1);
  await expect(page.getByRole("button", { name: "Selected: Sketch. Choose a capability" })).toBeVisible();
  await page.getByRole("button", { name: "Return to automatic routing" }).click();
  await expect.poll(() => requests.length).toBe(2);
  await requests[1].route.fulfill({ json: fixture("web") });
  await expect(app).toHaveAttribute("data-mode", "web");
  await expect(page.getByRole("button", { name: "Suggested: Web search. Choose a capability" })).toBeVisible();
});

test("provider failure preserves the draft and permits an honest manual fallback", async ({ page }) => {
  const { requests, prompt, app } = await setup(page, { delayed: true });
  await prompt.fill("Research urban cooling in depth");
  await expect.poll(() => requests.length).toBe(1);
  await requests[0].route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Live routing could not finish. Choose a capability." } });
  await expect(page.locator(".error-copy")).toContainText("Live routing could not finish. Choose a capability.");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(prompt).toHaveValue("Research urban cooling in depth");
  await expect(app).toHaveAttribute("data-mode", "general");
  await expect(page.getByRole("button", { name: /^Suggested:/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Choose a capability", exact: true }).click();
  await page.getByRole("menuitemradio", { name: /Deep research/ }).click();
  await expect(page.getByText("Manual", { exact: true })).toBeVisible();
  await expect(app).toHaveAttribute("data-mode", "research");
  expect(requests).toHaveLength(1);
});

test("IME composition does not route partial text or submit on composing Enter", async ({ page }) => {
  const { requests, prompt } = await setup(page);
  await prompt.dispatchEvent("compositionstart");
  await prompt.fill("自分で部屋の間取りを描きたい");
  await prompt.dispatchEvent("keydown", { key: "Enter", code: "Enter", isComposing: true });
  await page.waitForTimeout(450);
  expect(requests).toHaveLength(0);
  await expect(page.getByText(/UI demonstration only/)).toHaveCount(0);
  await prompt.dispatchEvent("compositionend", { data: "自分で部屋の間取りを描きたい" });
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].draft).toBe("自分で部屋の間取りを描きたい");
});

test("oversized UTF-8 prompts are kept locally and never sent", async ({ page }) => {
  const { requests, prompt, app } = await setup(page);
  await prompt.fill("猫".repeat(667));
  await expect(prompt).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Your prompt is 2,001 bytes. Keep it under 2,000.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview selected route" })).toBeDisabled();
  await page.waitForTimeout(450);
  expect(requests).toHaveLength(0);
  await expect(app).toHaveAttribute("data-mode", "general");
  await prompt.fill("Create an image of a cat");
  await expect.poll(() => requests.length).toBe(1);
  await expect(prompt).toHaveAttribute("aria-invalid", "false");
});

test("offline examples stay labeled as samples, including their source details", async ({ page }) => {
  const { requests, app } = await setup(page, { live: false });
  await page.getByRole("button", { name: "Try sketch mode" }).click();
  await expect(app).toHaveAttribute("data-mode", "sketch");
  await expect(page.getByRole("button", { name: "Example: Sketch. Choose a capability" })).toBeVisible();
  await expect(page.getByText("Example", { exact: true })).toBeVisible();
  await page.getByText("How it works", { exact: true }).click();
  await expect(page.locator("dd").filter({ hasText: "Example transition" })).toBeVisible();
  await expect(page.getByText("No live measurement yet", { exact: true })).toBeVisible();
  await page.waitForTimeout(450);
  expect(requests).toHaveLength(0);
});

test("live predictions and submitted previews use distinct, truthful labels", async ({ page }) => {
  const { requests, prompt } = await setup(page, { mode: "image" });
  await prompt.fill("Generate a pencil sketch of a cat");
  await expect(page.getByRole("button", { name: "Suggested: Create image. Choose a capability" })).toBeVisible();
  await expect(page.getByText("Example", { exact: true })).toHaveCount(0);
  await page.getByText("How it works", { exact: true }).click();
  await expect(page.locator("dd").filter({ hasText: "Live Jev decision" })).toBeVisible();
  await page.getByText("How it works", { exact: true }).click();
  await page.getByRole("button", { name: "Preview selected route" }).click();
  await expect(page.getByText("Create image selected. UI demonstration only — no tool is running.", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
});

test("Classic keeps the draft and neutral interface without new inference requests", async ({ page }) => {
  const { requests, prompt, app } = await setup(page);
  await prompt.fill("Create an image of a garden");
  await expect(app).toHaveAttribute("data-mode", "image");
  await page.getByRole("button", { name: "Classic", exact: true }).click();
  await expect(app).toHaveAttribute("data-interface", "classic");
  await expect(app).toHaveAttribute("data-mode", "general");
  await expect(prompt).toHaveValue("Create an image of a garden");
  await prompt.fill("Find the latest news");
  await page.waitForTimeout(450);
  expect(requests).toHaveLength(1);
  await page.getByRole("button", { name: "Fluid", exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
});

test("the mode menu supports keyboard navigation, selection, and Escape focus", async ({ page }) => {
  await setup(page, { live: false });
  const chooser = page.getByRole("button", { name: "Choose a capability", exact: true });
  await chooser.click();
  await expect(page.getByRole("menuitemradio", { name: /Auto/ })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("menuitemradio", { name: /Sketch/ })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("menuitemradio", { name: /Auto/ })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(chooser).toBeFocused();
});

test("Jev's effort changes the model preset, while a manual effort stays locked", async ({ page }) => {
  const { requests, prompt } = await setup(page, { delayed: true });
  const setupButton = page.getByRole("button", { name: "Response setup preview", exact: true });
  await prompt.fill("Write a quick greeting");
  await expect.poll(() => requests.length).toBe(1);
  await requests[0].route.fulfill({ json: fixture("general", "brief") });
  await expect(setupButton).toContainText("Brief");
  await expect(setupButton).toContainText("GPT-6 Luna");
  await setupButton.click();
  const setupDialog = page.getByRole("dialog", { name: "Response setup preview" });
  await expect(setupDialog).toBeVisible();
  await setupDialog.getByLabel("Effort", { exact: true }).selectOption("deep");
  await page.keyboard.press("Escape");
  await expect(setupButton).toContainText("Deep");
  await expect(setupButton).toContainText("GPT-6 Astra");

  await prompt.fill("Find today's weather forecast");
  await expect.poll(() => requests.length).toBe(2);
  await requests[1].route.fulfill({ json: fixture("web", "balanced") });
  await expect(page.getByRole("button", { name: "Suggested: Web search. Choose a capability" })).toBeVisible();
  await expect(setupButton).toContainText("Deep");
  await expect(setupButton).toContainText("GPT-6 Astra");
  await setupButton.click();
  await setupDialog.getByLabel("Effort", { exact: true }).selectOption("auto");
  await page.keyboard.press("Escape");
  await expect(setupButton).toContainText("Balanced");
  await expect(setupButton).toContainText("GPT-6 Sol");
  expect(requests).toHaveLength(2);
});

test("model overrides are local previews and never trigger extra inference", async ({ page }) => {
  const { requests, prompt } = await setup(page, { delayed: true });
  const setupButton = page.getByRole("button", { name: "Response setup preview", exact: true });
  await prompt.fill("Compare these ideas with a detailed reasoning process");
  await expect.poll(() => requests.length).toBe(1);
  await requests[0].route.fulfill({ json: fixture("general", "deep") });
  await expect(setupButton).toContainText("GPT-6 Astra");
  await setupButton.click();
  const setupDialog = page.getByRole("dialog", { name: "Response setup preview" });
  const modelSelect = setupDialog.getByLabel("Model", { exact: true });
  await modelSelect.selectOption({ label: "GPT-6 Luna" });
  await page.keyboard.press("Escape");
  await expect(setupButton).toContainText("GPT-6 Luna");
  await expect(setupButton).toContainText("Deep");
  await prompt.fill("Explain these design tradeoffs step by step in detail");
  await expect.poll(() => requests.length).toBe(2);
  await requests[1].route.fulfill({ json: fixture("general", "deep") });
  await expect(setupButton).toContainText("GPT-6 Luna");
  await setupButton.click();
  await modelSelect.selectOption("auto");
  await page.keyboard.press("Escape");
  await expect(setupButton).toContainText("GPT-6 Astra");
  await page.getByRole("button", { name: "Preview selected route" }).click();
  await expect(page.getByText("General selected. UI demonstration only — no tool is running.", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(2);
});

test("mobile keeps source labels visible and all visible buttons at least 44 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { prompt, app } = await setup(page);
  await prompt.fill("Create a poster for a rooftop garden");
  const suggestion = page.getByRole("button", { name: "Suggested: Create image. Choose a capability" });
  await expect(suggestion).toBeVisible();
  await expect(suggestion.getByText("Suggested:", { exact: true })).toBeVisible();
  const tooSmall = await app.getByRole("button").evaluateAll((elements) => elements.flatMap((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && (bounds.width < 43.5 || bounds.height < 43.5)
      ? [{ name: element.getAttribute("aria-label") ?? element.textContent?.trim(), width: bounds.width, height: bounds.height }]
      : [];
  }));
  expect(tooSmall).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Choose a capability", exact: true }).click();
  await page.getByRole("menuitemradio", { name: /Sketch/ }).click();
  const selected = page.getByRole("button", { name: "Selected: Sketch. Choose a capability" });
  await expect(selected.getByText("Selected:", { exact: true })).toBeVisible();
});

test("mode trays keep local options across capability changes without inference", async ({ page }) => {
  const { requests } = await setup(page, { live: false });
  const choose = async (mode: string) => {
    await page.getByRole("button", { name: "Choose a capability", exact: true }).click();
    await page.getByRole("menuitemradio", { name: new RegExp(`^${mode}`) }).click();
  };
  await page.getByRole("button", { name: "Imagine something" }).click();
  const imageTray = page.getByRole("region", { name: "Image setup preview" });
  await imageTray.getByRole("button", { name: "Landscape 16:9" }).click();
  await expect(imageTray.getByRole("button", { name: "Landscape 16:9" })).toHaveAttribute("aria-pressed", "true");
  await choose("Web search");
  const searchTray = page.getByRole("region", { name: "Search setup preview" });
  await searchTray.getByRole("combobox", { name: "Sources", exact: true }).selectOption("Primary sources");
  await searchTray.getByRole("combobox", { name: "Recency", exact: true }).selectOption("Past week");
  await choose("Deep research");
  const researchTray = page.getByRole("region", { name: "Research setup preview" });
  await researchTray.getByRole("combobox", { name: "Output structure", exact: true }).selectOption("Comparison");
  await expect(researchTray.getByLabel("Comparison outline preview", { exact: true })).toBeVisible();
  await choose("Create image");
  await expect(imageTray.getByRole("button", { name: "Landscape 16:9" })).toHaveAttribute("aria-pressed", "true");
  await choose("Web search");
  await expect(searchTray.getByRole("combobox", { name: "Sources", exact: true })).toHaveValue("Primary sources");
  await expect(searchTray.getByRole("combobox", { name: "Recency", exact: true })).toHaveValue("Past week");
  await page.getByRole("button", { name: "Preview selected route" }).click();
  await expect(page.getByText("Web search selected. UI demonstration only — no tool is running.", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(0);
});

test("drawing and its text alternative stay local, survive mode changes, and clear on reset", async ({ page }) => {
  const { requests } = await setup(page, { live: false });
  await page.getByRole("button", { name: "Try sketch mode" }).click();
  const canvas = page.locator(".sketch-canvas");
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + 30, bounds!.y + 40);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + 85, bounds!.y + 70, { steps: 5 });
  await page.mouse.up();
  await expect(canvas.locator("path")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Undo last stroke" })).toBeEnabled();
  await page.getByLabel("Describe the drawing instead").fill("A room with a window on the left");
  await expect(canvas).toHaveAttribute("aria-label", "A room with a window on the left");
  await page.getByRole("button", { name: "Choose a capability", exact: true }).click();
  await page.getByRole("menuitemradio", { name: /^Create image/ }).click();
  await page.getByRole("button", { name: "Choose a capability", exact: true }).click();
  await page.getByRole("menuitemradio", { name: /^Sketch/ }).click();
  await expect(canvas.locator("path")).toHaveCount(1);
  await expect(page.getByLabel("Describe the drawing instead")).toHaveValue("A room with a window on the left");
  await page.getByRole("button", { name: "Undo last stroke" }).click();
  await expect(canvas.locator("path")).toHaveCount(0);
  await page.getByRole("button", { name: "Reset prompt" }).click();
  await page.getByRole("button", { name: "Try sketch mode" }).click();
  await expect(page.getByLabel("Describe the drawing instead")).toBeEmpty();
  await expect(canvas.locator("path")).toHaveCount(0);
  expect(requests).toHaveLength(0);
});
