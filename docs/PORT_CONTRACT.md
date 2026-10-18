# RAT → Prism port: shared contract

This document is the contract used to port RAT (Rich Analytics Tool) from Express + Mongoose to the
Prism template (Laravel API + Next.js web). The port is complete and the old `server/`, `frontend/` and
`client/` folders have been removed. Their committed versions remain in git history up to commit `26e6713`. The visual reference for the dashboard is `docs/dashboard-reference.html`.

The rules below still describe how the API stores and returns data.

## Database

- MongoDB via `mongodb/laravel-mongodb` (v5, installed). Default connection is `mongodb`.
- Dev data is the shared Atlas cluster, database `test` (see `api/.env`). It holds real mock data:
  `users` (19), `projects` (7), `campaigns` (19), `links` (197), `clicks` (~9.4k), `qrcodes` (legacy, ignore).
- **Never write to Atlas from tests or experiments.** `phpunit.xml` forces a local mongod
  (`mongodb://127.0.0.1:27017`, database `rat_api_testing`). Local mongod is running.
- No SQL migrations. Indexes are created by a migration that uses the mongodb schema builder,
  and it must be idempotent against the existing Atlas indexes listed below.

### Collections must stay compatible with existing documents

Keep the existing collection names, field names and BSON types. Old documents have `__v`; ignore it.

| Collection | Fields (BSON types) |
| --- | --- |
| `users` | `_id` ObjectId, `email` (lowercase, unique), `passwordHash` (bcrypt `$2a/$2b`), `handle` (lowercase, unique sparse; this is Prism's "username"), `onboardingStep` (`"handle"`, `"socials"` or `"complete"`), `socials.{youtube,instagram,twitter,twitch}` = `{identifier, displayName, count, approximate, syncedAt, lastError}`, `socialsLastAttemptedAt`, `createdAt`, `updatedAt`. 16 legacy users have only `name`, `email` and `password` (bcrypt), with no `passwordHash`, `handle` or `onboardingStep`. |
| `projects` | `_id`, `owner` ObjectId→users, `clientName`, `description`, timestamps |
| `campaigns` | `_id`, `project` ObjectId, `title`, `url`, timestamps |
| `links` | `_id`, `project` ObjectId, `campaign` ObjectId, `title`, `platform` (enum in old `link.model.js`), `slug` (unique, lowercase), `destinationUrl`, `customUrl`, `isActive`, `clickCount`, timestamps |
| `clicks` | see old `click.model.js`. `link`, `campaign` and `project` are ObjectIds; `clickedAt` is a Date; `ip`, `visitorId` and `visitorVersion` are private and are never returned by the API or exports. |

Foreign keys **must** be stored as BSON ObjectId and dates as BSON UTCDateTime (use laravel-mongodb's
ObjectId cast or explicit conversion). Timestamps are camelCase: models set
`const CREATED_AT = 'createdAt'; const UPDATED_AT = 'updatedAt';`.

Existing Atlas indexes: users `email`, `handle`; links `project`, `campaign`, `slug` (unique);
clicks `link`, `campaign`, `project`, `clickedAt`, `dayOfWeek`, `hourOfDay`, `geo.country`, `device.type`,
`os.name`, `browser.name`, `isBot`, `{project,clickedAt:-1}`, `{campaign,clickedAt:-1}`,
`{link,clickedAt:-1}`, `{project,visitorId}` (partial).

## Auth (Prism-style, Sanctum SPA cookies)

Prism's auth routes and flows stay as they are (`/api/v1/auth/*`, `/api/v1/me`, availability, settings).
Differences:

- The password column is `passwordHash`. Login also accepts a legacy user whose only credential is
  `password` (bcrypt). On a successful login, re-hash it into `passwordHash` and unset `password`.
- Prism's `username` attribute maps to the stored `handle` field. Queries use `handle`.
- `UserResource` (wrapped in `data`):

```ts
type User = {
  id: string                 // ObjectId hex
  name: string | null
  username: string | null    // from `handle`
  email: string
  email_verified_at: string | null
  onboarding_step: "username" | "socials" | "complete"
  socials: Record<"youtube" | "instagram" | "twitter" | "twitch", {
    identifier: string; displayName: string; count: number | null; approximate: boolean;
    syncedAt: string | null; lastError: string | null }>
  created_at: string
  updated_at: string
}
```

  `onboarding_step` is computed: no handle → `"username"`; a handle but stored `onboardingStep` is not
  `"complete"` → `"socials"`; otherwise `"complete"`.
- Onboarding is username first (Prism's `PUT /api/v1/me/username`, which moves the stored step to
  `"socials"` the first time), then socials via `PUT /api/v1/onboarding/socials` with body
  `{ youtube, instagram, twitter?, twitch? }`. That port of RAT's `saveSocials` sets the step to `complete` and
  returns `{ data: User }`.
- The `onboarded` middleware requires `onboarding_step === "complete"` and returns 403 otherwise.

## RAT domain API

All under `/api/v1`, `auth:sanctum` + `onboarded`. Paths mirror the old Express routes without the `/api` prefix:

```
GET    /projects                      POST /projects
GET    /projects/{project}            PUT  /projects/{project}     DELETE /projects/{project}
GET    /projects/{project}/campaigns
GET    /campaigns                     POST /campaigns              POST /campaigns/manual
GET    /campaigns/{campaign}          PUT  /campaigns/{campaign}   DELETE /campaigns/{campaign}
GET    /campaigns/{campaign}/links    GET  /campaigns/{campaign}/performance
GET    /socials/counts                POST /socials/refresh
GET    /analytics/overview
GET    /analytics/project/{project}/{human-confidence|export|clicks-per-platform|global-reach|efficiency|heatmap|loyalty|device-breakdown|recent-activity|platform-dominance|network-effect|velocity|hero-campaign|monthly-health}
```

Short links are a **web** route on the API origin: `GET /{slug}` → redirect + click tracking
(port of the old `redirect.controller.js`). `customUrl` = `config('rat.base_url').'/'.slug` (`BASE_URL`, http://localhost:4000).

**Response bodies:** success body = `{ "data": <exactly the JSON body the old Express handler returned> }`,
with the same keys, nesting and camelCase names. Ids (`_id`, `project`, `campaign`, `owner`, `link`) are
hex strings and dates are ISO-8601 UTC strings. Exceptions: the CSV/JSON export streams a file download,
and errors use Laravel's standard `{ message, errors? }` with matching status codes (400/404/422 and so on).
Ownership: a resource that isn't the user's returns 404, never 403.

Query parameters keep the old names (`range`, `linkId`, `format` and so on). Read each old handler for them.
`GET /analytics/overview` accepts `window` (`24h|7d|30d`, default `30d`) and optional `projectId` /
`campaignId` / `linkId` scopes. Analytics routes name the segment `{projectId}` (not `{project}`) to
avoid route-model binding. `/analytics/project/{projectId}/export?format=json|csv` returns a file
download, not `{data}`.

## Ownership of files (parallel agents share one checkout)

- **API core agent:** everything in `api/` except the analytics files below. Owns `routes/api.php`,
  models (`User`, `Project`, `Campaign`, `Link`, `Click`), `config/rat.php`, factories, middleware.
- **API analytics agent:** `api/routes/api/analytics.php` (already included inside the onboarded group),
  `api/app/Http/Controllers/Api/V1/Analytics/**`, `api/app/Services/Analytics/**`,
  `api/app/Console/Commands/PurgeRawIps.php`, `api/tests/Feature/Analytics/**`, `api/tests/Unit/Analytics/**`.
  It uses raw collection access (`DB::connection('mongodb')->getCollection(...)`) so it doesn't depend on
  the core agent's models.
- **Web agent:** everything in `web/`.
- Nobody edits `docs/PORT_CONTRACT.md` except the orchestrator. If something here is wrong,
  report it in your final summary instead.
