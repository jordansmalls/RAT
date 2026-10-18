# Raw-IP retention and rollout (Task A6)

Status: implemented as an operator-run Artisan command. Exit codes: 0 done, 1 failure, 2 configuration error, 3 stopped before completion. Add `--json` for a machine-readable summary. Nothing here executes
automatically, and no cleanup has been run against live data as part of this
change.

## What the command does

`php artisan rat:purge-raw-ips` (`api/app/Console/Commands/PurgeRawIps.php`) unsets ONLY the
`ip` field on clicks older than an explicitly configured retention period:

- Eligibility: `clickedAt` strictly older than `now - <retentionDays>`
  (`$lt`, so a click exactly AT the cutoff is retained) AND a stored
  non-empty IP (`$exists` + `$nin: [null, ""]`). Clicks with missing, null, or
  empty IPs are already clean and are never counted or touched.
- The write is `{ $unset: { ip: "" } }` on matched `_id`s only. Visitor IDs
  (A3), click counts, timestamps, device, OS, browser, geographic, referrer,
  campaign/project/link references are preserved.
- One fixed run cutoff is computed at startup and reused for every batch, so
  clicks arriving mid-run cannot shift the boundary.
- Work proceeds in bounded batches (default 500, max 5000) paginated by
  ascending `_id`. Each batch logs its cursor. An interrupted run is resumed
  with `--resume-after=<lastCursor>`; a plain rerun is equally safe because
  already-cleaned clicks no longer match the filter.
- Dry-run is the default: without `--apply` the command counts eligible
  clicks and changes nothing. Reports contain counts only; raw IPs are never
  printed or logged.

## Why not a TTL index

Do NOT put a TTL index (`expireAfterSeconds`) on the Click collection for
this purpose: TTL deletes whole click documents, destroying history, totals,
audience metrics, and attribution. The retention script deletes no documents.

## Deployment commands

The API never purges on its own and the command is not registered with Laravel's scheduler. An operator picks a retention period and
runs the command explicitly from `api/` against the target database (`MONGODB_URI` and `MONGODB_DATABASE`):

```bash
# 1. Always dry-run first and inspect the eligible count.
php artisan rat:purge-raw-ips --retention-days=90

# 2. Apply the cleanup once the count is expected.
php artisan rat:purge-raw-ips --retention-days=90 --apply

# Environment-variable form (flag wins when both are set):
IP_RETENTION_DAYS=90 php artisan rat:purge-raw-ips --apply --batch-size=1000

# Resume an interrupted apply run (cursor comes from the previous summary):
php artisan rat:purge-raw-ips --retention-days=90 --apply --resume-after=<lastId>
```

Scheduling (for example a nightly cron or a platform CronJob) must be added
by the operator through the existing deployment infrastructure; this repo
ships no timer (`php artisan schedule:list` is empty). Suggested: dry-run weekly for review, apply on a schedule
only after the compatibility migration below is complete.

Configuration reference:

| Setting        | Source                                           | Required                          | Meaning                                                                  |
| -------------- | ------------------------------------------------ | --------------------------------- | ------------------------------------------------------------------------ |
| retention days | `--retention-days=<days>` or `IP_RETENTION_DAYS` | yes, positive integer, no default | clicks older than `now - days` are eligible                              |
| batch size     | `--batch-size=<n>` or `IP_RETENTION_BATCH_SIZE`  | no (default 500, capped at 5000)  | documents per batch                                                      |
| mode           | `--apply` vs default dry-run                     | no                                | only `--apply` writes                                                    |
| resume cursor  | `--resume-after=<id>`                            | no                                | continue an interrupted run after this `_id`                             |
| connection     | `MONGODB_URI` + `MONGODB_DATABASE`               | yes                               | target database; never point a first run at production without a dry-run |

## Compatibility dependency (read before enabling)

Legacy IP-based metrics (`uniqueIPs` / `uniqueVisitors` derived from `ip`,
`ratio`, `intent`) cannot remain meaningful across purged history: after
cleanup, old clicks legitimately have no IP. Consequences and rules:

- Migrate consumers to the A4 cookie audience fields (`repeatVisitorPercent`,
  `clicksPerVisitor`, `audience.uniqueVisitors`, coverage fields) and retire
  or version the legacy IP fields BEFORE enabling cleanup. The legacy fields
  keep their prior meaning up to the purge point and then degrade; they must
  not be silently redefined.
- Never count all erased/null IPs as one visitor. Missing identity is not a
  shared visitor (it would collapse thousands of purged clicks into "one
  visitor"). Distinct-IP calculations must exclude null/missing values.
- Document the intentional effect wherever legacy metrics are shown:
  post-cleanup, IP uniqueness over purged ranges is unavailable, while click
  totals and cookie audience metrics are unchanged (the acceptance check for
  this script asserts exactly that).

## Historical coverage

- Cookie identity (A3) begins at rollout when `VISITOR_TRACKING_ENABLED=true`
  with a persistent secret. It cannot recover repeat visitors from before
  rollout.
- Do NOT backfill `visitorId` from raw IPs: IP identity suffers
  shared-network collisions and IP churn, which is why the cookie exists.
  Historical clicks without a visitor ID stay unidentified in the new metrics.
- Rotating the visitor secret starts a new measurement epoch (old cookies
  verify against the old secret and browsers receive fresh identities).

## Staged deployment

1. Merge calculation fixes (A1/A2/A4 metric work) without cleanup.
2. Deploy the optional schema and configured cookie collection (A3); verify in
   production that new clicks carry visitor IDs and coverage
   (`identityCoveragePercent`) climbs to the expected level.
3. Deploy and adopt the new repeat-audience metrics (A4); migrate dashboard
   and API consumers off legacy IP fields.
4. Retire or version the legacy IP fields with a documented transition.
5. Only then: dry-run the retention script against a backup/clone, review
   counts, and run `--apply` with the chosen retention period; wire the
   recurring schedule through deployment infrastructure.
6. Monitor: click totals and cookie audience metrics must be identical before
   and after each run; legacy IP metrics will show the documented degradation.

Rollback: purged IPs cannot be restored (there is no backup inside the
command — snapshot the database before the first apply). Code rollback is safe
at any point: visitor fields are optional, missing `ip` is a normal state,
and redirects do not depend on either field.
