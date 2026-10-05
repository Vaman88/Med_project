import { test, expect, type Page } from '@playwright/test';
async function preview(page:Page){await page.goto('/');await page.getByRole('button',{name:'Preview the planner without an account'}).click();}
async function suggestions(page:Page){await page.getByRole('button',{name:/continue/i}).click();await page.getByRole('textbox',{name:'Food budget (USD)',exact:true}).fill('20');await page.getByRole('button',{name:'Find my suggestions'}).click();await expect(page.getByRole('heading',{name:'Your meal ideas'})).toBeVisible();}

test('first visit opens account access and signup collects adult details, preferences and signed terms',async({page},testInfo)=>{
  await page.goto('/');await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('account-access.png'),fullPage:true});
  await page.getByRole('button',{name:'Sign up',exact:true}).click();await page.getByLabel('Your age',{exact:true}).fill('9');await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.locator('.access-panel').getByRole('alert')).toContainText('parent or guardian');
  await page.getByLabel('Your age',{exact:true}).fill('30');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByLabel('Full name',{exact:true}).fill('Alex Example');await page.getByLabel('City',{exact:true}).fill('Austin');await page.getByRole('combobox',{name:'State',exact:true}).selectOption('TX');await page.getByLabel('Email',{exact:true}).fill('alex@example.test');await page.getByLabel(/^Password/).fill('example-password-123');await page.getByLabel('Confirm password',{exact:true}).fill('example-password-123');await page.getByRole('button',{name:'Continue',exact:true}).click();await expect(page.getByRole('heading',{name:'A little about you'})).toBeVisible();await page.getByLabel('I agree to use my account details').check();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Food that works for you'})).toBeVisible();await page.getByLabel('I have no known food allergies').check();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your information, your choice'})).toBeVisible();await expect(page.getByText('What your information is used for',{exact:true})).toBeVisible();await page.screenshot({path:testInfo.outputPath('terms.png'),fullPage:true});
});
test('preview follows pantry then typed budget and suggestions without duplicate pantry purchases',async({page},testInfo)=>{
  await preview(page);await expect(page.getByRole('button',{name:'Home',exact:true})).toHaveAttribute('aria-current','page');
  await page.getByRole('button',{name:'Add to pantry'}).click();await page.getByRole('combobox',{name:'Food',exact:true}).selectOption('banana');await page.getByRole('button',{name:'Add to pantry'}).click();await suggestions(page);
  await expect(page.getByText('Preferences or pantry changed.',{exact:false})).toHaveCount(0);
  await expect(page.getByText('Use what you have',{exact:true})).toBeVisible();await expect(page.getByText('No need to buy again',{exact:true}).first()).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('suggestions.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('allergy menu supports keyboard selection and suggestions exclude the declared allergen',async({page})=>{
  await preview(page);await page.getByRole('button',{name:'Account',exact:true}).click();const allergy=page.getByRole('combobox',{name:'Food allergy',exact:true});await allergy.fill('pea');await allergy.press('ArrowDown');await allergy.press('Enter');await expect(page.locator('.saved-chip')).toContainText('Peanuts');await page.getByRole('button',{name:'Save food settings'}).click();await page.getByRole('button',{name:'Home',exact:true}).click();await suggestions(page);await expect(page.getByRole('heading',{name:'Banana and peanut butter bread'})).toHaveCount(0);
});
test('extra meal options have spacing and Help combines chat with support',async({page},testInfo)=>{
  await preview(page);await suggestions(page);const more=page.getByRole('button',{name:'See other compatible meals'});await expect(more).toBeVisible();const previous=await page.locator('.price-note').boundingBox();const box=await more.boundingBox();expect(box!.y-previous!.y-previous!.height).toBeGreaterThanOrEqual(25);await more.click();await expect(more).toHaveCount(0);await expect(page.getByRole('button',{name:'Hide other options'})).toHaveAttribute('aria-expanded','true');
  await page.getByRole('button',{name:'Help',exact:true}).click();await expect(page.getByRole('link',{name:'Call 211'})).toBeVisible();await page.getByRole('button',{name:'How do I add allergies?',exact:true}).click();await expect(page.getByRole('log')).toContainText('Start typing');await page.getByRole('button',{name:'Open allergy settings',exact:true}).click();await expect(page.getByRole('button',{name:'Account',exact:true})).toHaveAttribute('aria-current','page');await page.getByRole('button',{name:'Help',exact:true}).click();await expect(page.getByRole('log')).toContainText('Start typing');await page.screenshot({path:testInfo.outputPath('help.png'),fullPage:true});
});
test('browser restoration returns to Home and preview refresh clears temporary data',async({page})=>{
  await preview(page);await page.getByRole('button',{name:'Help',exact:true}).click();await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await expect(page.getByRole('button',{name:'Home',exact:true})).toHaveAttribute('aria-current','page');await expect(page.getByRole('heading',{name:'What is in your pantry?'})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();
});
test('keyboard skip link and 360-pixel layout work',async({page})=>{
  await page.setViewportSize({width:360,height:800});await page.goto('/');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();await page.getByRole('button',{name:'Preview the planner without an account'}).click();await page.getByRole('button',{name:'Account',exact:true}).click();await expect(page.getByRole('combobox',{name:'Food allergy',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
