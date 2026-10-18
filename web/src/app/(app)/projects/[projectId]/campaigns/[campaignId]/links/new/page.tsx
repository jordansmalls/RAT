import { redirect } from "next/navigation";
import { dashboardHref } from "@/features/dashboard/dashboard";

export default async function Page({ params }: { params: Promise<{ projectId: string; campaignId: string }> }) {
  const { projectId, campaignId } = await params;
  redirect(dashboardHref(projectId, campaignId) + "&create=link");
}
