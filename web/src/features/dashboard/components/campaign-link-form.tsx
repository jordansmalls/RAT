"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { linkSchema } from "../schemas";
import { useState } from "react";
import { useProjectStore } from "@/features/dashboard/queries";
import { apiError } from "@/features/dashboard/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CampaignLinkForm({
  projectId,
  campaignId,
  onCancel,
  onSuccess,
}: {
  projectId: string;
  campaignId: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const form = useForm({
    resolver: zodResolver(linkSchema),
    defaultValues: { project_id: projectId, campaign_id: campaignId, title: "" },
  });
  const createLink = useProjectStore((state) => state.createLink);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-4 rounded-xl border bg-card p-5"
      onSubmit={form.handleSubmit(async ({ title }) => {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
          await createLink({
            project_id: projectId,
            campaign_id: campaignId,
            title,
          });
          onSuccess();
        } catch (error) {
          setError(apiError(error, "Could not create the link. Try again."));
        } finally {
          setBusy(false);
        }
      })}
    >
      <label className="flex flex-col gap-2 text-sm">
        Tracking link name
        <Input {...form.register("title")} placeholder="e.g. September newsletter" required autoFocus disabled={busy} />
      </label>
      <p className="text-xs text-muted-foreground">The link will use this campaign&apos;s destination URL.</p>
      {(error || form.formState.errors.title?.message) && (
        <p role="alert" className="text-sm text-destructive">
          {error || form.formState.errors.title?.message}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Creating link…" : "Create tracking link"}
        </Button>
      </div>
    </form>
  );
}
