<?php

return [

    /*
    | Short-link origin. A link's customUrl is base_url/{slug}.
    */
    'base_url' => env('BASE_URL', 'http://localhost:4000'),

    /*
    | Where unknown or inactive short links redirect.
    */
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),

    /*
    | Minutes before saved social counts are refreshed again on read.
    */
    'social_refresh_minutes' => (float) env('SOCIAL_REFRESH_MINUTES', 15),

    /*
    | Timezone used for a click's dayOfWeek, hourOfDay and fullDateClicked. The old
    | server used its process timezone; clickedAt itself is always stored in UTC.
    */
    'click_timezone' => env('CLICK_TIMEZONE', 'UTC'),

    /*
    | Opt-in, project-scoped first-party visitor identity.
    */
    'visitor' => [
        'enabled' => in_array(strtolower(trim((string) env('VISITOR_TRACKING_ENABLED', false))), ['1', 'true', 'yes', 'on'], true),
        'secret' => env('VISITOR_SECRET'),
        'cookie_name' => env('VISITOR_COOKIE_NAME', 'rat_vid'),
        'cookie_max_age_days' => (float) env('VISITOR_COOKIE_MAX_AGE_DAYS', 90),
    ],

    /*
    | Optional absolute path to a MaxMind City .mmdb database.
    */
    'geoip_database' => env('GEOIP_DATABASE'),

    /*
    | Raw-IP retention for `php artisan rat:purge-raw-ips`. Values stay raw so the
    | command validates them: days has no default (a period must be chosen explicitly)
    | and a missing batch size falls back to the command's default.
    */
    'ip_retention' => [
        'days' => env('IP_RETENTION_DAYS'),
        'batch_size' => env('IP_RETENTION_BATCH_SIZE'),
    ],

];
