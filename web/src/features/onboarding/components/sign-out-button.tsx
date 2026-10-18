"use client";

import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/queries";

/** Lets someone leave onboarding. The guard redirects once `me` is cleared. */
export function SignOutButton({ disabled }: { disabled?: boolean }) {
  const logout = useLogout();
  return (
    <Button
      variant="outline"
      type="button"
      className="w-full"
      disabled={disabled || logout.isPending}
      onClick={() => logout.mutate()}
    >
      Sign out
    </Button>
  );
}
