import { expect, it } from "vitest";
import { platformName } from "./platforms";

it("labels known platforms case-insensitively and falls back to the raw value or Custom", () => {
  expect(platformName("youtube")).toBe("YouTube");
  expect(platformName(" TikTok ")).toBe("TikTok");
  expect(platformName("other")).toBe("Custom");
  expect(platformName("mastodon")).toBe("mastodon");
  expect(platformName("")).toBe("Custom");
  // Inherited object keys are not platforms.
  expect(platformName("constructor")).toBe("constructor");
});
