import { z } from "zod";
const title = z.string().trim().min(1, "Enter a name.");
export const destinationSchema = z
  .string()
  .trim()
  .refine((value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Enter an http:// or https:// URL.");
export const projectSchema = z.object({
  clientName: title,
  description: z.string().trim().min(1, "Enter a description."),
});
export const campaignSchema = z.object({
  project_id: z.string().min(1, "Choose a project."),
  title,
  url: destinationSchema,
});
export const linkSchema = z.object({ project_id: z.string().min(1), campaign_id: z.string().min(1), title });
export const createSchema = z.object({ title, description: z.string(), url: z.string(), project: z.string() });
export const manageSchema = z.object({ title, detail: z.string().trim().min(1, "Complete both fields.") });
export type ProjectInput = z.infer<typeof projectSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type LinkInput = z.infer<typeof linkSchema>;
