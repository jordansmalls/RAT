<?php

namespace App\Services;

use Carbon\CarbonInterface;

/**
 * Port of the old server's utils/format.date.js (en-US formatting).
 *
 * One deliberate fix: the old ordinal suffix produced "20undefined" and "30undefined"
 * for the 20th and 30th; these use "th" instead.
 */
class ClickDates
{
    /** "Saturday" */
    public static function dayOfWeek(CarbonInterface $date): string
    {
        return $date->format('l');
    }

    /** "01:05 PM" */
    public static function timeOfDay(CarbonInterface $date): string
    {
        return $date->format('h:i A');
    }

    /** "9/19/2026" */
    public static function dateClicked(CarbonInterface $date): string
    {
        return $date->format('n/j/Y');
    }

    /** "Saturday, September 19th 2026, at 01:05 PM" */
    public static function fullDateClicked(CarbonInterface $date): string
    {
        return self::dayOfWeek($date).', '.$date->format('F jS Y').', at '.self::timeOfDay($date);
    }
}
