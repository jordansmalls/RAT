import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSocialCounts, refreshSocialCounts } from "./api";
export const socialKeys = { counts: ["socials", "counts"] as const };
export function useSocialCounts() {
  return useQuery({
    queryKey: socialKeys.counts,
    queryFn: ({ signal }) => getSocialCounts(signal),
    refetchInterval: 15 * 60 * 1000,
  });
}
export function useRefreshSocialCounts() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: refreshSocialCounts,
    onSuccess: (data) => client.setQueryData(socialKeys.counts, data),
  });
}
