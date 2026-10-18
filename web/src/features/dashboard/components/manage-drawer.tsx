"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { manageSchema, destinationSchema } from "../schemas";
import { useState } from "react";
import { Trash2 } from "@/components/icons";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ManageDrawer({
  entity,
  onClose,
  onDeleted,
}: {
  entity: { kind: "project"; value: Project } | { kind: "campaign"; value: Campaign };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const store = useProjectStore();
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const name = entity.kind === "project" ? entity.value.clientName : entity.value.title;
  const form = useForm({
    resolver: zodResolver(manageSchema),
    defaultValues: { title: name, detail: entity.kind === "project" ? entity.value.description : entity.value.url },
  });
  return (
    <Drawer
      open={open}
      onOpenChange={(value) => {
        if (!busy) setOpen(value);
      }}
      onOpenChangeComplete={(value) => {
        if (!value) {
          if (deleted) onDeleted();
          else onClose();
        }
      }}
      showSwipeHandle
    >
      <DrawerContent className="t-panel-slide [--panel-translate-y:50%]" overlayClassName="t-panel-backdrop">
        <div className="mx-auto flex min-h-0 w-full max-w-lg flex-col overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>
              {confirmDelete ? "Delete" : "Edit"} {entity.kind}
            </DrawerTitle>
            <DrawerDescription>
              {confirmDelete
                ? `Delete ${name} and its ${entity.kind === "project" ? "campaigns, " : ""}links and click history? This cannot be undone.`
                : `Update ${name}.`}
            </DrawerDescription>
          </DrawerHeader>
          {confirmDelete ? (
            <DrawerFooter className="flex-row justify-end p-4">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setConfirmDelete(false);
                  setError("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    if (entity.kind === "project") await store.deleteProject(entity.value._id);
                    else await store.deleteCampaign(entity.value._id);
                    setDeleted(true);
                    setOpen(false);
                  } catch (error) {
                    setError(apiError(error, `Could not delete the ${entity.kind}.`));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Deleting…" : `Delete ${entity.kind}`}
              </Button>
            </DrawerFooter>
          ) : (
            <form
              className="flex flex-col gap-6 p-4"
              onSubmit={form.handleSubmit(async ({ title, detail }) => {
                if (busy) return;
                if (entity.kind === "campaign" && !destinationSchema.safeParse(detail).success) {
                  setError("Enter an http:// or https:// URL.");
                  return;
                }
                setBusy(true);
                setError("");
                try {
                  if (entity.kind === "project")
                    await store.updateProject(entity.value._id, {
                      clientName: title,
                      description: detail,
                    });
                  else
                    await store.updateCampaign(entity.value._id, {
                      title,
                      url: detail,
                    });
                  setOpen(false);
                } catch (error) {
                  setError(apiError(error, `Could not update the ${entity.kind}.`));
                } finally {
                  setBusy(false);
                }
              })}
            >
              <FieldSet disabled={busy}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="manage-title">Name</FieldLabel>
                    <Input id="manage-title" {...form.register("title")} defaultValue={name} required autoFocus />
                  </Field>
                  {entity.kind === "project" ? (
                    <Field>
                      <FieldLabel htmlFor="manage-detail">Description</FieldLabel>
                      <Textarea
                        id="manage-detail"
                        {...form.register("detail")}
                        defaultValue={entity.value.description}
                        rows={3}
                        required
                      />
                    </Field>
                  ) : (
                    <Field>
                      <FieldLabel htmlFor="manage-detail">Destination URL</FieldLabel>
                      <Input
                        id="manage-detail"
                        {...form.register("detail")}
                        type="url"
                        defaultValue={entity.value.url}
                        aria-describedby="campaign-destination-help"
                        required
                      />
                      <FieldDescription id="campaign-destination-help">
                        Existing tracking links will use the updated destination.
                      </FieldDescription>
                    </Field>
                  )}
                </FieldGroup>
              </FieldSet>
              <DrawerFooter className="flex-row justify-end p-0">
                <Button
                  type="button"
                  variant="destructive"
                  className="mr-auto"
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 />
                  Delete
                </Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </Button>
              </DrawerFooter>
            </form>
          )}
          {(error || form.formState.errors.title?.message || form.formState.errors.detail?.message) && (
            <FieldError className="px-4 pb-4">
              {error || form.formState.errors.title?.message || form.formState.errors.detail?.message}
            </FieldError>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
