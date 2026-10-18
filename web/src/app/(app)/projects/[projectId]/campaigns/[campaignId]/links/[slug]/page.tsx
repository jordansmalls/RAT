import { redirect } from "next/navigation";
import { dashboardHref } from "@/features/dashboard/dashboard";

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; campaignId: string; slug: string }>;
}) {
  const { projectId, campaignId, slug } = await params;
  redirect(dashboardHref(projectId, campaignId, "campaigns", slug));
}
