import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/features/auth/queries";
import { saveSocials } from "./api";
export function useSaveSocials() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: saveSocials,
    onSuccess: (user) => {
      client.setQueryData(authKeys.me(), user);
    },
  });
}
