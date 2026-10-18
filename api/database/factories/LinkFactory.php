<?php

namespace Database\Factories;

use App\Models\Campaign;
use App\Models\Link;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Link> */
class LinkFactory extends Factory
{
    public function definition(): array
    {
        return [
            'campaign' => Campaign::factory(),
            'project' => fn (array $attributes) => Campaign::find($attributes['campaign'])->project,
            'title' => 'youtube', 'platform' => 'youtube',
            'slug' => fake()->unique()->regexify('[a-z0-9]{8}'),
            'destinationUrl' => 'https://example.com/destination',
            'customUrl' => fn (array $attributes) => rtrim(config('rat.base_url'), '/').'/'.$attributes['slug'],
            'isActive' => true, 'clickCount' => 0,
        ];
    }
}
