<?php

use App\Http\Controllers\Api\V1\Account\PasswordController;
use App\Http\Controllers\Api\V1\Account\ProfileController;
use App\Http\Controllers\Api\V1\Account\UsernameController;
use App\Http\Controllers\Api\V1\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Api\V1\Auth\NewPasswordController;
use App\Http\Controllers\Api\V1\Auth\PasswordResetLinkController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\SessionController;
use App\Http\Controllers\Api\V1\Auth\VerifyEmailController;
use App\Http\Controllers\Api\V1\AvailabilityController;
use App\Http\Controllers\Api\V1\CampaignController;
use App\Http\Controllers\Api\V1\CampaignDealController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\PublicSponsorReportController;
use App\Http\Controllers\Api\V1\SocialController;
use App\Http\Controllers\Api\V1\SponsorReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('v1.')->group(function () {
    Route::prefix('auth')->name('auth.')->group(function () {
        Route::middleware('throttle:auth')->group(function () {
            Route::post('register', RegisterController::class)->name('register');
            Route::post('login', [SessionController::class, 'store'])->name('login');
            Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])->name('password.email');
            Route::post('reset-password', [NewPasswordController::class, 'store'])->name('password.store');
        });

        Route::post('logout', [SessionController::class, 'destroy'])->name('logout');

        Route::post('email/verify/{id}/{hash}', VerifyEmailController::class)
            ->middleware(['signed:relative', 'throttle:verification'])
            ->name('verification.verify');

        Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
            ->middleware(['auth:sanctum', 'throttle:verification'])
            ->name('verification.send');
    });

    Route::prefix('availability')->name('availability.')->middleware('throttle:availability')->group(function () {
        Route::get('email', [AvailabilityController::class, 'email'])->name('email');
        Route::get('username', [AvailabilityController::class, 'username'])->name('username');
    });

    // Public, unauthenticated sponsor report pages (shared by token).
    Route::get('public/reports/{token}', PublicSponsorReportController::class)
        ->middleware('throttle:60,1')
        ->name('public.reports.show');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [ProfileController::class, 'show'])->name('me.show');
        Route::patch('me', [ProfileController::class, 'update'])->name('me.update');
        Route::delete('me', [ProfileController::class, 'destroy'])->name('me.destroy');
        Route::put('me/username', [UsernameController::class, 'update'])->name('me.username.update');
        Route::put('me/password', [PasswordController::class, 'update'])->name('me.password.update');

        Route::put('onboarding/socials', [SocialController::class, 'save'])->name('onboarding.socials');

        // Routes for users who have finished onboarding.
        Route::middleware('onboarded')->group(function () {
            Route::apiResource('projects', ProjectController::class);
            Route::get('projects/{project}/campaigns', [ProjectController::class, 'campaigns'])->name('projects.campaigns');

            Route::post('campaigns/manual', [CampaignController::class, 'manual'])->name('campaigns.manual');
            Route::apiResource('campaigns', CampaignController::class);
            Route::get('campaigns/{campaign}/links', [CampaignController::class, 'links'])->name('campaigns.links');
            Route::get('campaigns/{campaign}/performance', [CampaignController::class, 'performance'])->name('campaigns.performance');
            Route::put('campaigns/{campaign}/deal', [CampaignDealController::class, 'update'])->name('campaigns.deal.update');
            Route::delete('campaigns/{campaign}/deal', [CampaignDealController::class, 'destroy'])->name('campaigns.deal.destroy');

            Route::get('sponsor-reports', [SponsorReportController::class, 'index'])->name('sponsor-reports.index');
            Route::post('sponsor-reports', [SponsorReportController::class, 'store'])->name('sponsor-reports.store');
            Route::get('sponsor-reports/{report}', [SponsorReportController::class, 'show'])->name('sponsor-reports.show');
            Route::patch('sponsor-reports/{report}', [SponsorReportController::class, 'update'])->name('sponsor-reports.update');
            Route::delete('sponsor-reports/{report}', [SponsorReportController::class, 'destroy'])->name('sponsor-reports.destroy');

            Route::get('socials/counts', [SocialController::class, 'index'])->name('socials.counts');
            Route::post('socials/refresh', [SocialController::class, 'refresh'])->name('socials.refresh');

            require __DIR__.'/api/analytics.php';
        });
    });
});
