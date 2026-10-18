export const routes = {
  home: "/",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  onboarding: "/onboarding/username",
  socials: "/onboarding/socials",
  dashboard: "/dashboard",
  settings: "/dashboard?view=settings",
} as const;

/**
 * Only allow same-site relative paths as post-login redirects (prevents open redirects).
 */
export function safeRedirectPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return null;
  }
  return path;
}
