import { describe, expect, it } from "vitest";
import { emailSchema, registerSchema, usernameSchema } from "./schemas";

describe("usernameSchema", () => {
  it("normalizes to lowercase", () => {
    expect(usernameSchema.parse(" Jane_Doe ")).toBe("jane_doe");
  });

  // Mirrors the backend's tests/Feature/AvailabilityTest.php so client and server agree.
  it.each(["ab", "a".repeat(31), "1jane", "_jane", "jane_", "jane__doe", "jane.doe", ""])("rejects %j", (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(false);
  });

  it.each(["abc", "jane_doe", "j4ne", "a".repeat(30)])("accepts %j", (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(true);
  });
});

describe("emailSchema", () => {
  it("trims and lowercases", () => {
    expect(emailSchema.parse("  Jane@Example.COM ")).toBe("jane@example.com");
  });

  it("rejects malformed emails", () => {
    expect(emailSchema.safeParse("nope").success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("requires matching passwords", () => {
    const result = registerSchema.safeParse({
      email: "jane@example.com",
      password: "password123",
      password_confirmation: "password124",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["password_confirmation"]);
  });
});
