import { api, type Resource, type User } from "@/lib/api";
import type { SocialsInput } from "./schemas";
export async function saveSocials(input: SocialsInput) {
  return (await api.put<Resource<User>>("/api/v1/onboarding/socials", input)).data;
}
