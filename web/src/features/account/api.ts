import { api, type Availability, type Resource, type User } from "@/lib/api";
import type { DeleteAccountInput, ProfileInput, UpdatePasswordInput, UsernameInput } from "./schemas";

export const accountApi = {
  async updateProfile(input: Partial<ProfileInput>): Promise<User> {
    const response = await api.patch<Resource<User>>("/api/v1/me", input);
    return response.data;
  },

  async updateUsername(input: UsernameInput): Promise<User> {
    const response = await api.put<Resource<User>>("/api/v1/me/username", input);
    return response.data;
  },

  updatePassword(input: UpdatePasswordInput): Promise<void> {
    return api.put<void>("/api/v1/me/password", input);
  },

  deleteAccount(input: DeleteAccountInput): Promise<void> {
    return api.delete<void>("/api/v1/me", input);
  },
};

export type AvailabilityField = "email" | "username";

export const availabilityApi = {
  check(field: AvailabilityField, value: string, signal?: AbortSignal): Promise<Availability> {
    return api.get<Availability>(`/api/v1/availability/${field}`, { query: { [field]: value }, signal });
  },
};
