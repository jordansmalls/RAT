<?php

namespace App\Services\Analytics;

use InvalidArgumentException;

/**
 * JavaScript number semantics used by the old Express handlers.
 *
 * The old API rounded with `Number(value.toFixed(digits))`. PHP's `round()` pre-rounds
 * (1.005 becomes 1.01, 1.45 becomes 1.5) and `sprintf()` rounds exact ties to even
 * (0.125 becomes 0.12), so neither matches. This class reproduces `toFixed()` exactly from
 * the binary value of the double: pick the integer n closest to value * 10^digits and,
 * on an exact tie, the larger n.
 */
class JsNumber
{
    /**
     * Port of `Number(value.toFixed(digits))` for 0 to 3 digits.
     */
    public static function toFixed(int|float $value, int $digits): float
    {
        if ($digits < 0 || $digits > 3) {
            throw new InvalidArgumentException('JsNumber::toFixed supports 0 to 3 digits.');
        }

        $value = (float) $value;

        if (! is_finite($value) || abs($value) >= 1e21) {
            return $value;
        }

        $isNegative = $value < 0;
        $rounded = self::roundPositive(abs($value), $digits);

        if ($rounded == 0.0) {
            return 0.0;
        }

        return $isNegative ? -$rounded : $rounded;
    }

    /**
     * One-decimal rounding (`round1` in the old audience service).
     */
    public static function round1(int|float $value): float
    {
        return self::toFixed($value, 1);
    }

    /**
     * Two-decimal rounding (`round2` in the old audience service).
     */
    public static function round2(int|float $value): float
    {
        return self::toFixed($value, 2);
    }

    /**
     * Round a finite, non-negative double. Works on the exact mantissa/exponent so the result
     * never depends on the inexact product value * 10^digits.
     */
    protected static function roundPositive(float $value, int $digits): float
    {
        $bits = unpack('J', pack('E', $value))[1];
        $exponentBits = ($bits >> 52) & 0x7FF;
        $fraction = $bits & 0xFFFFFFFFFFFFF;

        if ($exponentBits === 0) {
            $mantissa = $fraction;
            $exponent = -1074;
        } else {
            $mantissa = $fraction | (1 << 52);
            $exponent = $exponentBits - 1075;
        }

        if ($exponent >= 0) {
            // Values of 2^52 and above are integers already.
            return $value;
        }

        // mantissa < 2^53 and 10^3 < 2^10, so the numerator always fits in a signed 64-bit int.
        $numerator = $mantissa * (10 ** $digits);
        $shift = -$exponent;

        if ($shift >= 63) {
            // The divisor is far larger than the numerator, so the nearest integer is 0.
            $scaled = 0;
        } else {
            $scaled = $numerator >> $shift;
            $remainder = $numerator & ((1 << $shift) - 1);

            if ($remainder >= (1 << ($shift - 1))) {
                $scaled++;
            }
        }

        if ($digits === 0) {
            return (float) $scaled;
        }

        $text = str_pad((string) $scaled, $digits + 1, '0', STR_PAD_LEFT);

        return (float) (substr($text, 0, -$digits).'.'.substr($text, -$digits));
    }
}
