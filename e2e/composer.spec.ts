import { expect, test, type Page, type Route } from '@playwright/test';
import { MODES, type ModeId } from '../lib/intent';
import { SEARCH_EXAMPLES, SEARCH_MODES } from '../lib/search-presets';

// These browser checks intercept every inference call. They measure interaction
// behavior, not Jev accuracy, provider latency, or live external search results.
function fixture(mode: ModeId) {
  return {
    mode,
    probabilities: Object.fromEntries(MODES.map(candidate => [candidate, candidate === mode ? .9 : .1 / (MODES.length - 1)])),
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
  await page.route('**/api/weather?**', route => {
    const city = new URL(route.request().url()).searchParams.get('city') ?? 'tokyo';
    return route.fulfill({ json: { city, timezone: city === 'tokyo' ? 'Asia/Tokyo' : 'Asia/Singapore', fetchedAt: new Date().toISOString(), days: [0,1,2,3,4].map(index => ({ date: `2026-09-${24+index}`, high: 28 + index, low: 22 + index, rain: 20 + index * 10, code: index === 0 ? 0 : 2, sunrise: `2026-09-${24+index}T06:15`, sunset: `2026-09-${24+index}T18:30` })) } });
  });
  await page.route('**/api/currency?**', route => {
    const url = new URL(route.request().url());
    const from = url.searchParams.get('from'); const to = url.searchParams.get('to');
    return route.fulfill({ json: { base: from, quote: to, rate: from === 'USD' ? .9 : 1 / .9, date: '2026-09-23' } });
  });
  await page.goto('/');
  await expect(page.locator('#privacy-note')).toContainText(options.live === false ? 'Live routing is unavailable' : 'Drafts are sent to TypeSafe');
  return { requests, query: page.getByRole('combobox', { name: 'Search query' }), app: page.locator('.fluid-app') };
}
const panel = (page: Page, mode: ModeId) => page.getByRole('region', { name: `${SEARCH_MODES[mode].label} search tools` });
async function choose(page: Page, mode: ModeId, query = SEARCH_MODES[mode].example) {
  await page.getByRole('button', { name: 'Browse all search tools', exact: true }).click();
  await page.getByRole('option').filter({ has: page.getByText(query, { exact: true }) }).click();
  await expect(panel(page, mode)).toBeVisible();
}

// The clock assertions distinguish immediate acknowledgement from a paid decision.
test('acknowledges typing immediately, debounces, and preserves the caret and input bounds', async ({ page }) => {
  const { requests, query, app } = await setup(page, { delayed: true });
  await page.clock.install();
  await query.fill('Will it rain');
  await expect(app).toHaveAttribute('data-pending', 'true');
  await expect(page.locator('.search-status')).toHaveCount(0);
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

test('the slash picker remains usable offline and clearly labels manual selection', async ({ page }) => {
  const { requests, query } = await setup(page, { live: false });
  await choose(page, 'weather');
  await expect(query).toHaveValue(SEARCH_MODES.weather.example);
  await expect(page.getByRole('button', { name: 'Selected by you. How it works' })).toBeVisible();
  await page.waitForTimeout(250);
  expect(requests).toHaveLength(0);
});

test('palette selection is immediate and the next semantic edit returns to live routing', async ({ page }) => {
  const { requests, query, app } = await setup(page, { delayed: true });
  await choose(page, 'movies');
  await expect(app).toHaveAttribute('data-pending', 'false');
  await page.waitForTimeout(250);
  expect(requests).toHaveLength(0);
  await query.fill('quiet cafes in Singapore');
  await expect.poll(() => requests.length).toBe(1);
  await requests[0].route.fulfill({ json: fixture('places') });
  await expect(panel(page, 'places')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Selected by you. How it works' })).toHaveCount(0);
});

test('the local converter calculates, swaps units, and rejects impossible temperatures', async ({ page }) => {
  const { requests } = await setup(page, { live: false });
  await choose(page, 'convert');
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

test('currency values use the returned rate and support amount edits and swap', async ({ page }) => {
  const { requests } = await setup(page);
  await choose(page, 'convert', '100 USD to EUR');
  const currency = panel(page, 'convert');
  await expect(currency.getByRole('heading', { name: 'Currency converter' })).toBeVisible();
  await expect(currency.getByLabel('Converted currency value')).toHaveText('90');
  await currency.getByLabel('Currency amount').fill('20');
  await expect(currency.getByLabel('Converted currency value')).toHaveText('18');
  await currency.getByRole('button', { name: 'Swap currencies' }).click();
  await expect(currency.getByLabel('Source currency')).toHaveValue('EUR');
  await expect(currency.getByLabel('Target currency')).toHaveValue('USD');
  await expect(currency.getByLabel('Converted currency value')).toHaveText('22.22');
  expect(requests).toHaveLength(0);
});

test('place filters change a Maps destination without fetching invented places', async ({ page }) => {
  const { requests } = await setup(page, { live: false });
  await choose(page, 'places');
  const places = panel(page, 'places');
  await places.getByRole('button', { name: 'Parks', exact: true }).click();
  const destination = new URL((await places.getByRole('link', { name: /Explore on Maps/ }).getAttribute('href'))!);
  expect(destination.host).toBe('www.google.com');
  expect(destination.pathname).toBe('/maps/search/');
  expect(destination.searchParams.get('query')).toBe(`${SEARCH_MODES.places.example} parks`);
  await page.getByRole('button', { name: 'How it works', exact: true }).click();
  await expect(page.getByRole('region', { name: 'How Fluid Search works' })).toContainText('map illustration is schematic');
  expect(requests).toHaveLength(0);
});

test('mobile has no horizontal overflow and visible buttons retain 44px targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { app, query } = await setup(page, { live: false });
  await choose(page, 'convert');
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
  await choose(page, 'weather');
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
  await page.getByRole('button', { name: 'How it works', exact: true }).click();
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

test('the quiet landing view puts notices behind How it works and lists every tool with slash', async ({ page }) => {
  const { requests } = await setup(page);
  await expect(page.locator('.examples')).toHaveCount(0);
  await expect(page.locator('.search-status')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'How Fluid Search works' })).toHaveCount(0);
  await page.getByRole('button', { name: 'How it works', exact: true }).click();
  const about = page.getByRole('region', { name: 'How Fluid Search works' });
  await expect(about).toContainText('Drafts are sent to TypeSafe');
  await expect(about).toContainText('not affiliated with Google');
  await page.getByRole('button', { name: 'Close explanation' }).click();
  await expect(page.getByRole('button', { name: 'How it works', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Browse all search tools' }).click();
  await expect(page.getByRole('listbox', { name: 'Search tools' }).getByRole('option')).toHaveCount(SEARCH_EXAMPLES.length);
  await page.waitForTimeout(250);
  expect(requests).toHaveLength(0);
});

test('slash filtering and keyboard selection never classify palette text; Escape restores the draft', async ({ page }) => {
  const { requests, query } = await setup(page);
  await query.fill('design systems site:github.com');
  await query.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(7, 13));
  await page.getByRole('button', { name: 'Browse all search tools' }).click();
  await query.fill('/color');
  await expect(query).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('option')).toHaveCount(2);
  await query.press('ArrowDown');
  await expect(query).toHaveAttribute('aria-activedescendant', 'search-option-1');
  await query.press('Escape');
  await expect(query).toHaveValue('design systems site:github.com');
  await expect(query).toBeFocused();
  expect(await query.evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd])).toEqual([7, 13]);
  await query.fill('/color');
  await query.press('ArrowDown');
  await query.press('Enter');
  await expect(query).toHaveValue('color picker coral');
  await expect(panel(page, 'color').getByLabel('Hex color', { exact: true })).toHaveValue('#ff7f50');
  await expect(query).toHaveAttribute('aria-expanded', 'false');
  await page.waitForTimeout(250);
  expect(requests).toHaveLength(0);
});

test('a palette with no matches keeps the draft and Enter cannot submit a Google search', async ({ page }) => {
  const { requests, query } = await setup(page);
  const popups: Page[] = [];
  page.on('popup', popup => popups.push(popup));
  await query.fill('stars site:nasa.gov');
  await page.getByRole('button', { name: 'Browse all search tools' }).click();
  await query.fill('/zzzzzzzz');
  await expect(page.getByRole('option')).toHaveCount(0);
  await expect(page.getByText('No tool matches.', { exact: false })).toBeVisible();
  await query.press('Enter');
  await page.waitForTimeout(200);
  expect(popups).toHaveLength(0);
  expect(requests).toHaveLength(0);
  await query.press('Escape');
  await expect(query).toHaveValue('stars site:nasa.gov');
});

test('calculator keypad and tip split produce real local results', async ({ page }) => {
  const { requests } = await setup(page);
  await choose(page, 'calculate');
  const calculator = panel(page, 'calculate');
  await expect(calculator.getByLabel('Calculation result')).toHaveText('438');
  await calculator.getByRole('button', { name: 'Clear calculation' }).click();
  await calculator.getByRole('button', { name: '2', exact: true }).click();
  await calculator.getByRole('button', { name: 'Multiply', exact: true }).click();
  await calculator.getByRole('button', { name: '3', exact: true }).click();
  await expect(calculator.getByLabel('Calculation result')).toHaveText('6');
  await calculator.getByLabel('Calculation', { exact: true }).fill('1 / 0');
  await expect(calculator.getByLabel('Calculation result')).toHaveText('—');
  await choose(page, 'calculate', 'split $84 between 3 people with a 15% tip');
  await expect(calculator.getByLabel('Each person pays')).toHaveText('$32.20');
  await calculator.getByLabel('Number of people').fill('2');
  await expect(calculator.getByLabel('Each person pays')).toHaveText('$48.30');
  expect(requests).toHaveLength(0);
});

test('timer starts only on action, pauses without drifting, and resets', async ({ page }) => {
  await setup(page);
  await choose(page, 'timer');
  await page.clock.install();
  const timer = panel(page, 'timer');
  const remaining = timer.getByLabel('Time remaining');
  await page.clock.runFor(2100);
  await expect(remaining).toHaveText('05:00');
  await timer.getByRole('button', { name: 'Start timer' }).click();
  await page.clock.runFor(2100);
  await expect(remaining).toHaveText('04:58');
  await timer.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await remaining.textContent();
  await page.clock.runFor(5000);
  await expect(remaining).toHaveText(paused!);
  await timer.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(remaining).toHaveText('05:00');
  await timer.getByLabel('Timer duration in minutes').fill('0.01');
  await timer.getByRole('button', { name: 'Start timer' }).click();
  await page.clock.runFor(800);
  await expect(remaining).toHaveText('00:00');
  await expect(timer.locator('.timer-done')).toBeVisible();
});

test('stopwatch records real laps and reset clears them', async ({ page }) => {
  await setup(page);
  await choose(page, 'stopwatch');
  await page.clock.install();
  const stopwatch = panel(page, 'stopwatch');
  await expect(stopwatch.getByLabel('Elapsed time')).toHaveText('00:00.00');
  await stopwatch.getByRole('button', { name: 'Start stopwatch' }).click();
  await page.clock.runFor(1260);
  await expect(stopwatch.getByLabel('Elapsed time')).toHaveText(/^00:01\.\d{2}$/);
  await stopwatch.getByRole('button', { name: 'Lap', exact: true }).click();
  await expect(stopwatch.getByRole('list', { name: 'Lap times' }).getByRole('listitem')).toHaveCount(1);
  await stopwatch.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await stopwatch.getByLabel('Elapsed time').textContent();
  await page.clock.runFor(2000);
  await expect(stopwatch.getByLabel('Elapsed time')).toHaveText(paused!);
  await stopwatch.getByRole('button', { name: 'Reset stopwatch' }).click();
  await expect(stopwatch.getByLabel('Elapsed time')).toHaveText('00:00.00');
  await expect(stopwatch.getByRole('list', { name: 'Lap times' })).toHaveCount(0);
});

test('color controls update their swatch and copy the actual hex value', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await setup(page);
  await choose(page, 'color');
  const color = panel(page, 'color');
  const hex = color.getByLabel('Hex color', { exact: true });
  await hex.click();
  await hex.press('ControlOrMeta+A');
  await hex.pressSequentially('#ff0000');
  await expect(color.getByLabel('Red channel')).toHaveValue('255');
  await expect(color.getByLabel('Green channel')).toHaveValue('0');
  await color.getByLabel('Green channel').fill('127');
  await expect(color.getByLabel('Hex color', { exact: true })).toHaveValue('#ff7f00');
  await color.getByRole('button', { name: 'Copy hex color' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('#ff7f00');
});

test('tic-tac-toe can be won, undo restores play, and new game clears the board', async ({ page }) => {
  await setup(page);
  await choose(page, 'game');
  const game = panel(page, 'game');
  for (const [row, column] of [[1,1],[2,1],[1,2],[2,2],[1,3]]) await game.getByRole('button', { name: `Row ${row}, column ${column}: empty` }).click();
  await expect(game.getByText('X wins this round.', { exact: true })).toBeVisible();
  await expect(game.getByRole('button', { name: 'Row 3, column 1: empty' })).toHaveAttribute('aria-disabled', 'true');
  await game.getByRole('button', { name: 'Undo move' }).click();
  await expect(game.getByText('X’s turn.', { exact: true })).toBeVisible();
  await expect(game.getByRole('button', { name: 'Row 1, column 3: empty' })).toHaveAttribute('aria-disabled', 'false');
  await game.getByRole('button', { name: 'New game' }).click();
  await expect(game.getByRole('button', { name: /empty$/ })).toHaveCount(9);
});

test('planet comparison changes facts and computes the age in Mars years', async ({ page }) => {
  await setup(page);
  await choose(page, 'compare');
  const comparison = panel(page, 'compare');
  await expect(comparison).toContainText('365.25');
  await expect(comparison).toContainText('687');
  await comparison.getByRole('button', { name: 'Moons', exact: true }).click();
  await expect(comparison.locator('.planet-value').first()).toContainText('1');
  await expect(comparison.locator('.planet-value').last()).toContainText('2');
  await comparison.getByLabel('Age in Earth years').fill('20');
  await expect(comparison.getByLabel('Age in Mars years')).toHaveText('10.6');
});

test('forecast shows returned data, changes day, and converts temperature', async ({ page }) => {
  await setup(page);
  await choose(page, 'weather');
  const weather = panel(page, 'weather');
  await expect(weather.getByRole('heading', { name: 'Tokyo', exact: true })).toBeVisible();
  await expect(weather.locator('.forecast-value')).toHaveText('29°C');
  await weather.getByRole('button', { name: /Today/ }).click();
  await expect(weather.locator('.forecast-value')).toHaveText('28°C');
  await weather.getByRole('button', { name: 'Switch temperature to Fahrenheit' }).click();
  await expect(weather.locator('.forecast-value')).toHaveText('82°F');
  await expect(weather).toContainText('06:15 sunrise');
});

test('reduced motion keeps the Easter egg still and orbit controls remain functional', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  await choose(page, 'play');
  const play = panel(page, 'play');
  await play.getByRole('button', { name: 'Do a barrel roll', exact: true }).click();
  await expect(play.locator('.pt-trick-stage')).toHaveAttribute('data-phase', 'done');
  await expect(play.locator('.pt-trick-stage')).toHaveAttribute('data-reduced', 'true');
  await choose(page, 'science');
  const orbit = panel(page, 'science');
  await expect(orbit.getByRole('button', { name: 'Resume orbit' })).toBeDisabled();
  const before = await orbit.getByRole('img').getAttribute('aria-label');
  await orbit.getByLabel('Central mass in Earth masses').fill('2');
  await expect(orbit.getByRole('img')).not.toHaveAttribute('aria-label', before!);
});

test('metronome creates audio only after Start and closes it when another tool opens', async ({ page }) => {
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    (window as typeof window & { testAudioContexts: AudioContext[] }).testAudioContexts = contexts;
    const NativeAudioContext = window.AudioContext;
    window.AudioContext = class extends NativeAudioContext {
      constructor(options?: AudioContextOptions) { super(options); contexts.push(this); }
    };
  });
  await setup(page);
  await choose(page, 'metronome');
  const metronome = panel(page, 'metronome');
  const audioStates = () => page.evaluate(() => (window as typeof window & { testAudioContexts: AudioContext[] }).testAudioContexts.map(context => context.state));
  expect(await audioStates()).toEqual([]);
  await metronome.getByRole('button', { name: '120 BPM', exact: true }).click();
  await expect(metronome.getByLabel('Beats per minute')).toHaveText('120');
  expect(await audioStates()).toEqual([]);
  await metronome.getByRole('button', { name: 'Start sound', exact: true }).click();
  await expect(metronome.getByRole('button', { name: 'Stop sound', exact: true })).toBeVisible();
  await expect.poll(audioStates).toEqual(['running']);
  await metronome.getByRole('button', { name: 'Stop sound', exact: true }).click();
  await expect.poll(audioStates).toEqual(['suspended']);
  await metronome.getByRole('button', { name: 'Start sound', exact: true }).click();
  await expect.poll(audioStates).toEqual(['running']);
  await choose(page, 'game');
  await expect.poll(audioStates).toEqual(['closed']);
});

test('pure arithmetic waits for Jev instead of treating multiplication as search syntax', async ({ page }) => {
  const { requests, query, app } = await setup(page, { delayed: true });
  await query.fill('24 * 18 + 6');
  await expect(app).toHaveAttribute('data-pending', 'true');
  await expect(panel(page, 'precise')).toHaveCount(0);
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].draft).toBe('24 * 18 + 6');
  await requests[0].route.fulfill({ json: fixture('calculate') });
  await expect(panel(page, 'calculate').getByLabel('Calculation result')).toHaveText('438');
  await expect(page.getByRole('button', { name: /^Jev · \d+ ms\. How it works$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Search syntax · instant. How it works' })).toHaveCount(0);
});

test('currency arithmetic never renders infinity when an amount overflows the returned rate', async ({ page }) => {
  await setup(page);
  await page.route('**/api/currency?**', route => {
    const url = new URL(route.request().url());
    return route.fulfill({ json: { base: url.searchParams.get('from'), quote: url.searchParams.get('to'), rate: 1.7, date: '2026-09-23' } });
  });
  await choose(page, 'convert', '100 USD to EUR');
  const currency = panel(page, 'convert');
  await currency.getByLabel('Source currency').selectOption('GBP');
  await currency.getByLabel('Target currency').selectOption('SGD');
  await expect(currency.getByLabel('Converted currency value')).toHaveText('170');
  await currency.getByLabel('Currency amount').fill('1e308');
  await expect(currency.getByLabel('Converted currency value')).not.toContainText(/Infinity|∞/);
  await currency.getByLabel('Currency amount').fill('1.1e308');
  await expect(currency.getByLabel('Converted currency value')).toHaveText('—');
  await expect(currency.getByText('Enter a smaller, valid amount.')).toBeVisible();
});
