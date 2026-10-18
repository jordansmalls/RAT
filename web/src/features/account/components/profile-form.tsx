"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { AvailabilityHint } from "@/components/forms/availability-hint";
import { FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import type { User } from "@/lib/api";
import { applyServerErrors } from "@/lib/forms";
import { useUpdateProfile } from "../queries";
import { profileSchema, type ProfileInput } from "../schemas";
import { useAvailability } from "../use-availability";

export function ProfileForm({ user }: { user: User }) {
  const updateProfile = useUpdateProfile();
  const form = useForm<z.input<typeof profileSchema>, unknown, ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name ?? "", email: user.email },
  });

  const email = useWatch({ control: form.control, name: "email" });
  const emailChanged = email.trim().toLowerCase() !== user.email;
  const emailAvailability = useAvailability("email", email, { enabled: emailChanged });

  const onSubmit = form.handleSubmit((values) =>
    updateProfile
      .mutateAsync(values)
      .then((updated) => {
        form.reset({ name: updated.name ?? "", email: updated.email });
        toast.success(
          updated.email !== user.email
            ? "Profile updated. Check your inbox to verify your new email."
            : "Profile updated.",
        );
      })
      .catch((error) => applyServerErrors(form, error)),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormError message={form.formState.errors.root?.server?.message} />
        <TextField control={form.control} name="name" label="Name" autoComplete="name" />
        <TextField
          control={form.control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          description={emailChanged ? "You'll need to verify your new email address." : undefined}
          hint={<AvailabilityHint status={emailAvailability} taken="An account with this email already exists." />}
        />
        <SubmitButton
          pending={form.formState.isSubmitting}
          disabled={!form.formState.isDirty || emailAvailability.state === "unavailable"}
          className="w-full sm:w-auto sm:self-start"
        >
          Save profile
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
