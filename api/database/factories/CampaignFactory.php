<?php

namespace Database\Factories;

use App\Models\Campaign;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Campaign> */
class CampaignFactory extends Factory
{
    public function definition(): array
    {
        return [
            'project' => Project::factory(), 'title' => fake()->sentence(3), 'url' => 'https://example.com/destination',
        ];
    }
}
