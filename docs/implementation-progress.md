# Step-by-step implementation progress

The original guide remains the source specification. This log records actual implementation, not completion claims for externally dependent acceptance criteria.

## Adult rebuild ? October 5, 2026

The adult flow supersedes the earlier tab layout below: Log in / Sign up, four-stage onboarding with signed data-use terms and allergies, then Home (pantry ? budget ? basket and meal ideas). Account holds food preferences and privacy controls; Help combines local chat and food-support resources. Preview is temporary memory only. Dated public retailer references replace synthetic prices in this flow. Child layout remains future work, with the agreed cutoff under 10 versus age 10+; account registration remains adult-managed.

Authenticated account setup, pantry/preferences persistence, consent receipts, deletion and recommendations are implemented with a new migration and bounded server APIs. Supabase configuration is deferred at the user's request; real hosted auth and database isolation are still unverified. The new rollback SQL check is `supabase/tests/adult_account_isolation.sql`. The original guide's outstanding recipe review, nutrient evidence and production release gates remain open.

Signup creates the basic Auth identity after the account data-use acknowledgement, then collects food settings and signed terms after any required email confirmation. This avoids asking for allergy details twice after an email redirect. The planner also clears personal state when an Auth session switches users in the same browser.

Current checks: 31 unit/API tests and 12 desktop/mobile browser cases passed; production build passed. Screenshots of account access, signed terms, suggestions and Help were reviewed. These checks cover the planner preview and forms; they do not substitute for live account testing.

## Earlier prototype validation (historical)

- `npm run typecheck`: passed.
- `npm test`: 24 calculation, food-settings, nutrition-evidence, and API tests passed.
- `npm run test:e2e`: eight Chromium tests passed across mobile and desktop. They cover the main workflow, food-settings persistence, allergy clarification, keyboard access, and simulated 200% zoom at an effective 360px width.
- `npm run build`: production compilation and route generation passed.
- Mobile and desktop screenshots inspected. Disabled the development toolbar because it covered the first bottom-navigation button on mobile.
- Supabase SQL and real household/image isolation: **not executed**; require a running Supabase project.

| Guide step | Current state | Work still required |
| --- | --- | --- |
| 1. App shell | Four responsive tabs, server routes, labeled synthetic demo and public support links implemented | Final broader accessibility audit |
| 2. Profiles and access control | Browser-saved demo settings, optional Supabase email sign-in, authenticated member food-settings endpoint, owner RLS migrations, consent-gated medical context, and plan invalidation triggers written | Configure a live project, apply migrations, run two-household isolation and sign-in checks, add separate child account authorization and deletion API |
| 3. Recipes and pantry | Manual confirmed pantry, canonical ingredients, six synthetic recipes, shared-member hard filters, preference ranking, and unverified-product label warnings implemented | 30–50 approved reviewed recipes, verified ingredient and product labels, permission/provenance review and reviewed substitutions |
| 4. Weekly budget | Seven-day slots, scaling, aggregate reservations, units, package rounding, price edits, swaps, and honest budget status implemented; explicit batch links supported by engine | Automatic batch scheduling and UI, account-persisted prices/plans, full price administration |
| 5. Photos | Disabled endpoint and clear manual fallback implemented; no images consumed/stored | Provider, consent, content-based MIME/size validation, metadata removal, private temporary storage, confirmation UI and deletion verification |
| 6. Constrained AI | Deterministic supportive fallback with canonical IDs; no model totals accepted | Authenticated provider adapter, response schema/action validation, timeouts, per-household/request/spend caps and approved production content |
| 7. Education and assistance | Verified Feeding America, 211, USA.gov SNAP guide and NIMH links public | Reviewed videos/transcripts, individually verified state application routes, verified local pilot sites, reporting/admin queue |
| 8. Pilot and release | Unit/API/browser acceptance checks and production build workflow added | Hosted isolation tests, family usability sessions, qualified content review, performance/accessibility audit and actual deployment |

## Work sequence for the next iteration

1. Provision a development Supabase project and apply the migrations as described in `database.md`. Run rollback-only isolation checks, then real storage tests as two authenticated caregivers.
2. Add Supabase server-side authentication, household ownership resolution, and staged member onboarding. Keep health context separate and require explicit consent before saving it.
3. Persist pantry/profile/plan changes through authenticated endpoints, using database profile/pantry versions; clear or invalidate stale plans after restriction edits. Add edit/delete and account/image cleanup.
4. Review and expand recipe content; publish only approved records outside the synthetic demo. Replace demo observations with dated user-entered/reviewed prices.
5. Implement photo confirmation and retention verification before enabling any upload. Add AI afterward through a replaceable server adapter, with approved IDs and deterministic recalculation.
6. Choose a pilot region, verify its actual distribution sites and state SNAP destinations, review sensitive content with qualified professionals, and complete guide step 8 before release.

## Source verification record

Checked September 30, 2026 using source pages, not invented local listings:

- [Feeding America locator](https://www.feedingamerica.org/find-your-local-foodbank)
- [United Way 211 food assistance](https://www.211.org/get-help/food-programs-food-benefits)
- [USA.gov SNAP application guidance](https://www.usa.gov/food-stamps)
- [NIMH eating-disorders education](https://www.nimh.nih.gov/health/publications/eating-disorders)
- [CDC adult BMI calculator](https://www.cdc.gov/bmi/adult-calculator/) and [child/teen calculator](https://www.cdc.gov/bmi/child-teen-calculator/index.html)

USDA SNAP directory, Team Nutrition Cooks and MyPlate recipe pages returned 403 during verification. Their individual destinations/videos were not seeded as verified content. USA.gov provides the current official SNAP guide in the demo.

## October 4 Healthy Steps extension

- My food now has Diet, Allergies, Favorites, and Nutrients tabs. Member choices are saved locally in demo mode. With configured Supabase credentials, a signed-in household owner can explicitly save them through `/api/food-settings`.
- Confirmed allergy and medical settings cannot be asserted through anonymous planning requests. Signed-in planning combines saved restrictions with stricter unsaved draft exclusions. Old member allergy rows are surfaced as needing review rather than silently dropped.
- Known dairy, meat, and gluten derivatives are excluded; uncertain celiac ingredients and preparation hold suggestions. Shopping rows identify products with unverified labels. No demo product receives a verified label claim.
- Preference ranking includes likes, dislikes, flavors, textures, and cuisines after hard filtering. Nutrient ideas and carbohydrate estimates require preparation-matched, verified nutrient records and measured amounts. The synthetic catalog has no verified nutrient records, so it shows unknown instead of invented quantities.
- Live Supabase migrations, Auth redirects, caregiver and child separation, account deletion, product-label review, clinical review, and hosted two-user isolation tests remain unverified. The Supabase account path cannot be exercised until project URL and publishable key are configured and migrations are applied.
