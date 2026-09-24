import {expect,test,type Page} from '@playwright/test';
import {SEARCH_EXAMPLES} from '../lib/search-presets';
async function setup(page:Page){await page.route('**/api/status',r=>r.fulfill({json:{liveAvailable:false}}));await page.route('**/api/intent',r=>r.abort());await page.goto('/');await expect(page.locator('#privacy-note')).toContainText('unavailable');}
test('every slash example has a distinct title and still supports category filtering',async({page})=>{
 await setup(page);const query=page.getByRole('combobox',{name:'Search query'});await query.fill('/');
 const titles=await page.locator('.command-option strong').allTextContents();expect(titles).toHaveLength(SEARCH_EXAMPLES.length);expect(new Set(titles).size).toBe(titles.length);
 for(const [category,names] of [['calculator',['Calculator','Tip & bill split']],['convert',['Unit converter','Currency converter']],['weather',['Weather forecast','Sunrise & sunset']],['color picker',['Hex color picker','Named color picker']],['dinosaur',['Dinosaur runner','404 Easter egg']]] as const){await query.fill('/'+category);await expect(page.locator('.command-option strong')).toHaveText([...names]);}
});
test('guidance rotates, pauses, and chooses a clearly labelled example',async({page})=>{
 await page.clock.install();await setup(page);const hints=page.locator('.search-hints');await expect(hints).toContainText('27 tools');
 await expect(page.getByRole('button',{name:'Pause search tips'})).toBeVisible();await page.clock.runFor(6100);await expect(hints).toContainText('flights from Singapore to Tokyo');
 await page.getByRole('button',{name:'Pause search tips'}).click();await page.mouse.move(1,1);await page.getByRole('heading',{name:'Google Fluid'}).click();await page.clock.runFor(12000);await expect(hints).toContainText('flights from Singapore to Tokyo');
 await page.locator('.search-hint').click();await expect(page.getByRole('region',{name:'Flight planner'})).toBeVisible();await expect(page.locator('.decision-source')).toContainText('Selected by you');await expect(hints).toHaveCount(0);
});
test('reduced motion keeps guidance still and slash remains actionable',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install();await setup(page);await page.clock.runFor(15000);await expect(page.locator('.search-hints')).toContainText('27 tools');await expect(page.getByRole('button',{name:'Pause search tips'})).toHaveCount(0);await page.locator('.search-hint').click();await expect(page.getByRole('listbox',{name:'Search tools'})).toBeVisible();
});

test('guidance stays paused while keyboard focus remains after the pointer leaves',async({page})=>{
 await page.clock.install();await setup(page);
 const hint=page.locator('.search-hint');await hint.hover();await hint.focus();await page.mouse.move(1,1);
 await page.clock.runFor(13000);await expect(hint).toContainText('27 tools');
 await page.getByRole('heading',{name:'Google Fluid'}).click();await page.clock.runFor(6100);await expect(hint).toContainText('flights from Singapore to Tokyo');
});
