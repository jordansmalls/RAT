import { redirect } from "next/navigation";
import { dashboardHref } from "@/features/dashboard/dashboard";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(dashboardHref(projectId));
}
