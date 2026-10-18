<?php

namespace App\Http\Requests;

use App\Services\SocialCountProviders;
use Closure;
use UnexpectedValueException;

class SaveSocialsRequest extends RatRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasUsername();
    }

    protected function prepareForValidation(): void
    {
        $original = $this->isJson() ? json_decode($this->getContent(), true) : [];
        foreach (['twitter', 'twitch'] as $platform) {
            if (is_array($original) && array_key_exists($platform, $original) && is_string($original[$platform]) && trim($original[$platform]) === '') {
                $this->merge([$platform => '']);
            }
        }
    }

    public function rules(SocialCountProviders $providers): array
    {
        $rules = [];
        foreach (['youtube', 'instagram', 'twitter', 'twitch'] as $platform) {
            $rules[$platform] = [in_array($platform, ['youtube', 'instagram'], true) ? 'required' : 'sometimes',
                'string', 'max:100', function (string $attribute, mixed $value, Closure $fail) use ($providers, $platform): void {
                    if (! is_string($value) || trim($value) === '') {
                        return;
                    }
                    try {
                        $providers->normalize($platform, $value);
                    } catch (UnexpectedValueException $error) {
                        $fail($error->getMessage());
                    }
                }];
        }

        return $rules;
    }
}
