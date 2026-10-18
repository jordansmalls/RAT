"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { applyServerErrors } from "@/lib/forms";
import { useDeleteAccount } from "../queries";
import { deleteAccountSchema, type DeleteAccountInput } from "../schemas";

export function DeleteAccountForm() {
  const deleteAccount = useDeleteAccount();
  const form = useForm<z.input<typeof deleteAccountSchema>, unknown, DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: "" },
  });

  // On success the `me` cache is cleared and <AuthGuard> redirects to sign in.
  const onSubmit = form.handleSubmit((values) =>
    deleteAccount
      .mutateAsync(values)
      .then(() => toast.success("Your account has been deleted."))
      .catch((error) => applyServerErrors(form, error)),
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormError message={form.formState.errors.root?.server?.message} />
        <TextField
          control={form.control}
          name="password"
          label="Confirm with your password"
          type="password"
          autoComplete="current-password"
        />
        <SubmitButton
          variant="destructive"
          pending={form.formState.isSubmitting}
          className="w-full sm:w-auto sm:self-start"
        >
          Delete account permanently
        </SubmitButton>
      </FieldGroup>
    </form>
  );
}
