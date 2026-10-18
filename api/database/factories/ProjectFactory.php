<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Project> */
class ProjectFactory extends Factory
{
    public function definition(): array
    {
        return [
            'owner' => User::factory(), 'clientName' => fake()->company(), 'description' => fake()->sentence(),
        ];
    }
}
