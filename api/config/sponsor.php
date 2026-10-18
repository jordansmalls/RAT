<?php

/*
| Sponsor feature configuration. Each top-level key belongs to one feature:
| `deal_value` (Feature D) only, for now. Other features add their own keys.
*/

return [

    /*
    | Feature B: decay curve & long tail.
    |
    | `evergreen_threshold` is the `shareAfterDay7` percentage at or above which a scope is
    | flagged `evergreen`. `default_days` is the curve length used by
    | GET /analytics/project/{projectId}/decay when `?days=` is omitted.
    */
    'decay' => [
        'evergreen_threshold' => 30,
        'default_days' => 90,
    ],

    /*
    | Feature D: deal value / effective CPC vs paid ads.
    |
    | Benchmarks are typical paid-ad CPCs in USD per category and channel. They are
    | directional planning numbers, not quotes; `youtube_ads` uses a per view-click
    | proxy because YouTube bills on views rather than clicks. FX rates are static
    | USD values of one unit of the deal currency (1 EUR = 1.08 USD), used to express
    | benchmark comparisons in the deal's own currency.
    */
    'deal_value' => [
        'channels' => [
            'meta' => 'Meta ads',
            'google_search' => 'Google Search ads',
            'tiktok' => 'TikTok ads',
            'youtube_ads' => 'YouTube ads (per view-click proxy)',
            'linkedin' => 'LinkedIn ads',
        ],

        'benchmarks' => [
            'default' => ['meta' => 1.72, 'google_search' => 2.69, 'tiktok' => 1.00, 'youtube_ads' => 0.49, 'linkedin' => 5.58],
            'saas' => ['meta' => 2.10, 'google_search' => 3.60, 'tiktok' => 0.90, 'youtube_ads' => 0.70, 'linkedin' => 6.20],
            'finance' => ['meta' => 2.40, 'google_search' => 3.90, 'tiktok' => 1.05, 'youtube_ads' => 0.75, 'linkedin' => 7.10],
            'ecommerce' => ['meta' => 1.35, 'google_search' => 2.10, 'tiktok' => 0.85, 'youtube_ads' => 0.45, 'linkedin' => 4.20],
            'gaming' => ['meta' => 1.10, 'google_search' => 1.60, 'tiktok' => 0.70, 'youtube_ads' => 0.35, 'linkedin' => 3.40],
            'education' => ['meta' => 1.55, 'google_search' => 2.40, 'tiktok' => 0.80, 'youtube_ads' => 0.50, 'linkedin' => 4.80],
            'health' => ['meta' => 1.90, 'google_search' => 3.10, 'tiktok' => 0.95, 'youtube_ads' => 0.60, 'linkedin' => 5.90],
        ],

        /*
        | Static USD value of one unit of the deal currency.
        */
        'fx_to_usd' => ['USD' => 1.00, 'EUR' => 1.08, 'GBP' => 1.27, 'CAD' => 0.74, 'AUD' => 0.66],

        'benchmark_source' => 'Typical 2025-2026 CPC ranges by category; directional, not a quote.',

        'currency_note' => 'Benchmarks are USD; non-USD deals are converted at the configured static rate.',
    ],

    /*
    | Feature A: geo value score.
    |
    | `tiers` maps ISO-3166 alpha-2 country codes to a relative ad-value weight.
    | `tier3` has no country list: every known country not listed in `tier1`/`tier2`
    | falls through to it. A human click with a missing/blank `geo.country`, or the
    | literal "unknown", is its own `unknown` bucket at weight 0 and is excluded
    | from the score denominator. `country_limit` caps the country breakdown.
    */
    'geo' => [
        'unknown_country' => 'unknown',
        'country_limit' => 50,
        'tiers' => [
            'tier1' => [
                'weight' => 1.0,
                'countries' => [
                    'US', 'GB', 'CA', 'AU', 'DE', 'NZ', 'IE', 'NL', 'SE', 'NO', 'DK', 'CH',
                    'AT', 'FI', 'BE', 'LU', 'SG', 'JP',
                ],
            ],
            'tier2' => [
                'weight' => 0.45,
                'countries' => [
                    'FR', 'ES', 'IT', 'KR', 'AE', 'IL', 'PL', 'PT', 'CZ', 'GR', 'HU', 'RO',
                    'SK', 'SI', 'EE', 'LV', 'LT', 'HR', 'MT', 'CY', 'TW', 'HK', 'QA', 'SA',
                    'KW', 'BH', 'OM', 'ZA', 'MX', 'CL', 'AR', 'MY', 'TH',
                ],
            ],
            'tier3' => [
                'weight' => 0.15,
                'countries' => [],
            ],
        ],
    ],

    'traffic_quality' => [
        'burst_window_seconds' => 10,
        'max_clicks_per_visitor_per_link' => 3,
        'grade_thresholds' => ['A' => 85, 'B' => 70, 'C' => 50],
        'buckets' => [
            'bot' => [
                'label' => 'Known bot or crawler',
                'description' => 'Flagged by the user-agent bot expression at redirect time.',
            ],
            'unclassified' => [
                'label' => 'Unclassified traffic',
                'description' => 'No valid boolean bot classification was recorded, so this click cannot be counted as human.',
            ],
            'burst' => [
                'label' => 'Rapid repeat click',
                'description' => 'A human repeat within the configured inclusive window after the previous click on the same link and identity.',
            ],
            'duplicate' => [
                'label' => 'Excess repeat click',
                'description' => 'A non-burst human click beyond the configured lifetime allowance per link and identity.',
            ],
            'unidentified' => [
                'label' => 'Human without an identifier',
                'description' => 'Explicitly non-bot with no usable cookie identifier or IP; included as verified without deduplication.',
            ],
            'verified' => [
                'label' => 'Verified human click',
                'description' => 'Explicitly non-bot with a usable identity, passing the burst and duplicate filters.',
            ],
        ],
    ],

];
