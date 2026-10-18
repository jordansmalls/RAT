# Agent notes

Monorepo: `api/` (Laravel 13 API) and `web/` (Next.js 16). Read `README.md` for the architecture.

- Working in `api/`: follow `api/AGENTS.md` (Laravel Boost guidelines). Run `vendor/bin/pint` and `php artisan test` after PHP changes.
- Working in `web/`: follow `web/AGENTS.md`. Next.js 16 has breaking changes, so read the docs in `web/node_modules/next/dist/docs/`. Run `pnpm lint && pnpm typecheck && pnpm test` after changes.
- Keep validation rules in sync: `api/config/usernames.php` ↔ `web/src/features/auth/schemas.ts`.
- Auth redirects live only in `web/src/components/auth/auth-guard.tsx`. Forms update the `me` query cache and never navigate after sign in, sign out or onboarding.
- New API routes go in `api/routes/api.php` under `v1`, with a Form Request, an API Resource and a Pest test.
- New frontend features go in `web/src/features/<name>/` (`api.ts`, `queries.ts`, `schemas.ts`, `components/`).
