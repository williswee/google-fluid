import { expect, test, type Page, type Locator } from '@playwright/test';
import { SEARCH_MODES } from '../lib/search-presets';
import type { ModeId } from '../lib/intent';

// Exercise local interactions only. Jev and all remote media/map requests are intercepted.
let inferenceRequests: string[];
let mapRequests: string[];
const imagePixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1cAAAAASUVORK5CYII=', 'base64');
test.beforeEach(async ({ page }) => {
  inferenceRequests = []; mapRequests = [];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/status') return route.fulfill({ json: { liveAvailable: false } });
    if (url.pathname === '/api/intent') { inferenceRequests.push(route.request().postData() ?? ''); return route.abort(); }
    if (url.hostname.endsWith('nasa.gov')) return route.fulfill({ contentType: 'image/png', body: imagePixel });
    if (url.hostname === 'www.openstreetmap.org') {
      mapRequests.push(url.toString());
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><p>Local map fixture</p></body></html>' });
    }
    if (url.origin === 'http://127.0.0.1:3000') return route.continue();
    return route.abort();
  });
  await page.goto('/');
  await expect(page.locator('#privacy-note')).toContainText('Live routing is unavailable');
});
test.afterEach(() => expect(inferenceRequests).toEqual([]));

async function choose(page: Page, mode: ModeId, query = SEARCH_MODES[mode].example) {
  await page.getByRole('button', { name: 'Browse all search tools', exact: true }).click();
  await page.getByRole('option').filter({ has: page.getByText(query, { exact: true }) }).click();
  await expect(page.locator('.fluid-app')).toHaveAttribute('data-mode', mode);
}
async function outbound(link: Locator) {
  await expect(link).toHaveAttribute('href', /^https:\/\/www\.google\.com\//);
  return new URL((await link.getAttribute('href'))!);
}

test('flight itinerary swaps cities and carries every edited selection into a valid search', async ({ page }) => {
  await choose(page, 'flights');
  const tool = page.getByRole('region', { name: 'Flight planner', exact: true });
  await expect(tool.getByLabel('Flight origin')).toHaveValue('Singapore');
  await expect(tool.getByLabel('Flight destination')).toHaveValue('Tokyo');
  await tool.getByRole('button', { name: 'Swap origin and destination' }).click();
  await expect(tool.getByLabel('Flight origin')).toHaveValue('Tokyo');
  await expect(tool.getByLabel('Flight destination')).toHaveValue('Singapore');
  await tool.getByLabel('Departure date').fill('2027-03-10');
  await tool.getByLabel('Return date').fill('2027-03-18');
  await tool.getByLabel('Passengers', { exact: true }).fill('3');
  await tool.getByLabel('Cabin', { exact: true }).selectOption('Business');
  let url = await outbound(tool.getByRole('link', { name: /^Find flights/ }));
  for (const selection of ['from Tokyo to Singapore', 'round-trip', 'departing 2027-03-10', 'returning 2027-03-18', '3 passengers', 'business class']) expect(url.searchParams.get('q')).toContain(selection);
  await tool.getByRole('button', { name: 'One way', exact: true }).click();
  await expect(tool.getByLabel('Return date')).toBeDisabled();
  url = await outbound(tool.getByRole('link', { name: /^Find flights/ }));
  expect(url.searchParams.get('q')).toContain('one-way');
  expect(url.searchParams.get('q')).not.toContain('2027-03-18');
  await tool.getByRole('button', { name: 'Round trip', exact: true }).click();
  await tool.getByLabel('Return date').fill('2027-03-09');
  await expect(tool.getByText('Return must be on or after departure.')).toBeVisible();
  await expect(tool.getByRole('button', { name: 'Find flights', exact: true })).toBeDisabled();
  await expect(tool.getByLabel('Return date')).toHaveAttribute('aria-invalid', 'true');
  await tool.getByRole('button', { name: 'Flexible dates', exact: true }).click();
  await expect(tool.getByLabel('Departure date')).toBeEmpty();
  await expect(tool.getByLabel('Return date')).toBeEmpty();
  url = await outbound(tool.getByRole('link', { name: /^Find flights/ }));
  expect(url.searchParams.get('q')).toContain('flexible departure dates');
  await expect(page.getByRole('combobox', { name: 'Search query' })).toHaveValue(SEARCH_MODES.flights.example);
});

test('hotel nights and amenities edit the stay, while invalid dates cannot leave the app', async ({ page }) => {
  await choose(page, 'hotels');
  const tool = page.getByRole('region', { name: 'Hotel planner', exact: true });
  await expect(tool.getByLabel('Hotel destination')).toHaveValue('Tokyo');
  await expect(tool.getByLabel('Nights', { exact: true })).toBeDisabled();
  await tool.getByLabel('Check-in date').fill('2027-04-10');
  await tool.getByLabel('Check-out date').fill('2027-04-14');
  await expect(tool.getByLabel('Nights', { exact: true })).toHaveValue('4');
  await tool.getByLabel('Nights', { exact: true }).selectOption('7');
  await expect(tool.getByLabel('Check-out date')).toHaveValue('2027-04-17');
  await tool.getByLabel('Hotel guests').fill('4');
  await tool.getByLabel('Hotel rooms').fill('2');
  await tool.getByLabel('Hotel class').selectOption('4');
  await tool.getByRole('button', { name: 'Pool', exact: true }).click();
  await tool.getByRole('button', { name: 'Breakfast included', exact: true }).click();
  await expect(tool.getByRole('button', { name: 'Pool', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const url = await outbound(tool.getByRole('link', { name: /^Find hotels/ }));
  for (const selection of ['hotels in Tokyo', 'check-in 2027-04-10', 'check-out 2027-04-17', '7 nights', '4 guests', '2 rooms', '4-star', 'pool', 'breakfast included']) expect(url.searchParams.get('q')).toContain(selection);
  await tool.getByLabel('Check-out date').fill('2027-04-09');
  await expect(tool.getByText('Check-out must be after check-in.')).toBeVisible();
  await expect(tool.getByRole('button', { name: 'Find hotels', exact: true })).toBeDisabled();
  await tool.getByRole('button', { name: 'Clear dates', exact: true }).click();
  await expect(tool.getByLabel('Nights', { exact: true })).toBeDisabled();
  expect((await outbound(tool.getByRole('link', { name: /^Find hotels/ }))).searchParams.get('q')).toContain('flexible dates');
});

test('shopping budgets validate, while condition, category, currency and sort reach the search', async ({ page }) => {
  await choose(page, 'shopping');
  const tool = page.getByRole('region', { name: 'Shopping planner', exact: true });
  await expect(tool.getByLabel('Product', { exact: true })).toHaveValue('noise cancelling headphones');
  await expect(tool.getByLabel('Maximum price')).toHaveValue('200');
  await tool.getByLabel('Minimum price').fill('250');
  await expect(tool.getByText('Maximum price must be at least the minimum.')).toBeVisible();
  await expect(tool.getByRole('button', { name: 'Explore shopping', exact: true })).toBeDisabled();
  await tool.getByLabel('Minimum price').fill('75');
  await tool.getByLabel('Product', { exact: true }).fill('compact camera & case');
  await tool.getByLabel('Budget currency').selectOption('SGD');
  await tool.getByRole('button', { name: 'Used', exact: true }).click();
  await tool.getByLabel('Shopping category').selectOption('Electronics');
  await tool.getByLabel('Shopping sort').selectOption('Best rated');
  const url = await outbound(tool.getByRole('link', { name: /^Explore shopping/ }));
  expect(url.searchParams.get('tbm')).toBe('shop');
  for (const selection of ['compact camera & case', 'electronics', 'used condition', 'SGD 75 to 200', 'sort by best rated']) expect(url.searchParams.get('q')).toContain(selection);
  await tool.getByText('Search details', { exact: true }).click();
  await expect(tool.getByText('Your choices become a Google search. Confirm the dates and filters there.')).toBeVisible();
  await tool.getByLabel('Product', { exact: true }).fill('');
  await expect(tool.getByRole('button', { name: 'Explore shopping', exact: true })).toBeDisabled();
});

test('compound growth is a working calculator, including zero interest and invalid inputs', async ({ page }) => {
  await choose(page, 'finance', 'compound interest on $1000 over 10 years');
  await page.getByLabel('Annual rate (%)', { exact: true }).fill('0');
  await expect(page.getByLabel('Illustrative future balance')).toHaveText('$13,000');
  await page.getByLabel('Initial amount', { exact: true }).fill('2000');
  await page.getByLabel('Monthly deposit', { exact: true }).fill('50');
  await page.getByLabel('Years', { exact: true }).fill('2');
  await expect(page.getByLabel('Illustrative future balance')).toHaveText('$3,200');
  await page.getByLabel('Monthly deposit', { exact: true }).fill('0');
  await page.getByLabel('Annual rate (%)', { exact: true }).fill('12');
  await expect(page.getByLabel('Illustrative future balance')).toHaveText('$2,539');
  await expect(page.getByRole('img', { name: /Illustrative balance/ })).toHaveAttribute('aria-label', /compared with \$2,000 contributed/);
  await page.getByLabel('Years', { exact: true }).fill('0');
  await expect(page.getByLabel('Illustrative future balance')).toHaveText('—');
  await expect(page.getByText('Use nonnegative amounts, a rate from −50% to 50%, and 1–50 whole years.')).toBeVisible();
});

test('news controls generate current coverage links instead of fabricated stories', async ({ page }) => {
  await choose(page, 'news');
  await page.getByLabel('News topic').fill('lunar missions');
  await page.getByRole('button', { name: 'Latest coverage', exact: true }).click();
  await page.getByLabel('News recency').selectOption('Past day');
  await page.getByLabel('News source').selectOption('BBC');
  await page.getByLabel('News region').selectOption('Singapore');
  let url = await outbound(page.getByRole('link', { name: /^Read current coverage/ }));
  expect(url.searchParams.get('q')).toBe('lunar missions site:bbc.com Singapore');
  expect(url.searchParams.get('tbm')).toBe('nws');
  expect(url.searchParams.get('tbs')).toBe('qdr:d,sbd:1');
  await page.getByRole('button', { name: 'Explainers', exact: true }).click();
  url = await outbound(page.getByRole('link', { name: /^Read current coverage/ }));
  expect(url.searchParams.get('q')).toContain('explained');
  expect(url.searchParams.get('tbs')).toBe('qdr:d');
  await page.getByLabel('News topic').fill('');
  await expect(page.locator('.news-desk .market-cta')).not.toHaveAttribute('href');
});

test('video duration, source and posting date control the outgoing video search', async ({ page }) => {
  await choose(page, 'video');
  const tool = page.getByRole('region', { name: 'Video search tools', exact: true });
  await tool.getByRole('button', { name: 'Short Under 4 min', exact: true }).click();
  await tool.getByRole('combobox', { name: 'Source', exact: true }).selectOption('youtube');
  await tool.getByRole('combobox', { name: 'Posted', exact: true }).selectOption('week');
  await expect(tool.getByRole('button', { name: 'Short Under 4 min', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const url = await outbound(tool.getByRole('link', { name: /^Search Google Videos/ }));
  expect(url.searchParams.get('q')).toBe(SEARCH_MODES.video.example);
  expect(url.searchParams.get('tbm')).toBe('vid');
  expect(url.searchParams.get('dur')).toBe('s');
  expect(url.searchParams.get('tbs')).toBe('dur:s');
  expect(url.searchParams.get('as_sitesearch')).toBe('youtube.com');
  expect(url.searchParams.get('as_qdr')).toBe('w');
});

test('image controls transform the credited preview and encode real search filters', async ({ page }) => {
  await choose(page, 'images');
  const tool = page.getByRole('region', { name: 'Image search tools', exact: true });
  const photo = tool.getByRole('img', { name: /Earth against black space/ });
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await tool.getByRole('combobox', { name: 'Image shape', exact: true }).selectOption('tall');
  await tool.getByRole('combobox', { name: 'Color', exact: true }).selectOption('gray');
  await tool.getByRole('combobox', { name: 'Preview layout', exact: true }).selectOption('cover');
  await expect(tool.locator('.dt-photo-frame')).toHaveAttribute('data-aspect', 'tall');
  await expect(tool.locator('.dt-photo-frame')).toHaveAttribute('data-tone', 'gray');
  await expect(photo).toHaveCSS('object-fit', 'cover');
  const url = await outbound(tool.getByRole('link', { name: /^Search Google Images/ }));
  expect(url.searchParams.get('q')).toBe(SEARCH_MODES.images.example);
  expect(url.searchParams.get('tbm')).toBe('isch');
  expect(url.searchParams.get('imgar')).toBe('t|xt');
  expect(url.searchParams.get('imgc')).toBe('gray');
  await tool.getByText('About this image', { exact: true }).click();
  await expect(tool.getByRole('link', { name: /^View the NASA source/ })).toHaveAttribute('href', 'https://science.nasa.gov/resource/the-blue-marble/');
  await tool.getByRole('button', { name: 'Moon', exact: true }).click();
  await expect(tool.getByRole('img', { name: /A detailed full-Moon/ })).toBeVisible();
  await expect(tool.getByRole('link', { name: /^View the NASA source/ })).toHaveAttribute('href', 'https://svs.gsfc.nasa.gov/5001/');
  await expect(tool.getByText('Previews are curated, not live search results.')).toBeVisible();
});

test('map requires an explicit load, closes cleanly, and preserves a custom destination', async ({ page }) => {
  await choose(page, 'places');
  const tool = page.getByRole('region', { name: 'Places search tools', exact: true });
  await expect(tool.locator('iframe')).toHaveCount(0);
  expect(mapRequests).toHaveLength(0);
  await tool.getByRole('button', { name: 'Tokyo', exact: true }).click();
  await tool.getByLabel('Map zoom').selectOption('neighborhood');
  await expect(tool.locator('iframe')).toHaveCount(0);
  expect(mapRequests).toHaveLength(0);
  await tool.getByRole('button', { name: 'Load map', exact: true }).click();
  await expect(tool.getByTitle('Tokyo interactive OpenStreetMap')).toBeVisible();
  await expect.poll(() => mapRequests.length).toBe(1);
  const mapUrl = new URL(mapRequests[0]);
  expect(mapUrl.pathname).toBe('/export/embed.html');
  expect(mapUrl.searchParams.get('bbox')).toBe('139.745,35.670625,139.775,35.689375');
  await tool.getByRole('button', { name: 'Close map', exact: true }).click();
  await expect(tool.locator('iframe')).toHaveCount(0);
  await expect(tool.getByRole('button', { name: 'Load map', exact: true })).toBeFocused();
  await tool.getByLabel('Your destination or search').fill('Botanical gardens in Lisbon');
  await tool.getByLabel('Place type').selectOption('parks');
  const url = await outbound(tool.getByRole('link', { name: /^Search Google Maps/ }));
  expect(url.pathname).toBe('/maps/search/');
  expect(url.searchParams.get('api')).toBe('1');
  expect(url.searchParams.get('query')).toBe('Botanical gardens in Lisbon parks');
  expect(mapRequests).toHaveLength(1);
});
