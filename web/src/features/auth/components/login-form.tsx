"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { AuthCard } from "@/components/auth/auth-card";
import { FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { TextField } from "@/components/forms/text-field";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { applyServerErrors } from "@/lib/forms";
import { routes } from "@/lib/routes";
import { useLogin } from "../queries";
import { loginSchema, type LoginInput } from "../schemas";

export function LoginForm() {
  const login = useLogin();
  const form = useForm<z.input<typeof loginSchema>, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: "", password: "", remember: true },
  });

  // On success the `me` cache updates and <AuthGuard> redirects.
  const onSubmit = form.handleSubmit((values) =>
    login.mutateAsync(values).catch((error) => {
      form.resetField("password", { keepError: false });
      applyServerErrors(form, error);
    }),
  );

  return (
    <AuthCard
      title="Welcome back to RAT"
      description={
        <>
          New to RAT? <Link href={routes.register}>Create an account</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <FormError message={form.formState.errors.root?.server?.message} />
          <TextField
            control={form.control}
            name="login"
            label="Email or username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
          />
          <TextField
            control={form.control}
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            labelAction={
              <Link
                href={routes.forgotPassword}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            }
          />
          <Controller
            control={form.control}
            name="remember"
            render={({ field }) => (
              <Field orientation="horizontal">
                <Checkbox
                  id="remember"
                  name={field.name}
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
                <FieldLabel htmlFor="remember" className="font-normal">
                  Keep me signed in
                </FieldLabel>
              </Field>
            )}
          />
          <SubmitButton pending={form.formState.isSubmitting} className="w-full">
            Sign in
          </SubmitButton>
        </FieldGroup>
      </form>
    </AuthCard>
  );
}
