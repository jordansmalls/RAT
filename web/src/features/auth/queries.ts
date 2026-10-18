"use client";

import { queryOptions, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { User } from "@/lib/api";
import { authApi } from "./api";

export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
};

export const meQueryOptions = queryOptions({
  queryKey: authKeys.me(),
  queryFn: ({ signal }) => authApi.me(signal),
  staleTime: 5 * 60 * 1000,
});

/**
 * The signed-in user. `data` is `null` for guests and `undefined` while loading.
 */
export function useMe() {
  return useQuery(meQueryOptions);
}

/**
 * Like `useMe`, for components rendered inside an `AuthGuard` that requires a user.
 */
export function useUser(): User {
  const { data } = useMe();
  if (!data) {
    throw new Error("useUser() must be used inside an <AuthGuard> that requires a signed-in user.");
  }
  return data;
}

/**
 * Switch the cached session to a different user (or to signed out) and drop every
 * other cached query so no data leaks between accounts.
 *
 * `me` is updated in place rather than cleared: <AuthGuard> observes that query,
 * and removing it would detach the observer so the guard never sees the change.
 */
export function switchSessionUser(queryClient: QueryClient, user: User | null): void {
  queryClient.setQueryData(authKeys.me(), user);
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authKeys.all[0] });
}

function useSetSignedInUser() {
  const queryClient = useQueryClient();
  return (user: User) => switchSessionUser(queryClient, user);
}

export function useLogin() {
  const setSignedInUser = useSetSignedInUser();
  return useMutation({ mutationFn: authApi.login, onSuccess: setSignedInUser });
}

export function useRegister() {
  const setSignedInUser = useSetSignedInUser();
  return useMutation({ mutationFn: authApi.register, onSuccess: setSignedInUser });
}

/**
 * Clears all cached data whether or not the request succeeds, so the UI always ends signed out.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => switchSessionUser(queryClient, null),
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword });
}

export function useResendVerificationEmail() {
  return useMutation({ mutationFn: authApi.resendVerificationEmail });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, hash, signedQuery }: { id: string; hash: string; signedQuery: string }) =>
      authApi.verifyEmail(id, hash, signedQuery),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me() }),
  });
}
