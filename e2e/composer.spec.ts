import { expect, test, type Page, type Route } from '@playwright/test';
import { MODES, type ModeId } from '../lib/intent';
import { SEARCH_MODES } from '../lib/search-presets';

// These browser checks intercept every inference call. They measure interaction
// behavior, not Jev accuracy, provider latency, or live external search results.
function fixture(mode: ModeId) {
  return {
    mode,
    probabilities: Object.fromEntries(MODES.map(candidate => [candidate, candidate === mode ? .89 : .01])),
    model: 'jev-1.13.0', latencyMs: 81, source: 'live',
  };
}

async function setup(page: Page, options: { live?: boolean; delayed?: boolean; mode?: ModeId } = {}) {
  const requests: { draft: string; route: Route }[] = [];
  await page.route('**/api/status', route => route.fulfill({ json: { liveAvailable: options.live !== false } }));
  await page.route('**/api/intent', async route => {
    requests.push({ draft: route.request().postDataJSON().draft, route });
    if (!options.delayed) await route.fulfill({ json: fixture(options.mode ?? 'weather') });
  });
  await page.goto('/');
  await expect(page.locator('#privacy-note')).toContainText(options.live === false ? 'Live routing is unavailable' : 'Drafts are sent to TypeSafe');
  return { requests, query: page.getByRole('textbox', { name: 'Search query' }), app: page.locator('.fluid-app') };
}
const panel = (page: Page, mode: ModeId) => page.getByRole('region', { name: `${SEARCH_MODES[mode].label} search tools` });
const example = (page: Page, mode: ModeId) => page.getByRole('button', { name: `Try ${SEARCH_MODES[mode].label}: ${SEARCH_MODES[mode].example}`, exact: true });

// The clock assertions distinguish immediate acknowledgement from a paid decision.
test('acknowledges typing immediately, debounces, and preserves the caret and input bounds', async ({ page }) => {
  const { requests, query, app } = await setup(page, { delayed: true });
  await page.clock.install();
  await query.fill('Will it rain');
  await expect(app).toHaveAttribute('data-pending', 'true');
  await expect(page.getByText('Reading your search…', { exact: true })).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.clock.runFor(75);
  await query.fill('Will it rain in Tokyo tomorrow');
  await page.clock.runFor(75);
  expect(requests).toHaveLength(0);
  await page.clock.runFor(76);
  await expect.poll(() => requests.length).toBe(1);
  const before = await query.boundingBox();
  const caret = await query.evaluate((el: HTMLTextAreaElement) => [el.selectionStart, el.selectionEnd]);
  await requests[0].route.fulfill({ json: fixture('weather') });
  await expect(panel(page, 'weather')).toBeVisible();
  await expect(app).toHaveAttribute('data-pending', 'false');
  await expect(query).toHaveValue('Will it rain in Tokyo tomorrow');
  await expect(query).toBeFocused();
  expect(await query.evaluate((el: HTMLTextAreaElement) => [el.selectionStart, el.selectionEnd])).toEqual(caret);
  expect(await query.boundingBox()).toEqual(before);
});

test('coalesces rapid edits and never commits a stale response', async ({ page }) => {
  const { requests, query, app } = await setup(page, { delayed: true });
  await page.clock.install();
  await query.fill('Will it rain tomorrow');
  await page.clock.runFor(151);
  await expect.poll(() => requests.length).toBe(1);
  await query.fill('Find a cafe');
  await page.clock.runFor(151);
  await query.fill('Find a quiet cafe in Singapore');
  await page.clock.runFor(151);
  expect(requests).toHaveLength(1);
  await requests[0].route.fulfill({ json: fixture('weather') });
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].draft).toBe('Find a quiet cafe in Singapore');
  await expect(app).toHaveAttribute('data-mode', 'general');
  await expect(panel(page, 'weather')).toHaveCount(0);
  await requests[1].route.fulfill({ json: fixture('places') });
  await expect(panel(page, 'places')).toBeVisible();
  await expect(app).toHaveAttribute('data-pending', 'false');
});

test('keeps the previous presentation marked Updating until a new decision arrives', async ({ page }) => {
  const { requests, query, app } = await setup(page, { delayed: true });
  await query.fill('weather in Tokyo');
  await expect.poll(() => requests.length).toBe(1);
  await requests[0].route.fulfill({ json: fixture('weather') });
  await expect(panel(page, 'weather')).toBeVisible();
  await page.clock.install();
  await query.fill('10 km in miles');
  await expect(page.getByText('Updating…', { exact: true })).toBeVisible();
  await expect(app).toHaveAttribute('data-mode', 'weather');
  expect(requests).toHaveLength(1);
  await page.clock.runFor(151);
  await expect.poll(() => requests.length).toBe(2);
  await requests[1].route.fulfill({ json: fixture('convert') });
  await expect(panel(page, 'convert')).toBeVisible();
  await expect(app).toHaveAttribute('data-pending', 'false');
});

test('clearing the query ignores an already-dispatched decision', async ({ page }) => {
  const { requests, query, app } = await setup(page, { delayed: true });
  await query.fill('Tokyo forecast');
  await expect.poll(() => requests.length).toBe(1);
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await expect(query).toBeEmpty();
  await expect(app).toHaveAttribute('data-pending', 'false');
  await requests[0].route.fulfill({ json: fixture('weather') });
  await expect(app).toHaveAttribute('data-mode', 'general');
  await expect(panel(page, 'weather')).toHaveCount(0);
  expect(requests).toHaveLength(1);
});

test('explicit search syntax reveals tools immediately without a Jev request', async ({ page }) => {
  const { requests, query, app } = await setup(page);
  await page.clock.install();
  await query.fill('climate report filetype:pdf');
  await expect(panel(page, 'documents')).toBeVisible();
  await expect(app).toHaveAttribute('data-pending', 'false');
  await expect(page.getByText('Search syntax · instant', { exact: true })).toBeVisible();
  await page.clock.runFor(500);
  expect(requests).toHaveLength(0);
  await panel(page, 'documents').getByRole('button', { name: /PPTX/ }).click();
  await expect(query).toHaveValue('climate report filetype:pptx');
  await page.clock.runFor(500);
  expect(requests).toHaveLength(0);
});

test('literal syntax supersedes a pending natural-language result', async ({ page }) => {
  const { requests, query, app } = await setup(page, { delayed: true });
  await query.fill('rain tomorrow');
  await expect.poll(() => requests.length).toBe(1);
  await query.fill('rain research site:gov');
  await expect(panel(page, 'site')).toBeVisible();
  await expect(app).toHaveAttribute('data-pending', 'false');
  await requests[0].route.fulfill({ json: fixture('weather') });
  await expect(app).toHaveAttribute('data-mode', 'site');
  await expect(query).toHaveValue('rain research site:gov');
  expect(requests).toHaveLength(1);
});

test('IME composition does not route partial text or submit a composing Enter', async ({ page }) => {
  const { requests, query } = await setup(page);
  const popups: Page[] = [];
  page.on('popup', popup => popups.push(popup));
  await query.dispatchEvent('compositionstart');
  await query.fill('東京の明日の天気');
  await query.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  await page.waitForTimeout(250);
  expect(requests).toHaveLength(0);
  expect(popups).toHaveLength(0);
  await query.dispatchEvent('compositionend', { data: '東京の明日の天気' });
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].draft).toBe('東京の明日の天気');
});

test('oversized UTF-8 queries remain local and recover when shortened', async ({ page }) => {
  const { requests, query, app } = await setup(page);
  await query.fill('猫'.repeat(667));
  await expect(query).toHaveAttribute('aria-invalid', 'true');
  await page.waitForTimeout(250);
  expect(requests).toHaveLength(0);
  await expect(app).toHaveAttribute('data-pending', 'false');
  await query.fill('rain in Tokyo');
  await expect.poll(() => requests.length).toBe(1);
  await expect(query).toHaveAttribute('aria-invalid', 'false');
});

test('provider errors preserve the query and an explicit retry recovers', async ({ page }) => {
  const { requests, query, app } = await setup(page, { delayed: true });
  await query.fill('Tokyo forecast');
  await expect.poll(() => requests.length).toBe(1);
  await requests[0].route.fulfill({ status: 503, json: { code: 'UNAVAILABLE', error: 'Live routing is unavailable. Try again.' } });
  await expect(page.getByText('Live routing is unavailable. Try again.', { exact: false })).toBeVisible();
  await expect(query).toHaveValue('Tokyo forecast');
  await expect(app).toHaveAttribute('data-mode', 'general');
  await expect(app).toHaveAttribute('data-pending', 'false');
  await page.getByRole('button', { name: /Retry|Try again/, exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
  await requests[1].route.fulfill({ json: fixture('weather') });
  await expect(panel(page, 'weather')).toBeVisible();
});

test('Classic keeps the query, hides specialized tools, and skips inference', async ({ page }) => {
  const { requests, query, app } = await setup(page);
  await query.fill('Tokyo weather');
  await expect(panel(page, 'weather')).toBeVisible();
  await page.getByRole('button', { name: 'Classic', exact: true }).click();
  await expect(app).toHaveAttribute('data-mode', 'general');
  await expect(panel(page, 'weather')).toHaveCount(0);
  await expect(query).toHaveValue('Tokyo weather');
  await query.fill('Singapore weather');
  await page.waitForTimeout(250);
  expect(requests).toHaveLength(1);
  await page.getByRole('button', { name: 'Fluid', exact: true }).click();
  await expect.poll(() => requests.length).toBe(2);
});

test('offline examples remain explicitly labelled examples', async ({ page }) => {
  const { requests, query } = await setup(page, { live: false });
  await example(page, 'weather').click();
  await expect(query).toHaveValue(SEARCH_MODES.weather.example);
  await expect(panel(page, 'weather')).toBeVisible();
  await expect(page.getByText('Example · live routing unavailable', { exact: true })).toBeVisible();
  await page.waitForTimeout(250);
  expect(requests).toHaveLength(0);
});

test('natural-language examples wait for real classification when live routing is available', async ({ page }) => {
  const { requests, app } = await setup(page, { delayed: true });
  await page.getByRole('button', { name: 'All 12 searches', exact: true }).click();
  await example(page, 'movies').click();
  await expect(app).toHaveAttribute('data-pending', 'true');
  await expect(panel(page, 'movies')).toHaveCount(0);
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].draft).toBe(SEARCH_MODES.movies.example);
  await requests[0].route.fulfill({ json: fixture('movies') });
  await expect(panel(page, 'movies')).toBeVisible();
  await expect(page.getByText('Example · live routing unavailable', { exact: true })).toHaveCount(0);
});

test('the local converter calculates, swaps units, and rejects impossible temperatures', async ({ page }) => {
  const { requests } = await setup(page, { live: false });
  await example(page, 'convert').click();
  const converter = panel(page, 'convert');
  const result = converter.getByLabel('Converted value');
  await expect(result).toHaveText('6.213712');
  await converter.getByRole('button', { name: 'Swap units', exact: true }).click();
  await expect(converter.getByRole('combobox', { name: 'Convert from' })).toHaveValue('mi');
  await expect(converter.getByRole('combobox', { name: 'Convert to' })).toHaveValue('km');
  await expect(result).toHaveText('10');
  await converter.getByRole('combobox', { name: 'Measurement type' }).selectOption('Temperature');
  await converter.getByRole('spinbutton', { name: 'Amount', exact: true }).fill('-300');
  await expect(result).toHaveText('—');
  await converter.getByRole('spinbutton', { name: 'Amount', exact: true }).fill('0');
  await expect(result).toHaveText('32');
  expect(requests).toHaveLength(0);
});

test('currency requests link to a live lookup without fabricating an exchange rate', async ({ page }) => {
  const { query } = await setup(page, { mode: 'convert' });
  await query.fill('100 USD in SGD');
  const currency = panel(page, 'convert');
  await expect(currency.getByRole('heading', { name: 'Currency exchange' })).toBeVisible();
  await expect(currency.getByLabel('Converted value')).toHaveCount(0);
  const destination = await currency.getByRole('link', { name: /Look up the live rate/ }).getAttribute('href');
  expect(new URL(destination!).host).toBe('www.google.com');
  expect(new URL(destination!).searchParams.get('q')).toBe('100 USD in SGD');
});

test('place filters change a Maps destination without fetching invented places', async ({ page }) => {
  const { requests } = await setup(page, { live: false });
  await example(page, 'places').click();
  const places = panel(page, 'places');
  await places.getByRole('button', { name: 'Parks', exact: true }).click();
  const destination = new URL((await places.getByRole('link', { name: /Explore on Maps/ }).getAttribute('href'))!);
  expect(destination.host).toBe('www.google.com');
  expect(destination.pathname).toBe('/maps/search/');
  expect(destination.searchParams.get('query')).toBe(`${SEARCH_MODES.places.example} parks`);
  await expect(places.getByText(/Illustrative map/)).toBeVisible();
  expect(requests).toHaveLength(0);
});

test('mobile has no horizontal overflow and visible buttons retain 44px targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { app, query } = await setup(page, { live: false });
  await example(page, 'convert').click();
  await expect(panel(page, 'convert')).toBeVisible();
  await query.fill('climate report site:gov filetype:pdf');
  await expect(panel(page, 'documents')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const undersized = await app.getByRole('button').evaluateAll(elements => elements.flatMap(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && (bounds.width < 43.5 || bounds.height < 43.5)
      ? [{ name: element.getAttribute('aria-label') ?? element.textContent?.trim(), width: bounds.width, height: bounds.height }]
      : [];
  }));
  expect(undersized).toEqual([]);
});

test('reduced motion disables presentation animation and Escape clears the query', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { app, query } = await setup(page, { live: false });
  await example(page, 'weather').click();
  await expect(panel(page, 'weather')).toBeVisible();
  const moving = await app.evaluate(element => [...element.querySelectorAll('*')].filter(node => {
    const style = getComputedStyle(node);
    return [...style.animationDuration.split(','), ...style.transitionDuration.split(',')].some(value => parseFloat(value) > .001);
  }).map(node => node.className));
  expect(moving).toEqual([]);
  await query.focus();
  await page.keyboard.press('Escape');
  await expect(query).toBeEmpty();
  await expect(query).toBeFocused();
});

test('removing mixed syntax chips preserves other filters and the original search words', async ({ page }) => {
  const { requests, query, app } = await setup(page, { delayed: true });
  await query.fill('climate custom:keep site:gov filetype:pdf after:2024-01-01');
  await expect(panel(page, 'documents')).toBeVisible();
  await page.getByRole('button', { name: 'Remove File type: pdf', exact: true }).click();
  await expect(query).toHaveValue('climate custom:keep site:gov after:2024-01-01');
  await expect(panel(page, 'site')).toBeVisible();
  await page.getByRole('button', { name: 'Remove Site: gov', exact: true }).click();
  await expect(query).toHaveValue('climate custom:keep after:2024-01-01');
  await expect(panel(page, 'date')).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.getByRole('button', { name: 'Remove After: 2024-01-01', exact: true }).click();
  await expect(query).toHaveValue('climate custom:keep');
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].draft).toBe('climate custom:keep');
  await requests[0].route.fulfill({ json: fixture('general') });
  await expect(app).toHaveAttribute('data-mode', 'general');
});

test('a manually chosen search tool stays selected through edits until Auto returns', async ({ page }) => {
  const { requests, query, app } = await setup(page, { delayed: true });
  await query.fill('rain tomorrow');
  await expect.poll(() => requests.length).toBe(1);
  const picker = page.getByRole('combobox', { name: 'Choose search tool' });
  await picker.selectOption('movies');
  await expect(panel(page, 'movies')).toBeVisible();
  await requests[0].route.fulfill({ json: fixture('weather') });
  await query.fill('quiet cafes in Singapore');
  await page.waitForTimeout(250);
  await expect(app).toHaveAttribute('data-mode', 'movies');
  expect(requests).toHaveLength(1);
  await picker.selectOption('auto');
  await expect.poll(() => requests.length).toBe(2);
  await requests[1].route.fulfill({ json: fixture('places') });
  await expect(panel(page, 'places')).toBeVisible();
});

// A specialized route must never display an unrelated default calculation.
test("unsupported conversions keep the original query without inventing a value", async ({ page }) => {
  const { query } = await setup(page, { mode: "convert" });
  await query.fill("9am Singapore in London");
  await expect(page.getByRole("heading", { name: "Find the right conversion." })).toBeVisible();
  await expect(page.getByLabel("Converted value")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Convert on Google/ })).toHaveAttribute("href", "https://www.google.com/search?q=9am+Singapore+in+London");
});
