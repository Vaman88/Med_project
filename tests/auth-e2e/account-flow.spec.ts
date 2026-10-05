import { test, expect } from '@playwright/test';
import { recommendBasket } from '../../src/lib/recommendations';
import type { AccountState } from '../../src/lib/account';

// This exercises the actual Supabase browser SDK and account UI against browser
// protocol mocks. It does not substitute for a real Supabase/RLS isolation test.
test('email confirmation resumes food setup and saves the adult planner', async ({ page }) => {
  const details = { name: 'Alex Example', city: 'Austin', state: 'TX', age: 30 };
  const email = 'alex@example.test';
  const password = 'example-password-123';
  const user = {
    id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
    email, email_confirmed_at: '2026-10-05T12:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { account_details: details },
    created_at: '2026-10-05T12:00:00Z', updated_at: '2026-10-05T12:00:00Z',
  };
  let account: AccountState | null = null;
  let signupBody: Record<string, unknown> | null = null;
  let recommendationBody: Record<string, unknown> | null = null;
  const json = (value: unknown) => ({
    status: 200, contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
      'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    }, body: JSON.stringify(value),
  });

  await page.route('http://127.0.0.1:3199/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: json(null).headers });
    if (path === '/auth/v1/signup') {
      signupBody = request.postDataJSON();
      return route.fulfill(json({ user })); // Email confirmation is required: no session yet.
    }
    if (path === '/auth/v1/token') {
      const credentials = request.postDataJSON();
      if (credentials.email !== email || credentials.password !== password) return route.fulfill({ ...json({ msg: 'Invalid login credentials' }), status: 400 });
      return route.fulfill(json({ access_token: 'local-test-access-token', refresh_token: 'local-test-refresh-token', token_type: 'bearer', expires_in: 3600, user }));
    }
    if (path === '/auth/v1/user') return route.fulfill(json({ user }));
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204, headers: json(null).headers });
    throw new Error(`Unexpected auth request: ${request.method()} ${request.url()}`);
  });
  await page.route('**/api/account', async route => {
    const request = route.request();
    expect(request.headers().authorization).toBe('Bearer local-test-access-token');
    if (request.method() === 'GET') return route.fulfill(json({ account }));
    if (request.method() === 'POST') {
      const setup = request.postDataJSON();
      expect(setup.agreed).toBe(true);
      expect(setup.signature).toBe(details.name);
      account = { details: setup.details, profile: setup.profile, pantry: [], termsVersion: setup.termsVersion, acceptedAt: '2026-10-05T12:00:00Z' };
      return route.fulfill({ ...json({ account }), status: 201 });
    }
    if (request.method() === 'PATCH') {
      const changes = request.postDataJSON();
      if (!account) throw new Error('Account must exist before saving pantry');
      account = { ...account, profile: changes.profile, pantry: changes.pantry };
      return route.fulfill(json({ saved: true }));
    }
    throw new Error(`Unexpected account request: ${request.method()}`);
  });
  await page.route('**/api/recommendations', async route => {
    recommendationBody = route.request().postDataJSON();
    if (!account) throw new Error('Account must exist before recommendations');
    const body = recommendationBody as { pantry: AccountState['pantry']; budgetCents: number; feesCents: number };
    const suggestions = recommendBasket({ ...account.profile, weeklyBudgetCents: body.budgetCents, knownFeesCents: body.feesCents }, body.pantry);
    return route.fulfill(json(suggestions));
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await page.getByLabel('Your age', { exact: true }).fill('30');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Full name', { exact: true }).fill(details.name);
  await page.getByLabel('City', { exact: true }).fill(details.city);
  await page.getByRole('combobox', { name: 'State', exact: true }).selectOption(details.state);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByLabel('I agree to use my account details').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Check your email to confirm your account.', { exact: false })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Food allergy' })).toHaveCount(0);
  expect(signupBody).toMatchObject({ email, data: { account_details: details } });
  expect(JSON.stringify(signupBody)).not.toContain('allergies');

  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Food that works for you' })).toBeVisible();
  const allergy = page.getByRole('combobox', { name: 'Food allergy' });
  await allergy.fill('pea');
  await page.getByRole('option', { name: 'Peanuts' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('I have read and accept the terms').check();
  await page.getByLabel('Type your full name to sign').fill(details.name);
  await page.getByRole('button', { name: 'Finish setup' }).click();
  await expect(page.getByRole('heading', { name: 'What is in your pantry?' })).toBeVisible();
  expect((account as AccountState | null)?.profile.members?.[0].allergies[0].canonicalId).toBe('peanut');

  await page.getByRole('button', { name: 'Add to pantry' }).click();
  await page.getByRole('button', { name: 'Continue to budget' }).click();
  await page.getByRole('textbox', { name: 'Food budget (USD)' }).fill('20');
  await page.getByRole('button', { name: 'Find my suggestions' }).click();
  await expect(page.getByRole('heading', { name: 'Your meal ideas' })).toBeVisible();
  expect(recommendationBody).toMatchObject({ budgetCents: 2000 });
  expect(JSON.stringify(recommendationBody)).not.toContain('allergies');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'What is in your pantry?' })).toBeVisible();
  await expect(page.locator('.pantry-list')).toContainText('Rolled oats');
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await expect(page.locator('.saved-chip')).toContainText('Peanuts');
});

test('confirmation link restores setup and removes session tokens from the URL', async ({ page }) => {
  const details = { name: 'Sam Example', city: 'Madison', state: 'WI', age: 28 };
  const user = {
    id: '22222222-2222-4222-8222-222222222222', aud: 'authenticated', role: 'authenticated',
    email: 'sam@example.test', email_confirmed_at: '2026-10-05T12:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { account_details: details },
    created_at: '2026-10-05T12:00:00Z', updated_at: '2026-10-05T12:00:00Z',
  };
  await page.route('http://127.0.0.1:3199/auth/v1/**', async route => {
    if (new URL(route.request().url()).pathname !== '/auth/v1/user') throw new Error(`Unexpected auth request: ${route.request().url()}`);
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ user }) });
  });
  await page.route('**/api/account', async route => {
    expect(route.request().method()).toBe('GET');
    expect(route.request().headers().authorization).toBe('Bearer confirmed-test-token');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ account: null }) });
  });
  await page.goto('/#access_token=confirmed-test-token&refresh_token=confirmed-test-refresh&expires_in=3600&token_type=bearer&type=signup');
  await expect(page.getByRole('heading', { name: 'Food that works for you' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Food allergy' })).toBeVisible();
  await expect.poll(() => page.url()).not.toContain('access_token');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Food that works for you' })).toBeVisible();
});
