# October 9 redesign implementation

Specification: `C:\Users\reach\Downloads\HealthySteps_Redesign_Implementation.md`.

## Phase 0: inspected and preserved

- Created branch `redesign/guest-kitchen` from the clean current repository.
- Ran the site on port 3197 and entered the existing account-free preview.
- Recorded the previous landing and pantry screens in `redesign-audit/`.
- Existing navigation: Home, Help, Account. Pantry add/edit/remove, budget, single-retailer package estimates, eight unreviewed meal examples, typed allergies and deterministic website Help worked in the inspected preview.
- Existing brand: green actions plus blue primary buttons, cream background, system sans-serif, rounded cards. New guest surface uses the supplied forest/cream tokens, low motion and readable spacing.
- Existing preview was memory-only. Existing account persistence requires the deferred Supabase project. No secrets, migrations or external providers were added for this slice.
- Account onboarding, email callbacks, consent copy, API routes and planning calculations are preserved behind a secondary caregiver-account action.

## First implemented slice

- Guest-first landing with Try Meal Planner and sample inventory.
- My Kitchen: type a catalog food or a custom name; optional measured amount; storage, preparation and use-soon date; edit/remove; sample pantry.
- Budget and family size appear next to the pantry, with equipment and collapsible caregiver food settings.
- Guest state is validated when restored and saved in browser storage. Shared-device notice, unavailable-storage message and explicit clear control are visible.
- Meal Ideas groups candidates into Make it now, Just 1–2 extra items, and Plan for later. Prices count whole packages from one retailer. Missing or stale prices do not support a budget-fit claim.
- Existing basket calculation produces a combined shopping list for up to three selected meals, with pantry cost, additions and remaining budget shown separately. Print action added.
- Find Food Help reuses the previously verified external resources without requesting location permission.

## Verification

- 37 unit/API cases passed, including restored guest schema, custom/unmeasured-food exclusion from inventory calculations, and zero-budget pantry-only matching.
- 14 existing desktop/mobile preview cases passed through the optional account entry.
- Four new desktop/mobile guest cases passed after correcting immediate budget saving. They cover reload, custom food, deletion, sample pantry, clearing information, allergy filtering and horizontal overflow.
- TypeScript passed. Mobile meal screenshot reviewed.
- The two account confirmation simulations and a production build passed. Guest kitchen/meal layouts had no horizontal overflow at 360, 768 and 1440 pixels.
- Hosted Supabase remains unconfigured. No live authentication or database verification is claimed.

## Remaining guide requirements

The redesign is started, not complete. Next: searchable pantry categories and household basics, credible reviewed recipe expansion (including frozen foods and eggs), three-/seven-day planning with saved meals and swaps, updated Meal Helper, education with captions, pantry photography, low-bandwidth controls, offline caching, broader 360/768/1440 layout review and source review for food-support additions. The landing food visual and recipe photography are also pending. Custom frozen foods and eggs currently remain reference-only rather than receiving invented cooking instructions or prices.
