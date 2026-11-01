# Supabase setup

Project: [isvxgxztiayqzkbvrkia](https://supabase.com/dashboard/project/isvxgxztiayqzkbvrkia).

The supplied public URL and publishable key are configured in .env.example and netlify.toml. Copy .env.example to .env.local for local development. The publishable key is intended for browser use; no database password or secret key is included.

## Run once in the dashboard

Open the project's [SQL Editor](https://supabase.com/dashboard/project/isvxgxztiayqzkbvrkia/sql/new) and run [202611010001_kitchen_saves.sql](../supabase/migrations/202611010001_kitchen_saves.sql). This standalone migration creates the current planner's private kitchen_saves table and owner-only policies. It does not require the older migrations.

Email/password authentication is enabled and email confirmation is required. In Authentication > URL Configuration, set the Site URL to the deployed website so email confirmation links return there. Add local URLs when testing locally.

## How saving works

Choose the adult planner, then Sign in or create account. After signing in, choose Copy guest pantry from this device to import local food settings, Save online to store them, or Load saved kitchen to restore them. Loading asks before replacing the current kitchen. Signing out restores the guest pantry; account data is not written into the guest save. A refresh starts a signed-in visit with a fresh kitchen until you choose Load saved kitchen.

Cloud saving covers the adult guest planner. Child profiles, the parent PIN, child progress, and the family planner stay on the device. Signing in cannot replace a child's allergy restrictions with account data.

## Verification status

The live project accepted the publishable key and returned enabled email authentication. The kitchen_saves table was absent during the initial check; its migration must be run by a project administrator. Mocked browser tests cover authentication and save/load behavior; they do not prove live database policies or email delivery. Full live save/load verification requires the table and a confirmed user account.

Older database schemas, legacy account APIs and their historical test notes are documented in [reference/legacy-database.md](reference/legacy-database.md). They are not required for the current planner's cloud save feature.
