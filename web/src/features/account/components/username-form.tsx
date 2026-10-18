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
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/features/auth/schemas";
import { applyServerErrors } from "@/lib/forms";
import { useUpdateUsername } from "../queries";
import { usernameFormSchema, type UsernameInput } from "../schemas";
import { useAvailability } from "../use-availability";

type UsernameFormProps = {
  currentUsername: string | null;
  submitLabel?: string;
  autoFocus?: boolean;
  /** Stretch the submit button, as in the onboarding card. */
  fullWidth?: boolean;
};

/**
 * Used for onboarding (first username) and in settings (changing it).
 */
export function UsernameForm({
  currentUsername,
  submitLabel = "Save username",
  autoFocus,
  fullWidth,
}: UsernameFormProps) {
  const updateUsername = useUpdateUsername();
  const form = useForm<z.input<typeof usernameFormSchema>, unknown, UsernameInput>({
    resolver: zodResolver(usernameFormSchema),
    defaultValues: { username: currentUsername ?? "" },
  });

  const username = useWatch({ control: form.control, name: "username" });
  const isUnchanged = currentUsername !== null && username.trim().toLowerCase() === currentUsername;
  const availability = useAvailability("username", username, { enabled: !isUnchanged });

  const onSubmit = form.handleSubmit((values) =>
    updateUsername
      .mutateAsync(values)
      .then((user) => {
        form.reset({ username: user.username ?? "" });
        if (currentUsername) toast.success("Username updated.");
      })
      .catch((error) => applyServerErrors(form, error)),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormError message={form.formState.errors.root?.server?.message} />
        <TextField
          control={form.control}
          name="username"
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={USERNAME_MAX_LENGTH}
          autoFocus={autoFocus}
          description={`${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} characters: letters, numbers and underscores.`}
          hint={<AvailabilityHint status={availability} />}
        />
        <SubmitButton
          pending={form.formState.isSubmitting}
          disabled={isUnchanged || availability.state === "unavailable"}
          className={fullWidth ? "w-full" : "w-full sm:w-auto sm:self-start"}
        >
          {submitLabel}
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
