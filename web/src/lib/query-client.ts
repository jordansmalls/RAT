import { isServer, MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/lib/api";
import { authKeys } from "@/features/auth/queries";

function makeQueryClient(): QueryClient {
  // A 401 anywhere means the session ended (expired, signed out elsewhere, password
  // changed). Mark the user as signed out so auth guards redirect to the login page.
  // A 403 from the `onboarded` middleware means the server thinks onboarding is
  // unfinished (ownership failures are 404s), so re-read `me` and let the guard redirect.
  const handleUnauthenticated = (error: unknown) => {
    if (isApiError(error) && error.isUnauthenticated) {
      queryClient.setQueryData(authKeys.me(), null);
    } else if (isApiError(error) && error.status === 403) {
      void queryClient.invalidateQueries({ queryKey: authKeys.me() });
    }
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handleUnauthenticated }),
    mutationCache: new MutationCache({ onError: handleUnauthenticated }),
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        // Client errors (4xx) won't succeed on retry; network and 5xx errors might.
        retry: (failureCount, error) => (isApiError(error) && error.status < 500 ? false : failureCount < 2),
      },
      mutations: {
        retry: false,
      },
    },
  });

  return queryClient;
}

let browserQueryClient: QueryClient | undefined;

/**
 * A fresh client per server render, and one shared client in the browser.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
