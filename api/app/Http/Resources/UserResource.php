<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    public function withResponse(Request $request, JsonResponse $response): void
    {
        $response->setStatusCode(200);
    }

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->resource->getAttributes()['name'] ?? null,
            'username' => $this->username,
            'email' => $this->email,
            'email_verified_at' => $this->timestamp('email_verified_at'),
            'onboarding_step' => $this->resource->computedOnboardingStep(),
            'socials' => RatResource::serialize($this->resource->socialProfiles()),
            'created_at' => $this->timestamp('createdAt'),
            'updated_at' => $this->timestamp('updatedAt'),
        ];
    }

    /**
     * Read an optional date. Older documents may lack it, and strict mode forbids reading missing attributes.
     */
    private function timestamp(string $attribute): ?string
    {
        return isset($this->resource->getAttributes()[$attribute]) ? $this->resource->{$attribute}?->toISOString() : null;
    }
}
