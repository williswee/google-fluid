import { chromium, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

// Authored cases only. Natural queries use the existing protected budget.
const cases = [
  ['weather', 'will I need an umbrella in Tokyo tomorrow', false],
  ['convert', '10 km in miles', false],
  ['places', 'quiet cafes in Singapore', false],
  ['define', 'what does serendipity mean', false],
  ['finance', 'AAPL stock performance', false],
  ['movies', 'Dune Part Two showtimes', false],
  ['news', 'latest news about reusable rockets', false],
  ['documents', 'climate change report filetype:pdf', true],
  ['site', 'design systems site:github.com', true],
  ['date', 'solar energy after:2024-01-01 before:2025-01-01', true],
  ['precise', '"jaguar speed" -car', true],
  ['general', 'why do cats purr', false],
];
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:3000');
const output = process.argv[3] ?? `evaluation/results/search-browser-${new Date().toISOString().replaceAll(':', '-')}.json`;
if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error('Supply an HTTP(S) origin only.');
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
let requestCount = 0;
page.on('pageerror', error => pageErrors.push(error.name));
page.on('request', request => { if (new URL(request.url()).pathname === '/api/intent') requestCount++; });
const report = { recordedAt: new Date().toISOString(), baseUrl: origin.origin, dataset: 'search-v1-browser', context: 'Twelve authored production browser smoke cases: eight real Jev requests and four explicit local-syntax transitions. No fixtures, retries, or fake results. Round trip excludes typing pause and subsequent rendering; acknowledgement is input-to-next-frame pending feedback.', cases: [], pageErrors };
try {
  await page.goto(origin.origin, { waitUntil: 'networkidle' });
  await expect(page.locator('#privacy-note')).toContainText('Drafts are sent to TypeSafe');
  await page.evaluate(() => {
    const input = document.querySelector('textarea');
    const app = document.querySelector('.fluid-app');
    window.fluidMeasure = {};
    input.addEventListener('input', () => { window.fluidMeasure = { inputAt: performance.now() }; }, true);
    new MutationObserver(() => {
      if (app.dataset.pending === 'true' && window.fluidMeasure.inputAt && !window.fluidMeasure.ackMs) requestAnimationFrame(() => { window.fluidMeasure.ackMs = performance.now() - window.fluidMeasure.inputAt; });
      if (window.fluidMeasure.inputAt) requestAnimationFrame(() => { window.fluidMeasure.modePaintMs = performance.now() - window.fluidMeasure.inputAt; });
    }).observe(app, { attributes: true, attributeFilter: ['data-pending', 'data-mode'] });
  });
  const input = page.getByRole('textbox', { name: 'Search query' });
  for (const [expected, draft, local] of cases) {
    const beforeCount = requestCount;
    const responsePromise = local ? null : page.waitForResponse(response => new URL(response.url()).pathname === '/api/intent' && response.request().postDataJSON().draft === draft, { timeout: 18_000 });
    await input.fill(draft);
    const bounds = await input.boundingBox();
    const selection = await input.evaluate(element => [element.selectionStart, element.selectionEnd]);
    let result = null, response = null;
    if (responsePromise) {
      response = await responsePromise;
      result = await response.json();
      if (!response.ok() || result.source !== 'live') throw new Error(`Case ${expected}: no successful live result (${response.status()})`);
    }
    await expect(page.locator('.fluid-app')).toHaveAttribute('data-pending', 'false');
    await expect(page.locator('.fluid-app')).toHaveAttribute('data-mode', expected);
    await expect(input).toHaveValue(draft);
    await page.waitForTimeout(330); // Let the one panel transition settle; never edit response timing.
    if (local) {
      await expect(page.locator('.decision-source')).toHaveText('Search syntax · instant');
      if (requestCount !== beforeCount) throw new Error('Explicit syntax unexpectedly called inference');
    }
    const measured = await page.evaluate(local => {
      const measure = window.fluidMeasure;
      const resource = performance.getEntriesByType('resource').filter(entry => entry.name.endsWith('/api/intent')).at(-1);
      return local ? { localModePaintMs: Math.round(measure.modePaintMs) } : { ackMs: Math.round(measure.ackMs), dispatchAfterInputMs: Math.round(resource.startTime - measure.inputAt), roundTripMs: Math.round(resource.responseEnd - resource.startTime) };
    }, local);
    const entry = { id: expected, expected, mode: await page.locator('.fluid-app').getAttribute('data-mode'), source: local ? 'local-syntax' : result.source, ...(result ? { model: result.model, timings: result.timings, serverLatencyMs: result.latencyMs } : {}), ...measured, inferenceRequests: requestCount - beforeCount, inputBoundsPreserved: JSON.stringify(bounds) === JSON.stringify(await input.boundingBox()), selectionPreserved: JSON.stringify(selection) === JSON.stringify(await input.evaluate(element => [element.selectionStart, element.selectionEnd])) };
    report.cases.push(entry); console.log(JSON.stringify(entry));
    if (!entry.inputBoundsPreserved || !entry.selectionPreserved) throw new Error(`Input moved in ${expected}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  report.mobileFits = await page.evaluate(() => document.documentElement.scrollWidth === innerWidth);
  if (!report.mobileFits || pageErrors.length) throw new Error('Browser verification found an error or overflow');
} finally {
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  await browser.close();
}
