import { expect, test, type Page } from '@playwright/test';
import type { ModeId } from '../lib/intent';
import { SEARCH_MODES } from '../lib/search-presets';

// Exercise local controls through the actual palette. No inference can escape.
async function setup(page: Page) {
  const requests: string[] = [];
  await page.route('**/api/status', route => route.fulfill({ json: { liveAvailable: false } }));
  await page.route('**/api/intent', route => { requests.push(route.request().url()); return route.fulfill({ status: 503, json: { error: 'Mocked unavailable' } }); });
  await page.goto('/');
  await expect(page.locator('#privacy-note')).toContainText('Live routing is unavailable');
  return requests;
}
async function choose(page: Page, mode: ModeId) {
  await page.getByRole('button', { name: 'Browse all search tools', exact: true }).click();
  await page.getByRole('option').filter({ has: page.getByText(SEARCH_MODES[mode].example, { exact: true }) }).click();
  const panel = page.getByRole('region', { name: `${SEARCH_MODES[mode].label} search tools`, exact: true });
  await expect(panel).toBeVisible();
  return panel;
}

test('Enter activates utility buttons without submitting the search form', async ({ page }) => {
  const requests = await setup(page);
  const popups: Page[] = [];
  page.on('popup', popup => popups.push(popup));
  const calculator = await choose(page, 'calculate');
  await calculator.getByRole('button', { name: 'Clear calculation', exact: true }).press('Enter');
  await expect(calculator.getByLabel('Calculation', { exact: true })).toHaveValue('');
  for (const name of ['2', 'Add', '3']) await calculator.getByRole('button', { name, exact: true }).press('Enter');
  await expect(calculator.getByLabel('Calculation result')).toHaveText('5');
  await calculator.getByLabel('Calculation', { exact: true }).press('Enter');
  await expect(page.getByRole('combobox', { name: 'Search query' })).toHaveValue(SEARCH_MODES.calculate.example);
  const timer = await choose(page, 'timer');
  await page.clock.install();
  await timer.getByRole('button', { name: 'Start timer', exact: true }).press('Enter');
  await expect(timer.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.clock.runFor(1150);
  await timer.getByRole('button', { name: 'Pause', exact: true }).press('Enter');
  await expect(timer.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await timer.getByRole('button', { name: 'Reset', exact: true }).press('Enter');
  await expect(timer.getByLabel('Time remaining')).toHaveText('05:00');
  expect(popups).toHaveLength(0);
  expect(requests).toHaveLength(0);
});

test('invalid hex disables copying, explains recovery, and clears stale copy feedback', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const requests = await setup(page);
  const color = await choose(page, 'color');
  const hex = color.getByLabel('Hex color', { exact: true });
  const copy = color.getByRole('button', { name: 'Copy hex color', exact: true });
  const feedback = color.locator('p[role="status"]');
  await copy.press('Enter');
  await expect(feedback).toHaveText('Copied');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('#4285f4');
  await hex.click(); await hex.press('ControlOrMeta+A'); await hex.pressSequentially('#oops');
  await expect(hex).toHaveAttribute('aria-invalid', 'true');
  await expect(copy).toBeDisabled();
  await expect(feedback).toBeEmpty();
  const error = color.getByText('Enter a valid hex color, like #4285f4.', { exact: true });
  await expect(error).toBeVisible();
  await expect(hex).toHaveAttribute('aria-describedby', (await error.getAttribute('id'))!);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('#4285f4');
  await hex.press('ControlOrMeta+A'); await hex.pressSequentially('#fff');
  await expect(hex).toHaveAttribute('aria-invalid', 'false');
  await expect(copy).toBeEnabled();
  await expect(error).toHaveCount(0);
  await copy.press('Enter');
  await expect(feedback).toHaveText('Copied');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('#ffffff');
  await color.getByLabel('Red channel').fill('200');
  await expect(feedback).toBeEmpty();
  expect(requests).toHaveLength(0);
});

test('clock outputs stay silent while settled actions announce their result', async ({ page }) => {
  const requests = await setup(page);
  const timer = await choose(page, 'timer');
  await page.clock.install();
  const remaining = timer.getByLabel('Time remaining');
  const timerStatus = timer.locator('p[role="status"]');
  await expect(remaining).toHaveAttribute('aria-live', 'off');
  await timer.getByRole('button', { name: 'Start timer', exact: true }).click();
  await expect(timerStatus).toHaveText('Timer running.');
  await page.clock.runFor(2100);
  await expect(timerStatus).toHaveText('Timer running.');
  await timer.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(timerStatus).toHaveText(`Timer paused at ${await remaining.textContent()}.`);
  await timer.getByLabel('Timer duration in minutes').fill('0.01');
  await timer.getByRole('button', { name: 'Start timer', exact: true }).click();
  await page.clock.runFor(800);
  await expect(timerStatus).toHaveText('Time is up.');
  const stopwatch = await choose(page, 'stopwatch');
  const elapsed = stopwatch.getByLabel('Elapsed time');
  const stopwatchStatus = stopwatch.locator('p[role="status"]');
  await expect(elapsed).toHaveAttribute('aria-live', 'off');
  await stopwatch.getByRole('button', { name: 'Start stopwatch', exact: true }).click();
  await page.clock.runFor(1260);
  await expect(stopwatchStatus).toHaveText('Stopwatch running.');
  await stopwatch.getByRole('button', { name: 'Lap', exact: true }).click();
  await expect(stopwatchStatus).toHaveText(/^Lap 1 at 00:01\.\d{2}\.$/);
  const lapAnnouncement = await stopwatchStatus.textContent();
  await page.clock.runFor(1000);
  await expect(stopwatchStatus).toHaveText(lapAnnouncement!);
  await stopwatch.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(stopwatchStatus).toHaveText(`Stopwatch paused at ${await elapsed.textContent()}.`);
  await stopwatch.getByRole('button', { name: 'Reset stopwatch', exact: true }).click();
  await expect(stopwatchStatus).toHaveText('Stopwatch reset.');
  expect(requests).toHaveLength(0);
});
