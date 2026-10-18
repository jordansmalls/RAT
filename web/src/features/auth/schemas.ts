import { z } from "zod";

/** Keep in sync with api/config/usernames.php. */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-z](?:[a-z0-9]|_(?!_))*[a-z0-9]$/;

export const PASSWORD_MIN_LENGTH = 8;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email address.")
  .max(255, "Email must be 255 characters or fewer.")
  .pipe(z.email("Enter a valid email address."));

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN_LENGTH, `Use at least ${USERNAME_MIN_LENGTH} characters.`)
  .max(USERNAME_MAX_LENGTH, `Use ${USERNAME_MAX_LENGTH} characters or fewer.`)
  .regex(
    USERNAME_PATTERN,
    "Start with a letter, end with a letter or number, and use only letters, numbers and single underscores.",
  );

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(255, "Password must be 255 characters or fewer.");

const passwordsMatch = (data: { password: string; password_confirmation: string }) =>
  data.password === data.password_confirmation;

const passwordMismatch = { message: "Passwords don't match.", path: ["password_confirmation"] };

export const loginSchema = z.object({
  login: z.string().trim().toLowerCase().min(1, "Enter your email or username."),
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean(),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    password_confirmation: z.string(),
  })
  .refine(passwordsMatch, passwordMismatch);

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    email: emailSchema,
    password: passwordSchema,
    password_confirmation: z.string(),
  })
  .refine(passwordsMatch, passwordMismatch);

export type LoginInput = z.output<typeof loginSchema>;
export type RegisterInput = z.output<typeof registerSchema>;
export type ForgotPasswordInput = z.output<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.output<typeof resetPasswordSchema>;
