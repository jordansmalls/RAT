import { describe, it, expect } from "vitest";
import { redirectFor, type AuthRequirement } from "./auth-guard";
import type { User } from "@/lib/api";
const profile = { identifier: "", displayName: "", count: null, approximate: false, syncedAt: null, lastError: null };
export const user: User = {
  id: "507f1f77bcf86cd799439011",
  name: null,
  username: "jay",
  email: "jay@example.com",
  email_verified_at: null,
  onboarding_step: "complete",
  socials: { youtube: profile, instagram: profile, twitter: profile, twitch: profile },
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
};
describe("onboarding guard", () => {
  it("prevents guests from mounting protected views", () => {
    for (const path of ["/dashboard", "/projects/new", "/onboarding/socials"])
      expect(redirectFor("user", null, path)).toBe(`/login?next=${encodeURIComponent(path)}`);
    expect(redirectFor("guest", null, "/login")).toBeNull();
  });
  it.each(["username", "socials"] as const)("resumes the %s server step across direct and back navigation", (step) => {
    const account = { ...user, onboarding_step: step };
    for (const requirement of ["guest", "user", "onboarding"] as AuthRequirement[])
      for (const path of ["/dashboard", "/login", "/register", "/projects/new"])
        expect(redirectFor(requirement, account, path)).toBe(`/onboarding/${step}`);
    expect(redirectFor("onboarding", account, `/onboarding/${step}`)).toBeNull();
    expect(redirectFor("onboarding", account, `/onboarding/${step === "username" ? "socials" : "username"}`)).toBe(
      `/onboarding/${step}`,
    );
  });
  it("uses onboarding_step rather than inferring completion from a username", () => {
    expect(redirectFor("user", { ...user, onboarding_step: "socials" }, "/dashboard")).toBe("/onboarding/socials");
  });
  it("lets completed accounts open deep links and leaves onboarding", () => {
    expect(redirectFor("user", user, "/dashboard?project=p1")).toBeNull();
    expect(redirectFor("onboarding", user, "/onboarding/socials")).toBe("/dashboard");
    expect(redirectFor("guest", user, "/login", "/dashboard?project=p1")).toBe("/dashboard?project=p1");
    for (const next of ["https://evil.test", "//evil.test", "/onboarding/username", "/login", "/register"])
      expect(redirectFor("guest", user, "/login", next)).toBe("/dashboard");
  });
  it("keeps the query string of a deep link in next, and compares paths without it", () => {
    expect(redirectFor("user", null, "/dashboard?project=p1&campaign=c1")).toBe(
      `/login?next=${encodeURIComponent("/dashboard?project=p1&campaign=c1")}`,
    );
    expect(redirectFor("onboarding", { ...user, onboarding_step: "socials" }, "/onboarding/socials?x=1")).toBeNull();
    expect(redirectFor("guest", user, "/login?next=%2Fdashboard%3Fproject%3Dp1", "/dashboard?project=p1")).toBe(
      "/dashboard?project=p1",
    );
  });
});
