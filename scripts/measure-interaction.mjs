import { chromium, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

// Authored smoke cases, never visitor drafts. Calls use the app's shared budget.
const cases = [
  ['image', 'image', 'Create a minimal poster for a rooftop garden.'],
  ['semantic-edit', 'general', 'Create a minimal maintenance checklist for a rooftop garden.'],
  ['current-news', 'web', 'Find the latest news about reusable rockets.'],
  ['evidence-report', 'research', 'Research urban cooling methods and compare the evidence in a detailed report.'],
  ['drawing-input', 'sketch', 'Let me draw the room layout to show you what I mean.'],
  ['complex-analysis', 'general', 'Analyze race conditions in a concurrent cache and prove a locking strategy correct.'],
];
const baseUrl = process.argv[2] ?? 'http://127.0.0.1:3000';
const output = process.argv[3] ?? `evaluation/results/interaction-${new Date().toISOString().replaceAll(':', '-')}.json`;
const origin = new URL(baseUrl);
if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error('Supply an HTTP(S) origin only.');
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.name));
const report = { recordedAt: new Date().toISOString(), baseUrl: origin.origin, context: 'Six authored production browser smoke cases, not a general model benchmark. No mocks or retries. Input acknowledgement measured from input event to next animation frame after pending becomes visible.', cases: [], pageErrors };
try {
  await page.goto(origin.origin, { waitUntil: 'networkidle' });
  await expect(page.locator('#privacy-note')).toContainText('Drafts are sent to TypeSafe');
  await page.evaluate(() => {
    const input = document.querySelector('textarea');
    const app = document.querySelector('.fluid-app');
    window.fluidMeasure = {};
    input.addEventListener('input', () => { window.fluidMeasure = { inputAt: performance.now() }; }, true);
    new MutationObserver(() => {
      if (app.dataset.pending === 'true' && window.fluidMeasure.inputAt && !window.fluidMeasure.ackMs) {
        requestAnimationFrame(() => { window.fluidMeasure.ackMs = performance.now() - window.fluidMeasure.inputAt; });
      }
    }).observe(app, { attributes: true, attributeFilter: ['data-pending'] });
  });
  const prompt = page.getByRole('textbox', { name: 'Your prompt' });
  for (const [id, expected, draft] of cases) {
    const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/intent' && response.request().postDataJSON().draft === draft, { timeout: 18_000 });
    await prompt.fill(draft);
    const bounds = await prompt.boundingBox();
    const selection = await prompt.evaluate(element => [element.selectionStart, element.selectionEnd]);
    const response = await responsePromise;
    const result = await response.json();
    if (!response.ok()) throw new Error(`Case ${id}: HTTP ${response.status()} ${result.code}`);
    if (result.source !== 'live') throw new Error(`Case ${id}: not a live result`);
    await expect(page.locator('.fluid-app')).toHaveAttribute('data-pending', 'false');
    await expect(page.locator('.fluid-app')).toHaveAttribute('data-mode', expected);
    await expect(prompt).toHaveValue(draft);
    const currentBounds = await prompt.boundingBox();
    const currentSelection = await prompt.evaluate(element => [element.selectionStart, element.selectionEnd]);
    const measured = await page.evaluate(() => {
      const measure = window.fluidMeasure;
      const resource = performance.getEntriesByType('resource').filter(entry => entry.name.endsWith('/api/intent')).at(-1);
      return { ackMs: Math.round(measure.ackMs), dispatchAfterInputMs: Math.round(resource.startTime - measure.inputAt), roundTripMs: Math.round(resource.responseEnd - resource.startTime) };
    });
    const entry = { id, expected, mode: result.mode, effort: result.effort, source: result.source, model: result.model, timings: result.timings, serverLatencyMs: result.latencyMs, serverTimingHeader: response.headers()['server-timing'], ...measured, inputBoundsPreserved: JSON.stringify(bounds) === JSON.stringify(currentBounds), selectionPreserved: JSON.stringify(selection) === JSON.stringify(currentSelection), setup: await page.getByRole('button', { name: 'Response setup preview', exact: true }).innerText() };
    report.cases.push(entry);
    console.log(JSON.stringify(entry));
    if (!entry.inputBoundsPreserved || !entry.selectionPreserved) throw new Error(`Draft geometry/caret changed in ${id}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  report.mobileFits = await page.evaluate(() => document.documentElement.scrollWidth === innerWidth);
  console.log(JSON.stringify({ pageErrors, mobileFits: report.mobileFits }));
} finally {
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  await browser.close();
}
