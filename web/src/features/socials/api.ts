import { api, isApiError, type Resource } from "@/lib/api";
import { socialCountsSchema } from "./schemas";

export async function getSocialCounts(signal?: AbortSignal) {
  return socialCountsSchema.parse((await api.get<Resource<unknown>>("/api/v1/socials/counts", { signal })).data);
}

/**
 * Re-fetches audience counts. When every provider fails, the API answers 502
 * but still includes the last saved counts (with `lastError` per profile), so
 * those are returned rather than discarded, matching the old app.
 */
export async function refreshSocialCounts() {
  try {
    return socialCountsSchema.parse((await api.post<Resource<unknown>>("/api/v1/socials/refresh")).data);
  } catch (error) {
    if (isApiError(error) && error.status === 502) {
      const saved = socialCountsSchema.safeParse((error.body as Partial<Resource<unknown>> | undefined)?.data);
      if (saved.success) return saved.data;
    }
    throw error;
  }
}
