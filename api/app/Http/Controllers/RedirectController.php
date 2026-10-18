<?php

namespace App\Http\Controllers;

use App\Models\Link;
use App\Services\RedirectTracking;
use App\Services\VisitorIdentity;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

class RedirectController extends Controller
{
    public function __invoke(Request $request, string $slug, VisitorIdentity $visitors, RedirectTracking $tracking): RedirectResponse
    {
        $link = Link::where('slug', strtolower(trim($slug)))->where('isActive', true)->first();
        if ($link === null) {
            return redirect()->away(config('rat.frontend_url'));
        }
        $identity = $visitors->resolve($request, $link->project);
        $response = redirect()->away($link->destinationUrl);
        if ($identity['cookieValue'] !== null) {
            $response->withCookie(new Cookie(
                name: config('rat.visitor.cookie_name'), value: $identity['cookieValue'],
                expire: now()->addSeconds((int) (config('rat.visitor.cookie_max_age_days') * 86400)),
                path: '/', domain: null, secure: app()->isProduction(), httpOnly: true, sameSite: 'lax',
            ));
        }
        defer(fn () => $tracking->record($link, $request, $identity));

        return $response;
    }
}
