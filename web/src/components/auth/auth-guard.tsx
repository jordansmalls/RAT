"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { FullPageSpinner } from "@/components/full-page-spinner";
import { Button } from "@/components/ui/button";
import { useMe } from "@/features/auth/queries";
import type { User } from "@/lib/api";
import { routes, safeRedirectPath } from "@/lib/routes";

/**
 * - `guest`: signed-out users only (login, register…)
 * - `onboarding`: signed in, but no username yet
 * - `user`: signed in with a username (the app itself)
 */
export type AuthRequirement = "guest" | "onboarding" | "user";

export function redirectFor(
  requirement: AuthRequirement,
  user: User | null,
  pathname: string,
  next?: string | null,
): string | null {
  // `pathname` may carry a query string so deep links survive the trip through sign in.
  if (!user) return requirement === "guest" ? null : `${routes.login}?next=${encodeURIComponent(pathname)}`;
  const path = pathname.split("?")[0];
  const step = user.onboarding_step;
  if (step !== "complete") {
    const destination = step === "username" ? routes.onboarding : routes.socials;
    return path === destination && requirement === "onboarding" ? null : destination;
  }
  if (requirement === "onboarding") return routes.dashboard;
  if (requirement === "guest") {
    const target = safeRedirectPath(next);
    return target &&
      !["/login", "/register", "/forgot-password", "/reset-password", "/onboarding"].some((path) =>
        target.split("?")[0].startsWith(path),
      )
      ? target
      : routes.dashboard;
  }
  return null;
}

/**
 * Client-side route protection driven by the `me` query. All auth redirects
 * happen here, so signing in, signing out, finishing onboarding or a session
 * expiring automatically sends the user to the right place.
 *
 * This is a UX layer only: the API enforces auth on every request.
 */
export function AuthGuard({ requirement, children }: { requirement: AuthRequirement; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, isPending, isError, refetch, isRefetching } = useMe();

  const search = typeof window === "undefined" ? "" : window.location.search;
  const target =
    isPending || isError
      ? null
      : redirectFor(requirement, user, `${pathname}${search}`, new URLSearchParams(search).get("next"));

  useEffect(() => {
    if (target) router.replace(target);
  }, [router, target]);

  if (isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
        <p className="text-sm text-muted-foreground">We couldn&apos;t reach the server.</p>
        <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
          Try again
        </Button>
      </div>
    );
  }

  if (isPending || target) return <FullPageSpinner />;

  return children;
}
