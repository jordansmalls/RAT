"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSchema, projectSchema, campaignSchema } from "../schemas";
import { useState } from "react";
import { Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useProjectStore } from "@/features/dashboard/queries";
import { apiError } from "@/features/dashboard/api";
import type { Campaign, Project } from "@/features/dashboard/types";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function DashboardCreateDrawer({
  kind,
  projectId,
  projects,
  onClose,
  onProjectCreated,
  onCampaignCreated,
}: {
  kind: "project" | "campaign";
  projectId: string;
  projects: Project[];
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
  onCampaignCreated: (campaign: Campaign) => void;
}) {
  const form = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", description: "", url: "", project: projectId || projects[0]?._id || "" },
  });
  const createProject = useProjectStore((state) => state.createProject);
  const createCampaign = useProjectStore((state) => state.createCampaign);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const [saved, setSaved] = useState<{ project: Project } | { campaign: Campaign } | null>(null);

  return (
    <Drawer
      open={open}
      onOpenChange={(open) => {
        if (!busy) setOpen(open);
      }}
      onOpenChangeComplete={(open) => {
        if (open) return;
        if (saved && "project" in saved) onProjectCreated(saved.project);
        else if (saved && "campaign" in saved) onCampaignCreated(saved.campaign);
        else onClose();
      }}
      showSwipeHandle
    >
      <DrawerContent className="t-panel-slide [--panel-translate-y:50%]" overlayClassName="t-panel-backdrop">
        <div className="mx-auto flex min-h-0 w-full max-w-lg flex-col overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>New {kind}</DrawerTitle>
            <DrawerDescription>
              {kind === "project"
                ? "Group related campaigns in a project."
                : "Add a destination URL to generate tracking links for your social platforms."}
            </DrawerDescription>
          </DrawerHeader>
          <form
            className="flex flex-col gap-6 p-4"
            onSubmit={form.handleSubmit(async (values) => {
              if (busy) return;
              const { title, description, url, project: selectedProject } = values;
              const checked =
                kind === "project"
                  ? projectSchema.safeParse({ clientName: title, description })
                  : campaignSchema.safeParse({ project_id: selectedProject, title, url });
              if (!checked.success) {
                setError(checked.error.issues[0].message);
                return;
              }
              setBusy(true);
              setError(null);
              try {
                if (kind === "project")
                  setSaved({
                    project: await createProject({
                      clientName: title,
                      description,
                    }),
                  });
                else
                  setSaved({
                    campaign: await createCampaign({
                      project_id: selectedProject,
                      title,
                      url,
                    }),
                  });
                setOpen(false);
              } catch (error) {
                setError(apiError(error, `Could not create the ${kind}. Try again.`));
              } finally {
                setBusy(false);
              }
            })}
          >
            <FieldSet disabled={busy}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="create-title">
                    {kind === "project" ? "Project name" : "Campaign name"}
                  </FieldLabel>
                  <Input
                    id="create-title"
                    {...form.register("title")}
                    required
                    autoFocus
                    placeholder={kind === "project" ? "e.g. Acme marketing" : "e.g. October newsletter"}
                  />
                </Field>
                {kind === "campaign" ? (
                  <>
                    <Controller
                      control={form.control}
                      name="project"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel id="create-project-label">Project</FieldLabel>
                          <Select
                            items={projects.map((project) => ({ value: project._id, label: project.clientName }))}
                            value={field.value}
                            onValueChange={(value) => field.onChange(value ?? "")}
                            disabled={busy}
                          >
                            <SelectTrigger
                              ref={field.ref}
                              aria-labelledby="create-project-label"
                              className="w-full"
                              onBlur={field.onBlur}
                            >
                              <SelectValue placeholder="Choose a project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((project) => (
                                <SelectItem key={project._id} value={project._id}>
                                  {project.clientName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    />
                    <Field>
                      <FieldLabel htmlFor="create-url">Destination URL</FieldLabel>
                      <Input
                        id="create-url"
                        {...form.register("url")}
                        type="url"
                        required
                        placeholder="https://example.com/launch"
                      />
                    </Field>
                  </>
                ) : (
                  <Field>
                    <FieldLabel htmlFor="create-description">Description</FieldLabel>
                    <Textarea
                      id="create-description"
                      {...form.register("description")}
                      required
                      rows={3}
                      placeholder="What is this project for?"
                    />
                  </Field>
                )}
              </FieldGroup>
            </FieldSet>
            {(error || form.formState.errors.title?.message) && (
              <FieldError>{error || form.formState.errors.title?.message}</FieldError>
            )}
            <DrawerFooter className="flex-row justify-end p-0">
              <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                <Plus />
                {busy ? `Creating ${kind}…` : `Create ${kind}`}
              </Button>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
