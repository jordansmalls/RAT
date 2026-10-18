<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks users who have not finished onboarding (username and socials).
 * Apply with the `onboarded` alias to routes that need a complete profile.
 */
class EnsureUsernameIsSet
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->computedOnboardingStep() !== 'complete') {
            return response()->json([
                'message' => 'You must complete onboarding before continuing.',
            ], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
