"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/features/auth/queries";
import { TextField } from "@/components/forms/text-field";
import { FormError } from "@/components/forms/form-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { FieldGroup } from "@/components/ui/field";
import { applyServerErrors } from "@/lib/forms";
import { socialsSchema, type SocialsInput } from "../schemas";
import { useSaveSocials } from "../queries";
import { SignOutButton } from "./sign-out-button";
const platforms = [
  ["youtube", "YouTube channel handle or ID", "@yourchannel"],
  ["instagram", "Instagram username", "yourname"],
  ["twitter", "Twitter / X username (optional)", "yourname"],
  ["twitch", "Twitch username (optional)", "yourname"],
] as const;
export function SocialsForm() {
  const user = useUser(),
    save = useSaveSocials();
  const form = useForm<SocialsInput>({
    resolver: zodResolver(socialsSchema),
    defaultValues: {
      youtube: user.socials.youtube?.identifier ?? "",
      instagram: user.socials.instagram?.identifier ?? "",
      twitter: user.socials.twitter?.identifier ?? "",
      twitch: user.socials.twitch?.identifier ?? "",
    },
  });
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) =>
        save.mutateAsync(values).catch((error) => applyServerErrors(form, error)),
      )}
    >
      <FieldGroup>
        {platforms.map(([name, label, placeholder], i) => (
          <TextField
            key={name}
            control={form.control}
            name={name}
            label={label}
            placeholder={placeholder}
            maxLength={100}
            autoCapitalize="none"
            spellCheck={false}
            autoFocus={i === 0}
            disabled={save.isPending}
          />
        ))}
        <p className="text-xs text-muted-foreground">
          Counts come from public profile pages and may be approximate. Twitch counts are not connected by default. You
          can continue even when a count is unavailable.
        </p>
        <FormError
          message={
            form.formState.errors.root?.server?.message ||
            Object.values(form.formState.errors).find((error) => error?.message)?.message
          }
        />
        <SubmitButton pending={save.isPending} className="w-full">
          {save.isPending ? "Saving accounts and fetching counts…" : "Go to dashboard"}
        </SubmitButton>
        <SignOutButton disabled={save.isPending} />
      </FieldGroup>
    </form>
  );
}
