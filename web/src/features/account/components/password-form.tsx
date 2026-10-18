"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { PASSWORD_MIN_LENGTH } from "@/features/auth/schemas";
import { applyServerErrors } from "@/lib/forms";
import { useUpdatePassword } from "../queries";
import { updatePasswordSchema, type UpdatePasswordInput } from "../schemas";

const emptyValues = { current_password: "", password: "", password_confirmation: "" };

export function PasswordForm() {
  const updatePassword = useUpdatePassword();
  const form = useForm<z.input<typeof updatePasswordSchema>, unknown, UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: emptyValues,
  });

  const onSubmit = form.handleSubmit((values) =>
    updatePassword
      .mutateAsync(values)
      .then(() => {
        form.reset(emptyValues);
        toast.success("Password updated. Your other sessions have been signed out.");
      })
      .catch((error) => applyServerErrors(form, error)),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormError message={form.formState.errors.root?.server?.message} />
        <TextField
          control={form.control}
          name="current_password"
          label="Current password"
          type="password"
          autoComplete="current-password"
        />
        <TextField
          control={form.control}
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        />
        <TextField
          control={form.control}
          name="password_confirmation"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
        />
        <SubmitButton pending={form.formState.isSubmitting} className="w-full sm:w-auto sm:self-start">
          Update password
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
