import { expect, test, type Page } from '@playwright/test';

test.use({ screenshot: 'off' });

async function setup(page: Page) {
  const inferenceRequests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/status', route => route.fulfill({ json: { liveAvailable: false } }));
  await page.route('**/api/intent', route => { inferenceRequests.push(route.request().url()); return route.fulfill({ status: 503, json: { error: 'Fixture unavailable' } }); });
  await page.route('**/api/weather?**', route => route.fulfill({ status: 503, json: { error: 'Fixture unavailable' } }));
  await page.route('**/api/currency?**', route => route.fulfill({ status: 503, json: { error: 'Fixture unavailable' } }));
  await page.goto('/');
  await expect(page.locator('#privacy-note')).toContainText('Automatic tool selection is unavailable');
  return { query: page.getByRole('combobox', { name: 'Search query' }), inferenceRequests, errors };
}

async function choose(page: Page, example: string) {
  await page.getByRole('button', { name: 'Browse all search tools', exact: true }).click();
  await page.getByRole('option').filter({ has: page.getByText(example, { exact: true }) }).click();
}

test('reference choices update the query and remain usable without live routing', async ({ page }) => {
  const { query, inferenceRequests, errors } = await setup(page);
  await choose(page, 'what does serendipity mean');
  await page.getByLabel('Dictionary word').selectOption('ephemeral');
  await expect(query).toHaveValue('define:ephemeral');
  await expect(page.locator('.knowledge-dictionary h2')).toHaveText('ephemeral');
  await query.fill('define:unknown');
  await page.getByRole('button', { name: 'serendipity', exact: true }).click();
  await expect(query).toHaveValue('define:serendipity');
  await expect(page.locator('.knowledge-dictionary h2')).toHaveText('serendipity');

  await choose(page, 'Dune Part Two');
  await page.locator('.knowledge-source summary').click();
  await page.getByRole('button', { name: 'Try Interstellar', exact: true }).click();
  await expect(query).toHaveValue('movie:Interstellar');
  await expect(page.locator('.movie-content h2')).toHaveText('Interstellar');
  await expect(page.getByRole('button', { name: 'Selected by you. Notes', exact: true })).toBeVisible();
  expect(inferenceRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('date refinements explain impossible ranges and block search until repaired', async ({ page }) => {
  const { query, inferenceRequests, errors } = await setup(page);
  let popups = 0;
  page.on('popup', popup => { popups++; void popup.close(); });
  await choose(page, 'solar energy after:2024-01-01 before:2025-01-01');
  const after = page.getByLabel('Search after date');
  const before = page.getByLabel('Search before date');
  const search = page.getByRole('button', { name: 'Search Google', exact: true });
  await after.fill('2026-01-01');
  await expect(after).toHaveAttribute('aria-invalid', 'true');
  await expect(before).toHaveAttribute('aria-invalid', 'true');
  const feedback = page.locator('.date-tool .field-error');
  await expect(feedback).toHaveText('Choose an After date earlier than the Before date.');
  await expect(page.getByText('Choose an After date earlier than the Before date.', {exact:true})).toHaveCount(1);
  await expect(query).toHaveAttribute('aria-describedby', 'privacy-note date-range-feedback');
  await expect(after).toHaveAttribute('aria-describedby', (await feedback.getAttribute('id'))!);
  await expect(search).toBeDisabled();
  await query.press('Enter');
  expect(popups).toBe(0);
  await before.fill('2027-01-01');
  await expect(search).toBeEnabled();
  await expect(feedback).toHaveCount(0);
  await before.fill('2026-01-01');
  await expect(search).toBeDisabled();
  await after.fill('');
  await expect(search).toBeEnabled();
  await expect(query).toHaveValue('solar energy before:2026-01-01');
  expect(inferenceRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('timer Reset restores the last valid duration after an invalid edit', async ({ page }) => {
  const { inferenceRequests, errors } = await setup(page);
  await choose(page, 'set a timer for 5 minutes');
  const duration = page.getByLabel('Timer duration in minutes');
  const start = page.getByRole('button', { name: 'Start timer', exact: true });
  const reset = page.getByRole('button', { name: 'Reset', exact: true });
  await duration.fill('10');
  for (const invalid of ['', '0', '1441']) {
    await duration.fill(invalid);
    await expect(duration).toHaveAttribute('aria-invalid', 'true');
    await expect(start).toBeDisabled();
    const feedback = page.locator('.timer-widget .utility-feedback');
    await expect(feedback).toContainText('Reset to the last valid duration');
    await expect(duration).toHaveAttribute('aria-describedby', (await feedback.getAttribute('id'))!);
    await reset.press('Enter');
    await expect(duration).toHaveValue('10');
    await expect(duration).toHaveAttribute('aria-invalid', 'false');
    await expect(page.getByLabel('Time remaining')).toHaveText('10:00');
    await expect(start).toBeEnabled();
  }
  await start.press('Enter');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  expect(inferenceRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('unit conversion handles large finite values and recovers from overflow', async ({ page }) => {
  const { inferenceRequests, errors } = await setup(page);
  await choose(page, '10 km in miles');
  const amount = page.getByLabel('Amount', { exact: true });
  const result = page.getByLabel('Converted value', { exact: true });
  await amount.fill('1e308');
  await expect(result).not.toHaveText(/Infinity|∞|—/);
  await page.getByLabel('Convert to').selectOption('cm');
  await expect(result).toHaveText('—');
  await expect(page.locator('.converter .field-error')).toHaveText('Enter a valid value.');
  await page.getByRole('button', { name: 'Swap units', exact: true }).click();
  await expect(amount).toHaveValue('1e308');
  await expect(result).not.toHaveText(/Infinity|∞|—/);
  await amount.fill('100000');
  await expect(result).toHaveText('1');
  expect(inferenceRequests).toEqual([]);
  expect(errors).toEqual([]);
});
