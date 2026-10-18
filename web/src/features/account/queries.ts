"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/lib/api";
import { authKeys, switchSessionUser } from "@/features/auth/queries";
import { accountApi } from "./api";

export const availabilityKeys = {
  all: ["availability"] as const,
  check: (field: string, value: string) => [...availabilityKeys.all, field, value] as const,
};

/**
 * Writes the updated user into the `me` cache and drops cached availability
 * results, since the user's own identifiers just changed.
 */
function useApplyUserUpdate() {
  const queryClient = useQueryClient();
  return (user: User) => {
    queryClient.setQueryData(authKeys.me(), user);
    queryClient.removeQueries({ queryKey: availabilityKeys.all });
  };
}

export function useUpdateProfile() {
  const applyUserUpdate = useApplyUserUpdate();
  return useMutation({ mutationFn: accountApi.updateProfile, onSuccess: applyUserUpdate });
}

export function useUpdateUsername() {
  const applyUserUpdate = useApplyUserUpdate();
  return useMutation({ mutationFn: accountApi.updateUsername, onSuccess: applyUserUpdate });
}

export function useUpdatePassword() {
  return useMutation({ mutationFn: accountApi.updatePassword });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountApi.deleteAccount,
    onSuccess: () => switchSessionUser(queryClient, null),
  });
}
