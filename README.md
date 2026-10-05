# Healthy Steps — family food settings and meal planning

Implementation started from [the build guide](food_support_app_implementation.md). This repository delivers the guide's first useful milestone: enter a budget, restrictions, equipment and confirmed pantry amounts, then generate compatible meals and a package-aware shopping list.

## Run locally

Requires Node.js 20.9 or newer and npm.

```powershell
npm install
npm run dev
```

Open http://localhost:3000. No API keys are needed for the demo. Demo settings persist in this browser until Reset is used. The planner sends its current profile, pantry, and price snapshot to the local server. Images are not uploaded.

For caregiver account sync, copy `.env.example` to `.env.local`, fill in the Supabase project URL and publishable key, and apply the migrations in `supabase/migrations` in filename order. The app then offers an email sign-in link and authenticated food-settings Save. Only the publishable key belongs in this file; never put a service-role key in a public environment variable. The project must allow the local or deployed URL as an Auth redirect destination.

```powershell
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Windows sandbox restrictions can block Node worker processes or the Playwright browser download; those commands may require execution permission in the development environment.

## What works

- Five responsive Home, Meals, Learn, Help, and Chat tabs, plus My food with Diet, Allergies, Favorites, and Nutrients sub-tabs. New visits open on Home.
- Direct number entry on Home, a searchable allergy menu with keyboard selection, and a built-in website chat guide with navigation buttons and conversation history during the session. Chat uses local website guidance; no live AI service is connected.
- Member-specific food preferences, typed allergy proposals and confirmation, medical-consent fields, and an optional authenticated caregiver save endpoint. A configured Supabase project is required for account sync.
- Budget, shared household allergy union, vegetarian/vegan and ingredient exclusions, equipment, meal slots, cooking-time ranking, fees and uncertainty buffer.
- Optional BMI, initially hidden and collapsed when enabled; local-only height/weight; CDC routing for ages 2–19; no calculator under 2.
- Manual confirmed pantry entry with explicit quantity, unit and food state.
- Six measured **synthetic, unreviewed** recipe examples, canonical ingredient IDs and hard restriction/equipment gates. Shared meals combine member exclusions; unresolved allergies hold suggestions.
- Seven-day generation, ingredient scaling, pantry reservations, compatible-unit conversions, full-package checkout costs, missing/stale price status, editable package prices, and complete recalculation after swaps.
- Explicit linked batch accounting in the engine (not automatic scheduling or exposed in the current UI).
- Strict bounded server request validation and an offline deterministic assistant fallback.
- National food-support and education links checked September 30, 2026.
- Supabase migrations with owner RLS, member food tables, reviewed nutrient-record storage, and private storage policies; see [database setup and verification](docs/database.md).

## Honest boundaries

This is a runnable development prototype, not a complete first release. Synthetic recipes and prices are permitted **only for this labeled demo**. They have not undergone clinical/content review. No retailer or live AI is connected. Household size scales servings; this does not establish individual nutrient adequacy. The heuristic planner does not guarantee the cheapest possible basket.

The demo planning API remains stateless and accepts bounded snapshots. The optional caregiver food-settings endpoint uses Supabase Auth and owner RLS, but no project credentials are installed in this repository, so live sign-in, database isolation, and account sync have not been verified. No production rate limits are configured. Do not enable private uploads yet: `/api/photos/analyze` returns a manual-entry fallback without reading or retaining the image body.

The caregiver account path still needs hosted verification and a separate child authorization model. Medical and nutrient content requires qualified review; no verified nutrient records or product labels are seeded. Automatic batch scheduling, reviewed substitutions, a 30–50 approved recipe library, state-specific SNAP routing, a local pilot directory, reviewed videos/transcripts, provider integrations and release review remain open. These are tracked step by step in [implementation progress](docs/implementation-progress.md).

## Code map

| Area | Location |
| --- | --- |
| Responsive UI | `src/components/food-app.tsx`, `src/app/globals.css` |
| Typed domain and synthetic fixtures | `src/lib/domain.ts`, `src/lib/demo-data.ts` |
| Deterministic calculation and matching | `src/lib/planning.ts` |
| Runtime validation and API | `src/lib/validation.ts`, `src/app/api/` |
| Verified national entry points | `src/lib/resources.ts` |
| Database foundation and isolation checks | `supabase/`, `docs/database.md` |
| Calculation/API/browser checks | `tests/` |

Private features should use authenticated Supabase clients and ownership checks rather than adapting these public demo snapshot routes into record-based endpoints. No service-role credentials belong in the browser.
