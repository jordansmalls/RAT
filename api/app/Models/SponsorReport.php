<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Str;
use MongoDB\Laravel\Eloquent\Casts\ObjectId;
use MongoDB\Laravel\Eloquent\Model;

/**
 * A shareable, per-campaign report a creator sends to a sponsor.
 *
 * Only the SHA-256 hash of the share token is stored (`tokenHash`). The plaintext token is
 * returned once, when the report is created or its token is regenerated.
 *
 * @property CarbonInterface|null $expiresAt
 * @property CarbonInterface|null $revokedAt
 * @property CarbonInterface|null $lastViewedAt
 */
class SponsorReport extends Model
{
    use HasFactory;

    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    /**
     * Toggleable sections and whether each is on by default. The deal price is opt-in.
     */
    public const DEFAULT_SECTIONS = [
        'headline' => true,
        'trafficQuality' => true,
        'geo' => true,
        'decay' => true,
        'dealValue' => false,
        'links' => true,
        'audience' => true,
    ];

    public const TOKEN_LENGTH = 43;

    protected $connection = 'mongodb';

    protected $table = 'sponsor_reports';

    protected $fillable = ['owner', 'project', 'campaign', 'title', 'tokenHash', 'sections', 'expiresAt', 'revokedAt', 'viewCount', 'lastViewedAt'];

    protected $hidden = ['tokenHash', '__v'];

    protected $attributes = ['viewCount' => 0, 'expiresAt' => null, 'revokedAt' => null, 'lastViewedAt' => null];

    protected function casts(): array
    {
        return [
            'owner' => ObjectId::class,
            'project' => ObjectId::class,
            'campaign' => ObjectId::class,
            'expiresAt' => 'datetime',
            'revokedAt' => 'datetime',
            'lastViewedAt' => 'datetime',
            'viewCount' => 'integer',
        ];
    }

    /**
     * A new random share token (alphanumeric, ~256 bits).
     */
    public static function generateToken(): string
    {
        return Str::random(self::TOKEN_LENGTH);
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    /**
     * Public page URL for a token: `{app.frontend_url}/r/{token}`.
     */
    public static function shareUrl(string $token): string
    {
        return config('app.frontend_url').'/r/'.$token;
    }

    /**
     * Stored sections merged over the defaults, limited to known keys.
     *
     * @return array<string, bool>
     */
    public function resolvedSections(): array
    {
        $stored = (array) ($this->getAttributes()['sections'] ?? []);
        $sections = [];
        foreach (self::DEFAULT_SECTIONS as $section => $default) {
            $sections[$section] = (bool) ($stored[$section] ?? $default);
        }

        return $sections;
    }

    public function isRevoked(): bool
    {
        return $this->revokedAt !== null;
    }

    public function isExpired(): bool
    {
        return $this->expiresAt !== null && $this->expiresAt->isPast();
    }

    /**
     * `active`, `revoked` or `expired` (revoked wins when both apply).
     */
    public function status(): string
    {
        return match (true) {
            $this->isRevoked() => 'revoked',
            $this->isExpired() => 'expired',
            default => 'active',
        };
    }
}
