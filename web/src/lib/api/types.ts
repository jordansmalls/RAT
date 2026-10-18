/** Laravel API resources are wrapped in `data`. */
export type Resource<T> = { data: T };

export type MessageResponse = { message: string };

export type User = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  email_verified_at: string | null;
  onboarding_step: "username" | "socials" | "complete";
  socials: Record<"youtube" | "instagram" | "twitter" | "twitch", SocialProfile>;
  created_at: string;
  updated_at: string;
};

export type AvailabilityReason = "taken" | "reserved";

export type Availability = {
  available: boolean;
  reason: AvailabilityReason | null;
};

export type SocialProfile = {
  identifier: string;
  displayName: string;
  count: number | null;
  approximate: boolean;
  syncedAt: string | null;
  lastError: string | null;
};
