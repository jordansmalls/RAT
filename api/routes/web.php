<?php

use App\Http\Controllers\RedirectController;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Illuminate\View\Middleware\ShareErrorsFromSession;

Route::get('/', fn () => response()->json(['name' => config('app.name')]));

// Short links (old `GET /:slug`). Single segment only, so `/api/*`, `/sanctum/*` and `/up` never match.
// No session or cookie encryption: the visitor cookie is HMAC-signed and must stay readable as-is.
Route::get('/{slug}', RedirectController::class)
    ->where('slug', '(?!(?i:api|sanctum|up)$)[^/]+')
    ->withoutMiddleware([
        EncryptCookies::class,
        AddQueuedCookiesToResponse::class,
        StartSession::class,
        ShareErrorsFromSession::class,
        PreventRequestForgery::class,
    ])->name('short-link');
