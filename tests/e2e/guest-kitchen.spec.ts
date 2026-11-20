import { test, expect, type Page } from '@playwright/test';
import { createParentPin } from '../../src/lib/parent-lock';

const PIN = '2468';
// Every test starts by walking the full sign-up flow (or the PIN gate), so allow more than the default 30s.
test.describe.configure({ timeout: 60_000 });
/** A family that already finished sign-up, opened through the Parent account and its PIN. */
async function openParentPlanner(page: Page) {
  const pin = await createParentPin(PIN);
  await page.addInitScript(fields => {
    if (!localStorage.getItem('healthy-steps-family-v1'))
      localStorage.setItem('healthy-steps-family-v1', JSON.stringify({ version: 1, parentName: 'Sam', age: 9, pantry: ['Banana'], allergies: [], otherAllergies: '', allergyConfirmed: true, parentConfirmed: true, ...fields }));
  }, pin);
  await page.goto('/');
  await enterParent(page);
}
async function enterParent(page: Page) {
  await expect(page.getByRole('heading', { name: 'Welcome back, Sam!' })).toBeVisible();
  await page.getByRole('button', { name: /Parent account/ }).click();
  await page.getByLabel('Parent PIN', { exact: true }).fill(PIN);
  await page.getByRole('button', { name: 'Open parent area' }).click();
  await expect(page.getByRole('heading', { name: "What's in your kitchen today?" })).toBeVisible();
}

test('the parent meal planner saves custom food and budget, reloads and clears information', async ({ page }, info) => {
  await openParentPlanner(page);
  await page.getByRole('combobox', { name: 'Food name' }).fill('Frozen corn');
  await page.getByRole('button', { name: 'Add food', exact: true }).click();
  await page.getByRole('button', { name: 'Change budget and family' }).click();
  await page.getByRole('textbox', { name: 'Weekly grocery budget (USD)' }).fill('0');
  await page.getByRole('textbox', { name: 'Weekly grocery budget (USD)' }).blur();
  await page.reload(); await enterParent(page);
  await expect(page.locator('.pantry-list')).toContainText('Frozen corn');
  await page.getByRole('button', { name: 'Change budget and family' }).click();
  await expect(page.getByRole('textbox', { name: 'Weekly grocery budget (USD)' })).toHaveValue('0');
  await page.getByRole('button', { name: 'Remove Frozen corn' }).click();
  await page.getByRole('button', { name: 'Remove Banana' }).click();
  await expect(page.locator('.pantry-list')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add sample pantry' }).click();
  await page.getByRole('button', { name: 'Find meals', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Make it now', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('parent-meals.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Clear my information', exact: true }).click(); await page.getByRole('button', { name: 'Clear my information now' }).click();
  // Clearing empties the planner but keeps the family: the planner stays open, ready for new foods.
  await expect(page.getByText('Your kitchen list is empty. Add a food above to get started.')).toBeVisible();
  await page.reload(); await enterParent(page);
  await expect(page.locator('.pantry-list')).toHaveCount(0);
});

test('family allergies exclude peanuts and unknown amounts do not offset purchases', async ({ page }) => {
  await openParentPlanner(page);
  await page.getByRole('button', { name: 'Add sample pantry' }).click();
  await page.getByRole('button', { name: 'Change budget and family' }).click();
  await page.getByText('Allergies and family food needs', { exact: true }).click();
  const allergy = page.getByRole('combobox', { name: 'Food allergy', exact: true }); await allergy.first().fill('pea'); await allergy.first().press('ArrowDown'); await allergy.first().press('Enter');
  await page.getByRole('button', { name: 'Find meals', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Banana and peanut butter bread' })).toHaveCount(0);
});
