# Healthy Steps

A family cooking website with an adult meal planner and a child Cooking Studio. The opening screen lets you choose an adult or child experience.

Adults can search pantry foods, enter amounts and a budget, and explore meal ideas with ingredients, instructions and dish-specific photos. Children create a chef, explore recipes and play through cooking activities. A Parent PIN keeps children out of the parent area on a shared device (see [Parent PIN](#parent-pin)). The child game can be played without the recipe ingredients in the real pantry.

## Run locally

Use Node.js 20.9 or newer and npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. Browser-saved pantry, budget and child profiles remain available without an account. Anyone sharing that browser can access its saved information; the parent PIN is a local family control, not a separate authenticated child account.

## Parent PIN

The Parent PIN is a **family control for a shared device, not security**. It keeps a child from opening the meal planner, changing allergies and food restrictions, or deleting the child profile through the ordinary screens.

- A parent creates a 4–8 digit PIN when setting up a child's kitchen. Profiles saved before PINs existed are asked to create one the first time the parent area is opened.
- The PIN is stored only in this browser as a salted PBKDF2 hash. After three wrong PINs, each further miss starts a wait that doubles from 30 seconds up to 15 minutes.
- The parent area locks again when someone switches profile or returns to the child kitchen, and after 5 minutes without activity.
- Anyone with access to the browser's storage, developer tools or site-data settings can get around it. Clearing this site's data resets a forgotten PIN and also deletes the saved child profile. It is not a separate authenticated child account; real child accounts would need server-side authorization.

## Recipe library

The Recipes tab and the "More recipes with your food" row search TheMealDB, an outside community library. These recipes are **not filtered** by the family's food settings and are labelled "Not checked against your food settings". Opening a recipe compares its ingredient names with the saved allergies and restrictions and lists any known conflicts first. Ingredients it cannot recognize are marked as not verified; finding no conflicts never means a recipe is safe, so check every label.

## Supabase

The intended Supabase project is `isvxgxztiayqzkbvrkia` at `https://isvxgxztiayqzkbvrkia.supabase.co`.

The supplied publishable key and project URL are configured in `.env.example` and `netlify.toml`. Copy `.env.example` to `.env.local` for local use. The key is browser-safe; never use a secret or service-role key in frontend configuration.

Run the standalone [kitchen-save setup](supabase/migrations/202611010001_kitchen_saves.sql) in the project's SQL Editor. The adult planner then supports optional sign-in, Save online and Load saved kitchen. Each account owns its save; guest data and child profiles remain local. See [database setup](docs/database.md) for the dashboard step, email configuration and verification status.

## Five-folder code map

| Folder | Contents |
| --- | --- |
| `src/` | Next.js pages and API routes, adult planner, child Cooking Studio, styles, recipe catalog and application logic. |
| `public/` | Recipe photographs, fonts and other assets served by the website. |
| `tests/` | Unit and browser tests, Playwright configurations in `config/`, and verification runners in `scripts/`. |
| `supabase/` | SQL migrations and database isolation checks. |
| `docs/` | Setup notes, design references, photo credits, audits and demos. The original implementation brief is in `reference/`. |

Root files are limited to the project README, agent instructions and tool/deployment configuration. Generated dependencies, builds, reports and local environment files are ignored by Git.

## Verify

```powershell
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:auth-flow
```

`test:e2e` starts the production build on port 3197. With a development server already running on that port, use `npm run test:e2e:local`. Playwright configurations live under `tests/config/` and launch the app from the repository root.

`test:auth-flow` runs an isolated local server with browser protocol mocks. It does not test a live Supabase database or send real emails. SQL isolation checks under `supabase/tests/` require a disposable migrated database.

## Recipe and pricing notes

Recipes and photos are serving suggestions, not professionally reviewed nutrition plans. Check product labels, allergies and safe cooking instructions. Pantry estimates depend on confirmed amounts; missing or outdated prices are not verified costs. Photo sources and credits are recorded in `docs/`.
