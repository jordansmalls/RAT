import { z } from "zod";
import { emailSchema, passwordSchema, usernameSchema } from "@/features/auth/schemas";

export const usernameFormSchema = z.object({
  username: usernameSchema,
});

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .max(255, "Name must be 255 characters or fewer.")
    .transform((name) => name || null),
  email: emailSchema,
});

export const updatePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    password: passwordSchema,
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match.",
    path: ["password_confirmation"],
  })
  .refine((data) => data.password !== data.current_password, {
    message: "Choose a password different from your current one.",
    path: ["password"],
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password to confirm."),
});

export type UsernameInput = z.output<typeof usernameFormSchema>;
export type ProfileInput = z.output<typeof profileSchema>;
export type UpdatePasswordInput = z.output<typeof updatePasswordSchema>;
export type DeleteAccountInput = z.output<typeof deleteAccountSchema>;
