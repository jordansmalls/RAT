import { useQuery } from "@tanstack/react-query";
import { getAnalyticsOverview, getMetric } from "./api";
import type { OverviewFilter, MetricName } from "./schemas";
export function useOverview(filter: OverviewFilter) {
  return useQuery({
    queryKey: ["analytics", "overview", filter],
    queryFn: ({ signal }) => getAnalyticsOverview(filter, signal),
    placeholderData: (previousData, previousQuery) => {
      const previous = previousQuery?.queryKey[2] as OverviewFilter | undefined;
      return previous?.projectId === filter.projectId &&
        previous?.campaignId === filter.campaignId &&
        previous?.linkId === filter.linkId
        ? previousData
        : undefined;
    },
  });
}
export function useMetric<K extends MetricName>(project: string, metric: K, linkId?: string) {
  return useQuery({
    queryKey: ["analytics", project, metric, linkId],
    queryFn: ({ signal }) => getMetric(project, metric, linkId, signal),
    enabled: !!project,
  });
}
