<?php

namespace App\Providers;

use App\Models\PersonalAccessToken;
use App\Models\User;
use App\Services\MongoUserProvider;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\DevCommands;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Email;
use Illuminate\Validation\Rules\Password;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Auth::provider('rat-mongodb', fn ($app, array $config) => new MongoUserProvider($app['hash'], $config['model']));

        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

        $this->configureDefaults();
        $this->configureValidation();
        $this->configureRateLimiting();
        $this->configureAuthLinks();
        $this->configureDevCommands();
    }

    /**
     * Configure strict, production-safe framework defaults.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        Model::shouldBeStrict(! $this->app->isProduction());

        DB::prohibitDestructiveCommands($this->app->isProduction());
    }

    /**
     * Configure the default email and password validation rules.
     */
    protected function configureValidation(): void
    {
        Email::defaults(fn () => (new Email)
            ->rfcCompliant(strict: true)
            ->withNativeValidation()
            ->preventSpoofing());

        Password::defaults(fn () => $this->app->isProduction()
            ? Password::min(8)->max(255)->uncompromised()
            : Password::min(8)->max(255));
    }

    /**
     * Configure the named rate limiters used by the API routes.
     */
    protected function configureRateLimiting(): void
    {
        $byUserOrIp = fn (Request $request): string => (string) ($request->user()?->id ?: $request->ip());

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by($byUserOrIp($request)));

        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        RateLimiter::for('availability', fn (Request $request) => Limit::perMinute(60)->by($byUserOrIp($request)));

        RateLimiter::for('verification', fn (Request $request) => Limit::perMinute(6)->by($byUserOrIp($request)));
    }

    /**
     * Point password reset and email verification links at the frontend.
     */
    protected function configureAuthLinks(): void
    {
        ResetPassword::createUrlUsing(function (User $user, string $token): string {
            return config('app.frontend_url').'/reset-password?'.http_build_query([
                'token' => $token,
                'email' => $user->getEmailForPasswordReset(),
            ]);
        });

        VerifyEmail::createUrlUsing(function (User $user): string {
            $id = $user->getKey();
            $hash = sha1($user->getEmailForVerification());

            $signedApiPath = URL::temporarySignedRoute(
                'v1.auth.verification.verify',
                now()->addMinutes(config('auth.verification.expire', 60)),
                ['id' => $id, 'hash' => $hash],
                absolute: false,
            );

            return config('app.frontend_url')."/verify-email/{$id}/{$hash}?".parse_url($signedApiPath, PHP_URL_QUERY);
        });
    }

    /**
     * Run the Next.js dev server alongside the API with `composer dev`.
     */
    protected function configureDevCommands(): void
    {
        if (is_dir(base_path('../web'))) {
            DevCommands::register('pnpm --dir ../web dev', 'web');
        }
    }
}
