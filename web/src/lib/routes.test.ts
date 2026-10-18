import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./routes";

describe("safeRedirectPath", () => {
  it.each(["/dashboard", "/settings?tab=profile"])("allows relative path %s", (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });

  it.each([null, "", "dashboard", "https://evil.test", "//evil.test", "/\\evil.test"])("rejects %s", (path) => {
    expect(safeRedirectPath(path)).toBeNull();
  });
});
