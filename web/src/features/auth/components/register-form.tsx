"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { AuthCard } from "@/components/auth/auth-card";
import { AvailabilityHint } from "@/components/forms/availability-hint";
import { FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { FieldGroup } from "@/components/ui/field";
import { useAvailability } from "@/features/account/use-availability";
import { applyServerErrors } from "@/lib/forms";
import { routes } from "@/lib/routes";
import { useRegister } from "../queries";
import { PASSWORD_MIN_LENGTH, registerSchema, type RegisterInput } from "../schemas";

export function RegisterForm() {
  const register = useRegister();
  const form = useForm<z.input<typeof registerSchema>, unknown, RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", password_confirmation: "" },
  });

  const email = useWatch({ control: form.control, name: "email" });
  const emailAvailability = useAvailability("email", email);
  const emailTaken = emailAvailability.state === "unavailable";

  // On success the `me` cache updates and <AuthGuard> sends the user to pick a username.
  const onSubmit = form.handleSubmit((values) =>
    register.mutateAsync(values).catch((error) => applyServerErrors(form, error)),
  );

  return (
    <AuthCard
      title="Create your RAT account"
      description={
        <>
          Already have an account? <Link href={routes.login}>Sign in</Link>
        </>
      }
      footer="Next you'll pick a username and add your social accounts."
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <FormError message={form.formState.errors.root?.server?.message} />
          <TextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="m@example.com"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            hint={
              <AvailabilityHint
                status={emailAvailability}
                available={null}
                taken={
                  <span>
                    An account with this email already exists.{" "}
                    <Link href={routes.login} className="underline underline-offset-4">
                      Sign in?
                    </Link>
                  </span>
                }
              />
            }
          />
          <TextField
            control={form.control}
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            description={`At least ${PASSWORD_MIN_LENGTH} characters.`}
          />
          <TextField
            control={form.control}
            name="password_confirmation"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
          />
          <SubmitButton pending={form.formState.isSubmitting} disabled={emailTaken} className="w-full">
            Create account
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
