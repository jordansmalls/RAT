import { z } from "zod";
export const socialCountsSchema = z.object({
  profiles: z.array(
    z.object({
      platform: z.enum(["youtube", "instagram", "twitter", "twitch"]),
      identifier: z.string(),
      displayName: z.string(),
      count: z.number().nullable(),
      approximate: z.boolean().optional(),
      syncedAt: z.string().nullable(),
      lastError: z.string().nullable(),
    }),
  ),
});
export type SocialCounts = z.infer<typeof socialCountsSchema>;
