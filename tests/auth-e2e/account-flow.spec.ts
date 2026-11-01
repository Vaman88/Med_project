import { test, expect, type Page } from '@playwright/test';
import { GUEST_STORAGE_KEY, guestProfile } from '../../src/lib/guest-kitchen';
import type { SavedKitchen } from '../../src/lib/kitchen-sync';

// Exercises the real browser SDK against protocol mocks, without creating users
// or sending email. Live database RLS needs a separate integration check.
const origin = 'http://127.0.0.1:3199';
const password = 'test-password-123';
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const users = [alice, bob].map((id, index) => ({
  id, aud: 'authenticated', role: 'authenticated', email: index ? 'bob@example.test' : 'alice@example.test',
  email_confirmed_at: '2026-11-01T12:00:00Z', app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {}, created_at: '2026-11-01T12:00:00Z', updated_at: '2026-11-01T12:00:00Z',
}));
const guest: SavedKitchen = { version: 1, profile: { ...guestProfile(), allergies: [], dietaryRestrictions: [] }, foods: [
  { id: 'guest-apple', label: 'Guest apples', unit: 'each', foodState: 'raw', storage: 'pantry' },
] };
const online: SavedKitchen = { ...guest, profile: { ...guest.profile, weeklyBudgetCents: 4200 }, foods: [
  { id: 'online-oats', label: 'Account oats', ingredientId: 'oats', quantity: 250, unit: 'g', foodState: 'dry', storage: 'pantry' },
] };

async function backend(page: Page) {
  const state = { saves: new Map<string, unknown>(), writes: [] as { user_id: string; kitchen: SavedKitchen }[], signup: null as Record<string, unknown> | null, failSave: false, failLoad: false, expired: false, signupError: false };
  const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS' };
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') return route.abort();
    return route.continue();
  });
  await page.route(`${origin}/**`, async route => {
    const req = route.request(), url = new URL(req.url());
    const json = (body: unknown, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    expect(req.headers().apikey).toBe('local-test-key');
    if (url.pathname === '/auth/v1/signup') {
      state.signup = req.postDataJSON();
      if (state.signupError) return json({ msg: 'Signup is temporarily unavailable', code: 'unexpected_failure' }, 500);
      return json({ user: { ...users[0], email_confirmed_at: undefined } });
    }
    if (url.pathname === '/auth/v1/token') {
      const body = req.postDataJSON();
      const user = users.find(item => item.email === body.email);
      if (!user || body.password !== password) return json({ msg: 'Invalid login credentials', code: 'invalid_credentials' }, 400);
      return json({ access_token: `test-access-${user.id}`, refresh_token: `test-refresh-${user.id}`, token_type: 'bearer', expires_in: 3600, user });
    }
    const owner = users.find(item => req.headers().authorization === `Bearer test-access-${item.id}`);
    if (url.pathname === '/auth/v1/user') {
      if (!owner || state.expired) return json({ msg: 'Session expired', code: 'bad_jwt' }, 401);
      return json(owner);
    }
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers });
    if (url.pathname === '/rest/v1/kitchen_saves') {
      expect(owner).toBeTruthy();
      if (req.method() === 'GET') {
        expect(url.searchParams.get('user_id')).toBe(`eq.${owner!.id}`);
        expect(url.searchParams.get('select')).toBe('kitchen');
        if (state.failLoad) return json({ message: 'simulated database outage', code: 'XX000' }, 503);
        return json(state.saves.has(owner!.id) ? [{ kitchen: state.saves.get(owner!.id) }] : []);
      }
      if (req.method() === 'POST') {
        const row = req.postDataJSON();
        expect(row.user_id).toBe(owner!.id);
        expect(url.searchParams.get('on_conflict')).toBe('user_id');
        if (state.failSave) return json({ message: 'simulated write failure', code: 'XX000' }, 503);
        state.writes.push(row); state.saves.set(row.user_id, row.kitchen);
        return json(null, 201);
      }
    }
    throw new Error(`Unexpected mocked cloud request: ${req.method()} ${url.pathname}`);
  });
  await page.addInitScript(({ key, value }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value)); }, { key: GUEST_STORAGE_KEY, value: guest });
  return state;
}
async function openAdult(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue as an adult' }).click();
  await expect(page.getByRole('region', { name: 'Save your kitchen online' })).toBeVisible();
}
async function signIn(page: Page, email = users[0].email) {
  await page.getByRole('button', { name: 'Sign in or create account' }).click();
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText(`Signed in as ${email}.`, { exact: false })).toBeVisible();
}
async function load(page: Page) {
  await page.getByRole('button', { name: 'Load saved kitchen' }).click();
  await page.getByRole('button', { name: 'Replace current kitchen' }).click();
}

test('signup reports errors and email confirmation without uploading the guest pantry', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const api = await backend(page);
  await openAdult(page);
  await page.getByRole('button', { name: 'Sign in or create account' }).click();
  await page.getByRole('button', { name: 'Create an account instead' }).click();
  await page.getByLabel('Email address', { exact: true }).fill(users[0].email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  api.signupError = true;
  await page.getByRole('button', { name: 'Create adult account' }).click();
  await expect(page.locator('.cloud-account-error')).toContainText('Signup is temporarily unavailable');
  api.signupError = false;
  await page.getByRole('button', { name: 'Create adult account' }).click();
  await expect(page.locator('.cloud-account-success')).toContainText('Check your email to confirm your account');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.locator('.pantry-list')).toContainText('Guest apples');
  expect(api.signup).toMatchObject({ email: users[0].email, password });
  expect(JSON.stringify(api.signup)).not.toContain('Guest apples');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-account-confirmation.png'), fullPage: true });
  expect(api.writes).toHaveLength(0);
});

test('sign in, explicit guest import, save and reload keep guest and account kitchens separate', async ({ page }) => {
  const api = await backend(page);
  await openAdult(page);
  await page.getByRole('button', { name: 'Sign in or create account' }).click();
  await page.getByLabel('Email address', { exact: true }).fill(users[0].email);
  await page.getByLabel('Password', { exact: true }).fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.cloud-account-error')).toContainText('Invalid login credentials');
  await expect(page.locator('.pantry-list')).toContainText('Guest apples');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save online', exact: true })).toBeVisible();
  await expect(page.locator('.pantry-list')).toHaveCount(0);
  expect(api.writes).toHaveLength(0);
  await page.getByRole('button', { name: 'Copy guest pantry from this device' }).click();
  await page.getByRole('button', { name: 'Replace current kitchen' }).click();
  await expect(page.locator('.pantry-list')).toContainText('Guest apples');
  await page.getByLabel('Weekly grocery budget (USD)', { exact: true }).fill('67');
  await page.getByLabel('Weekly grocery budget (USD)', { exact: true }).blur();
  await page.getByRole('button', { name: 'Save online', exact: true }).click();
  await expect(page.locator('.cloud-account-success')).toContainText('Kitchen saved online');
  expect(api.writes).toHaveLength(1);
  expect(api.writes[0]).toMatchObject({ user_id: alice, kitchen: { profile: { weeklyBudgetCents: 6700 }, foods: guest.foods } });
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), GUEST_STORAGE_KEY)).toEqual(guest);
  await page.reload();
  await page.getByRole('button', { name: 'Continue as an adult' }).click();
  await expect(page.getByRole('button', { name: 'Save online', exact: true })).toBeVisible();
  await expect(page.locator('.pantry-list')).toHaveCount(0);
  await load(page);
  await expect(page.locator('.cloud-account-success')).toContainText('Your saved kitchen is loaded');
  await expect(page.getByLabel('Weekly grocery budget (USD)', { exact: true })).toHaveValue('67');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in or create account' })).toBeVisible();
  await expect(page.locator('.pantry-list')).toContainText('Guest apples');
  await expect(page.getByLabel('Weekly grocery budget (USD)', { exact: true })).toHaveValue('25');
});

test('switching accounts clears the previous pantry and loads only the new owner save', async ({ page }) => {
  const api = await backend(page);
  api.saves.set(alice, online);
  await openAdult(page); await signIn(page); await load(page);
  await expect(page.locator('.pantry-list')).toContainText('Account oats');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.locator('.pantry-list')).toContainText('Guest apples');
  await expect(page.locator('.pantry-list')).not.toContainText('Account oats');
  await signIn(page, users[1].email);
  await expect(page.locator('.pantry-list')).toHaveCount(0);
  await load(page);
  await expect(page.locator('.cloud-account-success')).toContainText('No kitchen has been saved to this account yet');
  await expect(page.locator('.pantry-list')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save online', exact: true }).click();
  await expect(page.locator('.cloud-account-success')).toContainText('Kitchen saved online');
  expect(api.writes[0]).toMatchObject({ user_id: bob, kitchen: { foods: [] } });
  expect(api.saves.get(alice)).toEqual(online);
});

test('load cancellation, invalid saves, outages and expired sessions never claim success or replace current foods', async ({ page }) => {
  test.setTimeout(60000);
  const api = await backend(page);
  api.saves.set(alice, online);
  await openAdult(page); await signIn(page); await load(page);
  await expect(page.locator('.pantry-list')).toContainText('Account oats');
  await page.getByRole('button', { name: 'Load saved kitchen' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('.pantry-list')).toContainText('Account oats');
  api.saves.set(alice, { version: 99, foods: [] });
  await load(page);
  await expect(page.locator('.cloud-account-error')).toContainText('This saved kitchen could not be read');
  await expect(page.locator('.pantry-list')).toContainText('Account oats');
  api.failLoad = true;
  await load(page);
  await expect(page.locator('.cloud-account-error')).toContainText('could not be loaded', { timeout: 20000 });
  await expect(page.locator('.pantry-list')).toContainText('Account oats');
  api.failSave = true;
  await page.getByRole('button', { name: 'Save online', exact: true }).click();
  await expect(page.locator('.cloud-account-error')).toContainText('could not be saved online', { timeout: 20000 });
  await expect(page.getByText('Kitchen saved online.', { exact: true })).toHaveCount(0);
  expect(api.writes).toHaveLength(0);
  api.expired = true;
  await page.getByRole('button', { name: 'Save online', exact: true }).click();
  // The SDK may emit SIGNED_OUT for a rejected user token; either outcome must
  // discard account data or report the failed session, never save as a guest.
  await expect(page.locator('.cloud-account-error').or(page.getByRole('button', { name: 'Sign in or create account' }))).toBeVisible();
  expect(api.writes).toHaveLength(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), GUEST_STORAGE_KEY)).toEqual(guest);
});
