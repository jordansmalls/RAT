"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/features/dashboard/queries";
import * as api from "./api";
import type { DealInput, ReportSections } from "./schemas";

/** Sponsor metrics live under `analytics` so existing click mutations invalidate them too. */
export const sponsorKeys = {
  metric: (project: string, metric: string, scope: api.Scope, extra?: unknown) =>
    ["analytics", project, "sponsor", metric, scope.campaignId ?? null, scope.linkId ?? null, extra ?? null] as const,
  dealValue: (campaign: string) => ["analytics", "deal-value", campaign] as const,
  reports: (campaign: string) => ["sponsor-reports", campaign] as const,
  preview: (report: string) => ["sponsor-reports", "preview", report] as const,
  publicReport: (token: string) => ["public-report", token] as const,
};

export function useGeoValue(project: string, scope: api.Scope) {
  return useQuery({
    queryKey: sponsorKeys.metric(project, "geo-value", scope),
    queryFn: ({ signal }) => api.getGeoValue(project, scope, signal),
    enabled: !!project,
  });
}

export function useDecayCurve(project: string, scope: api.Scope, days: number) {
  return useQuery({
    queryKey: sponsorKeys.metric(project, "decay", scope, days),
    queryFn: ({ signal }) => api.getDecayCurve(project, scope, days, signal),
    enabled: !!project,
  });
}

export function useTrafficQuality(project: string, scope: api.Scope) {
  return useQuery({
    queryKey: sponsorKeys.metric(project, "traffic-quality", scope),
    queryFn: ({ signal }) => api.getTrafficQuality(project, scope, signal),
    enabled: !!project,
  });
}

export function useDealValue(campaign: string, enabled: boolean) {
  return useQuery({
    queryKey: sponsorKeys.dealValue(campaign),
    queryFn: ({ signal }) => api.getDealValue(campaign, signal),
    enabled: !!campaign && enabled,
  });
}

function useDealInvalidation(campaign: string) {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: dashboardKeys.campaign(campaign) });
    void client.invalidateQueries({ queryKey: sponsorKeys.dealValue(campaign) });
    void client.invalidateQueries({ queryKey: ["sponsor-reports", "preview"] });
  };
}

export function useSaveDeal(campaign: string) {
  const invalidate = useDealInvalidation(campaign);
  return useMutation({ mutationFn: (body: DealInput) => api.saveDeal(campaign, body), onSuccess: invalidate });
}

export function useDeleteDeal(campaign: string) {
  const client = useQueryClient();
  const invalidate = useDealInvalidation(campaign);
  return useMutation({
    mutationFn: () => api.deleteDeal(campaign),
    onSuccess: () => {
      client.removeQueries({ queryKey: sponsorKeys.dealValue(campaign) });
      invalidate();
    },
  });
}

export function useSponsorReports(campaign: string) {
  return useQuery({
    queryKey: sponsorKeys.reports(campaign),
    queryFn: ({ signal }) => api.getSponsorReports(campaign, signal),
    enabled: !!campaign,
  });
}

export function useCreateSponsorReport(campaign: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { title?: string; sections?: ReportSections; expires_at?: string | null }) =>
      api.createSponsorReport({ campaign_id: campaign, ...body }),
    onSuccess: () => void client.invalidateQueries({ queryKey: sponsorKeys.reports(campaign) }),
  });
}

export function useUpdateSponsorReport(campaign: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: api.ReportUpdate }) => api.updateSponsorReport(id, body),
    onSuccess: (report) => {
      void client.invalidateQueries({ queryKey: sponsorKeys.reports(campaign) });
      void client.invalidateQueries({ queryKey: sponsorKeys.preview(report._id) });
    },
  });
}

export function useDeleteSponsorReport(campaign: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSponsorReport(id),
    onSuccess: (_, id) => {
      client.removeQueries({ queryKey: sponsorKeys.preview(id) });
      void client.invalidateQueries({ queryKey: sponsorKeys.reports(campaign) });
    },
  });
}

export function useSponsorReportPreview(report: string | null) {
  return useQuery({
    queryKey: sponsorKeys.preview(report ?? ""),
    queryFn: ({ signal }) => api.previewSponsorReport(report!, signal),
    enabled: !!report,
  });
}

export function usePublicReport(token: string) {
  return useQuery({
    queryKey: sponsorKeys.publicReport(token),
    queryFn: ({ signal }) => api.getPublicReport(token, signal),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
}
