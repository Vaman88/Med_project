# Healthy Steps

A simple adult food planner: account setup, pantry, shopping budget, then ingredients and meal ideas. Help combines a local website guide with official food-support resources.

## Run locally

Requires Node.js 20.9 or newer and npm.

```powershell
npm install
npm run dev -- --port 3197
```

Open http://localhost:3197. The first screen is Log in / Sign up. Until Supabase is connected, choose **Preview the planner without an account**. Preview uses memory only; refreshing or exiting clears it. No pretend accounts or passwords are saved locally.

## Adult experience

- Signup asks adult age, name, city/state and email/password first. After any required email confirmation, it collects allergies and food preferences without asking the person to enter them twice. Typed signature and explicit acceptance record the current terms version. Optional health-related food settings need separate consent.
- Signed-in users start on Home, at pantry entry. Restoring a browser page also returns to Home.
- Add measured pantry amounts, then type a shopping budget. Suggestions deduct confirmed usable inventory, round purchases to whole packages, include entered fees and stay within the budget.
- The basket covers up to three meal ideas. It is not a full week of food and does not establish nutritional adequacy.
- Public Walmart and Target listings provide dated estimates and clickable references. A suggested shopping basket uses prices from one retailer; references older than 30 days are excluded from a confirmed budget basket. Compatible meal ideas and source links remain available when a complete basket cannot be priced. Local prices, labels, stock and fees need checking. See [price reference notes](docs/price-references.md).
- Account contains food settings, accepted terms and account deletion. Help chat runs locally with navigation buttons; no messages are sent to an external AI service.
- The future layout cutoff is under 10 for the child layout and 10+ for the adult layout. This release only creates accounts for adults 18+; child profiles and permissions are not implemented.

## Connect Supabase later

Copy `.env.example` to `.env.local` and set the project URL and publishable key. Apply all `supabase/migrations` in filename order. In Supabase Auth, enable email/password sign-in and configure the local and deployed site URLs as allowed confirmation and password-recovery redirect URLs. Restart the app after changing environment variables; rebuild on Netlify after changing deployment variables.

The new account implementation uses `adult_accounts`, `account_consents`, owner RLS, authenticated `/api/account` and `/api/recommendations` routes, and transaction functions for setup and deletion. Only the publishable key belongs in browser environment variables. See [database setup and verification](docs/database.md).

**Supabase configuration is deferred at the user's request.** Live signup, email confirmation, password recovery, cross-account isolation, persistence and deletion have not yet been verified against a running project. The written terms describe intended product data use and have not received legal review.

## Verify

```powershell
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:auth-flow
```

Browser tests start a production server on port 3197; stop the development server on that port first. Tests cover desktop/mobile signup forms, pantry and budget planning, allergy selection, Help, additional-meal spacing, page restoration and keyboard access. SQL checks require a disposable configured Supabase database and are separate from these tests.

`test:auth-flow` uses a separate local server and browser protocol mocks. It exercises Supabase's browser SDK through the email-confirmation link return, signed food setup, saved pantry and budget, and a reload. It never contacts a real Supabase project and cannot verify database row policies, actual email delivery or account deletion.

## Prototype boundaries

Eight prototype recipe examples remain unreviewed. The hummus and carrot sandwich is an original adaptation inspired by [USDA MyPlate’s sandwich guide](https://www.myplate.gov/sites/default/files/2024-01/BuildABetterSandwichWithMyPlate-01-03-24.pdf); USDA has not reviewed this adaptation. No verified nutrient or product-label catalog, automatic location pricing, photo analysis, live AI or child authorization is connected. Existing stateless demonstration APIs and legacy planning components remain in the codebase for compatibility, but the new website uses the adult flow. Original implementation-guide work is tracked in [implementation progress](docs/implementation-progress.md).

## Code map

| Area | Location |
| --- | --- |
| Adult UI and account setup | `src/components/adult-planner.tsx`, `account-access.tsx`, `food-preferences.tsx` |
| Account schemas and terms | `src/lib/account.ts` |
| Basket selection and retailer references | `src/lib/recommendations.ts`, `value-prices.ts` |
| Deterministic inventory and calculations | `src/lib/planning.ts` |
| Account and recommendation endpoints | `src/app/api/account/`, `src/app/api/recommendations/` |
| Account migration and isolation assertions | `supabase/migrations/202610050001_adult_accounts.sql`, `supabase/tests/adult_account_isolation.sql` |
| Calculation/API/browser checks | `tests/` |
