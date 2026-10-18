<?php

namespace Database\Factories;

use App\Models\Campaign;
use App\Models\Project;
use App\Models\SponsorReport;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<SponsorReport> */
class SponsorReportFactory extends Factory
{
    public function definition(): array
    {
        return [
            'campaign' => Campaign::factory(),
            'project' => fn (array $attributes) => Campaign::find($attributes['campaign'])->project,
            'owner' => fn (array $attributes) => Project::find($attributes['project'])->owner,
            'title' => fake()->sentence(3),
            'tokenHash' => SponsorReport::hashToken(SponsorReport::generateToken()),
            'sections' => SponsorReport::DEFAULT_SECTIONS,
            'viewCount' => 0,
        ];
    }

    /**
     * Use a known plaintext token, so tests can open the public page.
     */
    public function withToken(string $token): static
    {
        return $this->state(fn () => ['tokenHash' => SponsorReport::hashToken($token)]);
    }

    public function revoked(): static
    {
        return $this->state(fn () => ['revokedAt' => now()->subMinute()]);
    }

    public function expired(): static
    {
        return $this->state(fn () => ['expiresAt' => now()->subMinute()]);
    }

    /**
     * @param  array<string, bool>  $sections
     */
    public function sections(array $sections): static
    {
        return $this->state(fn () => ['sections' => [...SponsorReport::DEFAULT_SECTIONS, ...$sections]]);
    }
}
