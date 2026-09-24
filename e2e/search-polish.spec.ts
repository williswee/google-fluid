import { expect, test, type Page } from '@playwright/test';

async function setup(page: Page) {
  await page.route('**/api/status', route => route.fulfill({ json: { liveAvailable: false } }));
  await page.route('**/api/intent', route => route.abort());
  await page.goto('/');
  await expect(page.locator('#privacy-note')).toContainText('Automatic tool selection is unavailable');
}

test('slash keyboard navigation scrolls only the list in a short mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await setup(page);
  await page.getByRole('button', { name: 'Browse all search tools' }).click();
  const query = page.getByRole('combobox', { name: 'Search query' });
  const before = await query.boundingBox();
  for (let i = 0; i < 25; i++) await query.press('ArrowDown');
  await expect(query).toBeFocused();
  expect(await query.boundingBox()).toEqual(before);
  const list = page.getByRole('listbox', { name: 'Search tools' });
  expect(await list.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  const bounds = await list.boundingBox();
  const selected = await page.getByRole('option', { selected: true }).boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(549);
  expect(selected!.y).toBeGreaterThanOrEqual(bounds!.y - 1);
  expect(selected!.y + selected!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height + 1);
  await query.press('Escape');
  await expect(query).toHaveValue('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Notes restores source-button focus and exposes consistent disclosure state', async ({ page }) => {
  await setup(page);
  const query = page.getByRole('combobox', { name: 'Search query' });
  await query.fill('/timer');
  await page.getByRole('option').first().click();
  const source = page.getByRole('button', { name: 'Selected by you. Notes', exact: true });
  await source.click();
  await expect(source).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(source).toBeFocused();
  await expect(source).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('region', { name: 'Fluid Search notes' })).toHaveCount(0);
  const footer = page.getByRole('button', { name: 'Notes', exact: true });
  await footer.click();
  await expect(page.getByRole('heading', { name: 'Credits', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close notes' }).click();
  await expect(footer).toBeFocused();
});
