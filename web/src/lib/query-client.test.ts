import { afterEach, describe, expect, it, vi } from "vitest";
import { authKeys } from "@/features/auth/queries";
import { ApiError } from "@/lib/api";
import { getQueryClient } from "./query-client";

afterEach(() => getQueryClient().clear());

describe("session-wide error handling", () => {
  it("marks the user as signed out on any 401", async () => {
    const client = getQueryClient();
    client.setQueryData(authKeys.me(), { id: "u1" });
    await client
      .fetchQuery({
        queryKey: ["dashboard", "projects"],
        queryFn: () => Promise.reject(new ApiError(401, "Unauthenticated.")),
      })
      .catch(() => undefined);
    expect(client.getQueryData(authKeys.me())).toBeNull();
  });

  it("re-reads me on a 403 from the onboarded middleware so the guard can redirect", async () => {
    const client = getQueryClient();
    client.setQueryData(authKeys.me(), { id: "u1", onboarding_step: "complete" });
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
    await client
      .fetchQuery({
        queryKey: ["dashboard", "projects"],
        queryFn: () => Promise.reject(new ApiError(403, "Finish onboarding.")),
      })
      .catch(() => undefined);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: authKeys.me() });
    expect(client.getQueryData(authKeys.me())).toMatchObject({ id: "u1" });
  });
});
