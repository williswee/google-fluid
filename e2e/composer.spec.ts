import { expect, test, type Page, type Route } from "@playwright/test";
import { MODES, type ModeId } from "../lib/intent";

// All inference in this suite is an intercepted test fixture. These checks
// verify interaction behavior, not Jev accuracy or live inference latency.
function fixture(mode: ModeId) {
  return {
    mode,
    probabilities: Object.fromEntries(MODES.map((candidate) => [candidate, candidate === mode ? 0.8 : 0.05])),
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
  await page.clock.runFor(200);
  await prompt.fill("Create a poster for a rooftop garden");
  await page.clock.runFor(200);
  expect(requests).toHaveLength(0);
  await page.clock.runFor(151);
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

test("late responses cannot replace the latest prompt's decision", async ({ page }) => {
  const { requests, prompt, app } = await setup(page, { delayed: true });
  await prompt.fill("Create a poster for the park");
  await expect.poll(() => requests.length).toBe(1);
  await prompt.fill("Find the latest official park opening hours");
  await expect.poll(() => requests.length).toBe(2);
  await requests[1].route.fulfill({ json: fixture("web") });
  await expect(app).toHaveAttribute("data-mode", "web");
  await requests[0].route.fulfill({ json: fixture("image") });
  await expect(page.getByRole("button", { name: "Suggested: Web search. Choose a capability" })).toBeVisible();
  await expect(app).toHaveAttribute("data-mode", "web");
  await expect(prompt).toHaveValue("Find the latest official park opening hours");
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
  await expect(page.getByText("Live routing could not finish. Choose a capability.", { exact: true })).toBeVisible();
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
  await page.getByRole("button", { name: "Draw your idea" }).click();
  await expect(app).toHaveAttribute("data-mode", "sketch");
  await expect(page.getByRole("button", { name: "Example: Sketch. Choose a capability" })).toBeVisible();
  await expect(page.getByText("Sample", { exact: true })).toBeVisible();
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
  await expect(page.getByText("Sample", { exact: true })).toHaveCount(0);
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
