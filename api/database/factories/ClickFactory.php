<?php

namespace Database\Factories;

use App\Models\Click;
use App\Models\Link;
use App\Services\ClickDates;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Click> */
class ClickFactory extends Factory
{
    public function definition(): array
    {
        return [
            'link' => Link::factory(),
            'campaign' => fn (array $attributes) => Link::find($attributes['link'])->campaign,
            'project' => fn (array $attributes) => Link::find($attributes['link'])->project,
            'destinationUrl' => 'https://example.com/destination',
            'clickedAt' => now(), 'dayOfWeek' => now()->dayOfWeek, 'hourOfDay' => now()->hour,
            'fullDateClicked' => ClickDates::fullDateClicked(now()), 'isBot' => false,
        ];
    }
}
