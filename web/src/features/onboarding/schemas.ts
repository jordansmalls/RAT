import { z } from "zod";
const required = z.string().trim().min(1, "Enter your account.").max(100);
export const socialsSchema = z.object({
  youtube: required,
  instagram: required,
  twitter: z.string().trim().max(100),
  twitch: z.string().trim().max(100),
});
export type SocialsInput = z.infer<typeof socialsSchema>;
