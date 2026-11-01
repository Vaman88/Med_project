# Healthy Steps

A family cooking website with an adult meal planner and a child Cooking Studio. The opening screen lets you choose an adult or child experience.

Adults can search pantry foods, enter amounts and a budget, and explore meal ideas with ingredients, instructions and dish-specific photos. Children create a chef, explore recipes and play through cooking activities. A parent PIN protects the family settings and parent area. The child game can be played without the recipe ingredients in the real pantry.

## Run locally

Use Node.js 20.9 or newer and npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. Browser-saved pantry, budget and child profiles remain available without an account. Anyone sharing that browser can access its saved information; the parent PIN is a local family control, not a separate authenticated child account.

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
