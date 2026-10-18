<?php

namespace App\Services;

use Illuminate\Http\Request;

class VisitorIdentity
{
    public function resolve(Request $request, string $projectId): array
    {
        $secret = config('rat.visitor.secret');
        $name = config('rat.visitor.cookie_name');
        if (! config('rat.visitor.enabled') || ! is_string($secret) || strlen($secret) < 32
            || ! is_string($name) || $name === '' || in_array($name, [config('session.cookie'), 'XSRF-TOKEN'], true)
            || config('rat.visitor.cookie_max_age_days') <= 0) {
            return ['visitorId' => null, 'visitorVersion' => null, 'cookieValue' => null];
        }
        $token = $this->parse($request->cookie($name), $secret);
        $cookie = null;
        if ($token === null) {
            $token = $this->base64url(random_bytes(32));
            $cookie = 'v1.'.$token.'.'.$this->signature($token, $secret);
        }

        return [
            'visitorId' => hash_hmac('sha256', 'rat-visitor-id-v1|v1|'.$projectId.'|'.$token, $secret),
            'visitorVersion' => 1,
            'cookieValue' => $cookie,
        ];
    }

    public function parse(mixed $value, string $secret): ?string
    {
        if (! is_string($value) || strlen($value) > 512 || strlen($secret) < 32) {
            return null;
        }
        $parts = explode('.', $value);
        if (count($parts) !== 3 || $parts[0] !== 'v1' || ! preg_match('/^[A-Za-z0-9_-]{32,64}$/', $parts[1])) {
            return null;
        }

        return hash_equals($this->signature($parts[1], $secret), $parts[2]) ? $parts[1] : null;
    }

    private function signature(string $token, string $secret): string
    {
        return $this->base64url(hash_hmac('sha256', 'rat-visitor-cookie-v1|v1|'.$token, $secret, true));
    }

    private function base64url(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
