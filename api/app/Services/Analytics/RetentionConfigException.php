<?php

namespace App\Services\Analytics;

use InvalidArgumentException;

/**
 * Invalid or missing raw-IP retention settings. Raised before any database access.
 */
class RetentionConfigException extends InvalidArgumentException {}
