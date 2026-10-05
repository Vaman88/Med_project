# Database and private storage

The migrations in `supabase/migrations` implement the guide's foundation plus member food settings and reviewed nutrient records. Apply them in filename order to a fresh Supabase project using the SQL editor or `supabase db push`. Existing databases need a reviewed migration plan; the foundation migrations intentionally fail on existing table/type names rather than silently retaining a weaker schema. Never paste a service-role key into frontend environment variables.

Amounts use explicit enumerated units; prices and budgets use integer USD cents. A database unit label does not authorize arbitrary mass/volume conversion. The deterministic planner must validate compatibility. Published content requires review timestamps, and video/resource entries require active published status. No recipe, price, resource, or video is seeded as reviewed by these migrations. Synthetic prices are explicitly marked `is_demo` and `source_type = synthetic_demo`.

Signed-in caregivers can CRUD only their own household, members, restrictions, optional health context, pantry, plans, and shopping records. Child-row updates validate both their previous and new parent. Sensitive context is stored separately and requires a recorded consent version; the app must collect explicit consent before writing. Height and weight have no persisted columns. Public clients can read approved catalog data and published assistance/education records, but cannot administer those records. Private user price observations remain owner-only and cannot be self-published.

Profile, member, restriction, and sensitive-context changes increment the profile version and invalidate prior plans. Pantry changes increment the pantry version and invalidate prior plans. Invalidated plans lose their previous cost result. These triggers protect freshness; they do not calculate recipe safety or certify user-written plan totals. Server endpoints must recompute and validate restrictions, recipe IDs, inventory, and prices before returning an estimate. Privileged endpoints must independently verify the authenticated user's household ownership because service-role requests bypass RLS.

## Verify before enabling real accounts

No live/local Supabase database was available during implementation. Hosted household and image isolation has **not** been verified. Run `supabase/tests/household_isolation.sql` as postgres in a disposable migrated database, with stop-on-error enabled (`psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/household_isolation.sql`). It creates rollback-only synthetic Auth users and asserts owner reads, denied cross-owner writes/deletes, blocked child reparenting/owner transfer, private sensitive data, profile invalidation, and anonymous grants. Reserved fixture UUIDs must not already exist. Do not run this as the service role and mistake service-role bypass for user access.

Then exercise real REST requests with two actual test accounts A/B and the project's publishable key. Use each account's bearer JWT, never the service role. For every private table, assert A cannot select B's known ID, B cannot select A's, cross-owner inserts fail, updates/deletes affect zero rows, and parent-ID changes fail. Repeat with no bearer token: private reads/writes must fail. Confirm legitimate owner inserts/updates/deletes succeed. Review the project's complete policy list: additional permissive policies can widen access beyond this migration.

## Image policy and deletion

The `ingredient-photos` bucket is private and accepts JPEG/PNG/WebP up to 5 MiB. Object names must be `<auth-user-id>/<household-id>/<random-id>.<extension>`. Both folders must identify the caller's own household. Storage policy checks both existing and replacement paths. Database policies do not establish file validity: the photo API must still inspect bytes, strip metadata, collect processing consent, rate-limit, and clean up failures.

Using Supabase Storage HTTP APIs, test A uploading into A's path, then A listing/reading/deleting that object. B must receive no object when listing A's path and must be denied downloading, deleting, overwriting, or moving into/out of A's path. Anonymous access must fail. Test malformed paths and a path with A's user ID but B's household ID. Test short-lived signed URLs separately; anyone holding an unexpired signed URL can use it, so issue them only after ownership checks. Do not log image URLs.

Delete temporary images through the **Storage API** in a `finally` cleanup after analysis, including provider failure. Operate a scheduled retry/sweeper for objects older than 15 minutes; deploy and verify that job before uploads are enabled. This repository's schema does not install a deletion worker. Track and alert on cleanup failures without recording sensitive image contents. The bucket limit and RLS alone do not enforce retention.

Deleting a household cascades its members, sensitive context, restrictions, pantry, plans, entries, and shopping list. Storage blobs do not cascade. Before profile deletion, list and remove the household's objects through the Storage API, then delete its household row. Keep a restricted retry queue if object deletion fails. Do not directly delete `storage.objects` SQL rows: that can orphan actual blobs.

For complete account deletion, authenticate a fresh session and validate the requester server-side, remove all owned Storage objects, delete private price observations (or let the Auth FK cascade), then use Supabase Admin Auth's delete-user API. Deleting the Auth user cascades household data. Do not expose an unauthenticated admin deletion endpoint. Review provider retention and backup expiration separately; immediate database deletion does not promise erasure of provider logs or backups.

Sources: [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), and [Storage schema](https://supabase.com/docs/guides/storage/schema/design).


## Adult account rebuild (October 5, 2026)

The latest migration creates `adult_accounts` and immutable `account_consents` receipts. Setup writes both in one transaction, derives the owner from `auth.uid()`, enforces adult age and a matching typed signature, and records server time. Authenticated clients may read their own rows and update only their own food profile/pantry. Identity and consent receipts cannot be rewritten through client table grants. Account deletion is a function with no user-ID argument: it removes the calling Auth user and cascades owned data.

New account and recommendation endpoints validate bearer tokens through Supabase Auth, derive ownership from the authenticated identity and validate bounded schemas. Recommendations load saved restrictions rather than accepting client allergy overrides. The labelled planner preview stays in memory and writes nothing to Supabase.

Run `supabase/tests/adult_account_isolation.sql` as postgres in a disposable migrated project. It covers atomic setup/receipt, signature mismatch, owner reads, denied cross-owner writes, immutable identity/consent, own updates, own deletion with cascades, surviving other accounts and denied anonymous access. Its fixture JSON intentionally tests database access boundaries; full API schemas are tested separately. This SQL has been written but **not executed** because project configuration is deferred.

After connection, verify real email confirmation, login/logout, token refresh, password recovery, incomplete-onboarding resumption, cross-device pantry and preference persistence, two-account REST isolation and deletion. Supabase's own stored backups and provider retention policies must be checked before making any broader retention promise.
