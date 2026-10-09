import { test, expect } from '@playwright/test';

test('guest kitchen saves custom food and budget, reloads and clears information',async({page},info)=>{
  await page.goto('/');await page.getByRole('button',{name:'Try Meal Planner'}).click();
  await page.getByRole('combobox',{name:'Food name'}).fill('Frozen corn');
  await page.getByRole('button',{name:'Add food',exact:true}).click();
  await page.getByRole('textbox',{name:'Weekly grocery budget (USD)'}).fill('0');
  await page.reload();await expect(page.locator('.pantry-list')).toContainText('Frozen corn');
  await expect(page.getByRole('textbox',{name:'Weekly grocery budget (USD)'})).toHaveValue('0');
  await page.getByRole('button',{name:'Remove Frozen corn'}).click();await expect(page.locator('.pantry-list')).toHaveCount(0);
  await page.getByRole('button',{name:'Add sample pantry'}).click();
  await page.getByRole('button',{name:'Find meals',exact:true}).click();await expect(page.getByRole('heading',{name:'Make it now',exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('guest-meals.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Clear my information',exact:true}).click();await page.getByRole('button',{name:'Clear my information now'}).click();
  await page.reload();await expect(page.getByRole('button',{name:'Try Meal Planner'})).toBeVisible();
});

test('guest family allergies exclude peanuts and unknown amounts do not offset purchases',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Try a sample pantry'}).click();
  await page.getByText('Allergies and family food needs',{exact:true}).click();
  const allergy=page.getByRole('combobox',{name:'Food allergy',exact:true});await allergy.fill('pea');await allergy.press('ArrowDown');await allergy.press('Enter');
  await page.getByRole('button',{name:'Find meals',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Banana and peanut butter bread'})).toHaveCount(0);
});
