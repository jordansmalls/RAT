# Sponsor features: shared contract (backend)

Five features built in parallel by separate agents in ONE shared checkout. Read this whole file,
`docs/PORT_CONTRACT.md` and `api/AGENTS.md` before writing code. Only the orchestrator edits this file.

## Ground rules (all agents)

- Laravel 13 + MongoDB (`mongodb/laravel-mongodb`). Analytics code uses raw collections via
  `App\Services\Analytics\Collections::clicks()|links()|campaigns()|projects()` and aggregation
  pipelines (see `app/Services/Analytics/ProjectMetrics.php` for style: typeMap arrays, docblocks,
  `JsNumber::toFixed` for rounding).
- **Privacy:** `ip`, `visitorId`, `visitorVersion` are never returned or projected out of MongoDB.
  Count them inside the pipeline only (`$addToSet` + `$size`, or `$group` by them then count).
- Foreign keys are BSON ObjectId, dates BSON UTCDateTime, output dates ISO-8601 UTC strings, ids hex strings.
- "Human click" everywhere = `isBot === false` (missing/null `isBot` is NOT human, same as `humanConfidence`).
- Responses: `{ "data": { "message": "...", ...payload } }` via `ProjectScopedController::respond()`
  for analytics. Ownership failures are 404, never 403. Malformed ids are 400.
- Scope: project analytics endpoints accept optional `?linkId=` and `?campaignId=`. Use
  `$this->clickScopeWithCampaign($request, $projectId)` (already in `ProjectScopedController`), which
  returns a click `$match` = `['project' => ObjectId, 'link'? => ObjectId, 'campaign'? => ObjectId]`.
- Services take that `$match` array and must work for ANY combination of those keys (the sponsor
  report calls them with `['project' => ..., 'campaign' => ...]`).
- Routes and placeholder controllers are ALREADY registered (`routes/api.php`, `routes/api/analytics.php`).
  Replace the placeholder controller file you own; do not edit route files. If you truly need a route
  change, say so in your final summary.
- Edit ONLY files you own (listed per feature below). Other agents are editing other files right now.
  Never run `git checkout`, `git stash`, `git reset` or anything that touches other files.
- Formatting: run `vendor/bin/pint <your files>` (never bare `vendor/bin/pint`, it rewrites others' files).
- Tests: Pest, in `tests/Feature/Analytics/<Feature>Test.php` (+ optional `tests/Unit/Analytics/<Feature>Test.php`).
  Seed with `Tests\Feature\Analytics\Support\AnalyticsFixtures` (read it; don't modify it; if you
  need extra helpers, put them in your own test file). Run tests against YOUR OWN database so parallel
  agents don't collide: `MONGODB_DATABASE=rat_api_testing_<slug> php artisan test --compact tests/Feature/Analytics/<Feature>Test.php`.
  At the end, run the full suite the same way and report any failures in files you don't own instead of fixing them.
- Never touch the Atlas database (`api/.env`). Tests force local mongod.
- Each service class gets a class docblock explaining the method (formulas, assumptions) so the
  sponsor report and frontend can quote it. Tunable numbers (weights, benchmarks, thresholds) go in
  `config/sponsor.php` under your feature's key. `config/sponsor.php` is shared: create it if missing,
  and only add/edit YOUR top-level key (`geo`, `decay`, `traffic_quality`, `deal_value`).
  Read it right before editing and use a minimal Edit, since others may be editing it too.

## Feature A: Geo value score (`geo`)

Owner files: `app/Services/Analytics/GeoValue.php`, `app/Http/Controllers/Api/V1/Analytics/GeoValueController.php`,
`tests/Feature/Analytics/GeoValueTest.php`, `tests/Unit/Analytics/GeoValueTest.php`, `config/sponsor.php` key `geo`.

Route: `GET /api/v1/analytics/project/{projectId}/geo-value[?linkId|campaignId]`, message `Geo value calculated`.

Service: `GeoValue::compute(array $match): array`. Human clicks only. Countries (`geo.country`, ISO-2;
missing = `"unknown"`) map to tiers in config (tier1: US, GB, CA, AU, DE, plus a reasonable set like
NZ, IE, NL, SE, NO, DK, CH, AT, FI, BE, LU, SG, JP; tier2: others like FR, ES, IT, KR, AE, IL, PL, PT, CZ, etc.;
tier3: everything else; `unknown` is its own bucket with weight 0 excluded from the score denominator).
Each tier has a relative ad-value weight (tier1 = 1.0, tier2 ≈ 0.45, tier3 ≈ 0.15).
`score` (0-100, one decimal) = Σ(clicks × weight) / Σ(known clicks) × 100.

```json
{ "score": 72.4, "tier1Share": 61.2, "humanClicks": 812, "unknownClicks": 9,
  "tiers": [{ "tier": "tier1", "weight": 1, "clicks": 497, "share": 61.2 }, ...],
  "countries": [{ "country": "US", "tier": "tier1", "weight": 1, "clicks": 300, "share": 36.9 }, ...],
  "weights": { "tier1": 1, "tier2": 0.45, "tier3": 0.15 } }
```
Shares are % of known human clicks (one decimal). `countries` sorted by clicks desc, top 50.
Empty scope → score 0, empty arrays.

## Feature B: Decay curve & long tail (`decay`)

Owner files: `app/Services/Analytics/DecayCurve.php`, `app/Http/Controllers/Api/V1/Analytics/DecayCurveController.php`,
`tests/Feature/Analytics/DecayCurveTest.php`, `tests/Unit/Analytics/DecayCurveTest.php`, `config/sponsor.php` key `decay`.

Route: `GET /api/v1/analytics/project/{projectId}/decay[?linkId|campaignId][&days=90]`, message `Decay curve calculated`.
`days` = curve length, integer 7..365, default 90 (422 on invalid, standard Laravel validation shape).

Service: `DecayCurve::compute(array $match, int $days = 90): array`. Human clicks only. Each click's
age = whole days between its link's `createdAt` (the "publish" moment; `$lookup` on links) and
`clickedAt`, floored, clamped at 0. Clicks whose link is gone are dropped. Clicks older than `days`
still count toward totals and the `after*` shares, just not the plotted curve.

```json
{ "humanClicks": 1200, "days": 90,
  "curve": [{ "day": 0, "clicks": 340, "cumulative": 340, "cumulativeShare": 28.3 }, ...],
  "halfLifeDays": 3, "p90Days": 41, "peakDay": 0,
  "shareAfterDay7": 38.1, "shareAfterDay30": 12.4, "tailClicks": 457, "evergreen": true }
```
- `curve` has every day 0..days-1 (zero-filled).
- `halfLifeDays` = smallest day d where cumulative clicks ≥ 50% of humanClicks (null if no clicks). `p90Days` same at 90%.
- `shareAfterDayN` = % of human clicks with age ≥ N. `tailClicks` = clicks with age ≥ 7.
- `evergreen` = `shareAfterDay7 >= config('sponsor.decay.evergreen_threshold')` (default 30).
- Also include `"links"`: per-link `{ link, title, platform, publishedAt, humanClicks, halfLifeDays, shareAfterDay7 }`, top 25 by clicks.

## Feature C: Traffic quality certificate (`traffic_quality`)

Owner files: `app/Services/Analytics/TrafficQuality.php`, `app/Http/Controllers/Api/V1/Analytics/TrafficQualityController.php`,
`tests/Feature/Analytics/TrafficQualityTest.php`, `tests/Unit/Analytics/TrafficQualityTest.php`, `config/sponsor.php` key `traffic_quality`.

Route: `GET /api/v1/analytics/project/{projectId}/traffic-quality[?linkId|campaignId]`, message `Traffic quality calculated`.

Service: `TrafficQuality::compute(array $match): array`. Every click is put into exactly one bucket,
by first matching rule in this order:
1. `bot`: `isBot === true` (user-agent bot detection at redirect time).
2. `unclassified`: `isBot` missing/null (legacy clicks we can't vouch for).
3. `burst`: a click from the same visitor (`visitorId`; fall back to `ip` when visitorId missing) on the
   same link within `burst_window_seconds` (default 10) of that visitor's previous click on that link.
   The first click of a burst stays eligible; the repeats are filtered. Compute in MongoDB
   (`$setWindowFields` partitioned by link+visitor sorted by clickedAt, `$shift` for previous time).
4. `duplicate`: same visitor + same link, beyond `max_clicks_per_visitor_per_link` (default 3) lifetime human clicks.
5. `unidentified`: human, but no visitorId AND no ip. Counted as verified but listed separately (informational, not filtered).
6. `verified`: everything else.

```json
{ "totalClicks": 1500, "verifiedHumanClicks": 1203, "verifiedShare": 80.2,
  "uniqueVerifiedVisitors": 990, "grade": "B",
  "buckets": [{ "reason": "bot", "label": "Known bot or crawler", "clicks": 210, "share": 14.0, "filtered": true,
                "description": "..." }, ...],
  "methodology": ["Bot user agents are flagged at redirect time ...", ...],
  "period": { "from": "2026-01-01T00:00:00.000Z", "to": "2026-03-01T00:00:00.000Z" },
  "generatedAt": "2026-10-17T12:00:00.000Z" }
```
- Always list all six buckets in the order above (zero rows included). `unidentified` has `filtered: false`.
- `verifiedHumanClicks` = `verified` + `unidentified`. `uniqueVerifiedVisitors` counts distinct
  visitorIds among verified clicks (inside MongoDB).
- `grade` from verifiedShare thresholds in config (A ≥ 85, B ≥ 70, C ≥ 50, else D). Empty scope → grade null.
- `period` = first/last clickedAt in scope (null when empty).

## Feature D: Deal value / effective CPC vs paid ads (`deal_value`)

Owner files: `app/Services/Analytics/DealValue.php`, `app/Http/Controllers/Api/V1/Analytics/DealValueController.php`,
`app/Http/Controllers/Api/V1/CampaignDealController.php`, `app/Http/Requests/CampaignDealRequest.php`,
`tests/Feature/Analytics/DealValueTest.php`, `tests/Feature/CampaignDealTest.php`, `tests/Unit/Analytics/DealValueTest.php`,
`config/sponsor.php` key `deal_value`. You may also add `'deal'` to `$fillable` (and a cast if needed) in
`app/Models/Campaign.php`; that is the only edit allowed to that file.

Storage: campaign field `deal` = `{ amount: float (> 0, ≤ 10,000,000), currency: "USD"|"EUR"|"GBP"|"CAD"|"AUD", category: string|null, paidAt: Date|null }`.
`category` is one of the benchmark categories in config (or null → `default`).

Routes:
- `PUT /api/v1/campaigns/{campaign}/deal` body `{ amount, currency, category?, paid_at? }` → 200 `{ data: { message: "Deal saved.", campaign } }`
  (match the existing `CampaignController`/`RatResource` style; read `CampaignController::owned()` for ownership → 404).
- `DELETE /api/v1/campaigns/{campaign}/deal` → 204, unsets `deal`.
- `GET /api/v1/analytics/campaign/{campaignId}/deal-value` → `{ data: { message: "Deal value calculated", ... } }`.
  Ownership via the campaign's project owner (400 malformed id, 404 not found/not owned). No deal stored → 422
  `{ message: "This campaign has no deal value yet." }`. Controller can extend `ProjectScopedController` for `respond()`.

Service: `DealValue::compute(array $match, array $deal): array` where `$deal` is the stored deal array.
Human clicks = isBot false. Unique visitors = distinct visitorId among human clicks (in MongoDB).

```json
{ "deal": { "amount": 2500, "currency": "USD", "category": "saas" },
  "humanClicks": 4100, "uniqueVisitors": 3650,
  "effectiveCpc": 0.61, "costPerUniqueVisitor": 0.68,
  "benchmarks": [{ "channel": "meta", "label": "Meta ads", "cpc": 1.72, "equivalentSpend": 7052,
                   "savings": 4552, "multiple": 2.82 }, ...],
  "bestComparison": { "channel": "google_search", "multiple": 4.1 },
  "benchmarkSource": "Typical 2025-2026 CPC ranges by category; directional, not a quote.",
  "currencyNote": "Benchmarks are USD; non-USD deals are converted at the configured static rate." }
```
- `effectiveCpc` = amount ÷ humanClicks (2 decimals; null when 0 clicks). `equivalentSpend` = humanClicks × benchmark cpc.
  `savings` = equivalentSpend − amount (converted to deal currency). `multiple` = benchmark cpc ÷ effectiveCpc (2 decimals).
- Benchmarks in config: channels `meta`, `google_search`, `tiktok`, `youtube_ads`, `linkedin`, per category
  (`default`, `saas`, `finance`, `ecommerce`, `gaming`, `education`, `health`), USD. Static FX rates in config.

## Feature E: Shareable sponsor report

Owner files: `app/Models/SponsorReport.php`, `app/Http/Controllers/Api/V1/SponsorReportController.php`,
`app/Http/Controllers/Api/V1/PublicSponsorReportController.php`, `app/Http/Requests/SponsorReport*.php`,
`app/Http/Resources/SponsorReport*.php`, `app/Services/SponsorReports/**`, `database/factories/SponsorReportFactory.php`,
an index migration for `sponsor_reports`, `tests/Feature/SponsorReports/**`.

Collection `sponsor_reports`. One report = one campaign (sponsor deals are per campaign). Owner can
create (`POST /api/v1/sponsor-reports` `{ campaign_id, title?, sections?, expires_at? }`), list, show,
patch (title, sections, expires_at, revoke), delete. Public: `GET /api/v1/public/reports/{token}`
(no auth, already throttled) returns the report payload, 404 for unknown/revoked/expired tokens
(same 404 for all three so tokens can't be probed). The public payload is what the frontend page renders.

The public payload composes the four services above with `['project' => ..., 'campaign' => ...]`:
`GeoValue::compute`, `DecayCurve::compute`, `TrafficQuality::compute`, `DealValue::compute` (only if the
campaign has a deal) plus creator info (display name/handle and `socials` counts, never email), campaign
title/url, links (title/platform/human clicks), and an overall headline block. Sections are toggleable.
Those four services are being written in parallel; code against the signatures above.

### As built (orchestrator notes)

- Validation errors on sponsor-report routes are standard Laravel 422s (`{ message, errors }`), not the RAT domain's 400.
- `PATCH /sponsor-reports/{id}` also accepts `revoked: bool` (revoke/restore) and `regenerate_token: true`
  (returns a new `token`/`shareUrl`; the old token stops working immediately).
- `GET /sponsor-reports/{id}?preview=1` returns the public payload for the owner without counting a view.
- Share URL is `config('app.frontend_url').'/r/{token}'`. The web page at `/r/[token]` should send
  `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`.
- Public payloads are cached for 5 minutes, keyed on the report's `updatedAt`.
- Geo value: tiers with zero clicks are omitted from `tiers`; `humanClicks` counts only clicks with a known country.
