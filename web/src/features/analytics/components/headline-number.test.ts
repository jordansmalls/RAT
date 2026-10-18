import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { HeadlineNumber } from "./headline-number";

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => true,
}));

it.each([
  [2515, "2,515"],
  [12.34, "12.34"],
  [-96.125, "-96.13"],
])("renders the final headline immediately with reduced motion for %s", (value, expected) => {
  const host = document.createElement("div");
  const format = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format;
  host.innerHTML = renderToString(createElement(HeadlineNumber, { value, format }));

  expect(host.querySelector(".sr-only")?.textContent).toBe(expected);
  expect(host.querySelector(".inline-grid")?.lastElementChild?.textContent).toBe(expected);
});
