<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Trusted Proxies
    |--------------------------------------------------------------------------
    |
    | Proxies allowed to set X-Forwarded-* headers. The Next.js server proxies
    | API requests, so it must be trusted for rate limiting to see the real
    | client IP. Use a comma separated list of IPs/CIDRs, or "*" for any.
    |
    */

    'proxies' => env('TRUSTED_PROXIES'),

];
