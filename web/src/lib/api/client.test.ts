import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { ApiError } from "./errors";

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function clearCookies() {
  for (const cookie of document.cookie.split("; ")) {
    const name = cookie.split("=")[0];
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

describe("apiRequest", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    clearCookies();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the CSRF cookie before the first mutation and sends the token", async () => {
    fetchMock.mockImplementationOnce(async () => {
      document.cookie = "XSRF-TOKEN=abc%3D123; path=/";
      return new Response(null, { status: 204 });
    });
    fetchMock.mockResolvedValueOnce(json(200, { data: { id: 1 } }));

    await expect(apiRequest("/api/v1/auth/login", { method: "POST", body: {} })).resolves.toEqual({ data: { id: 1 } });

    expect(fetchMock.mock.calls[0]![0]).toBe("/sanctum/csrf-cookie");
    const headers = new Headers(fetchMock.mock.calls[1]![1]!.headers);
    expect(headers.get("X-XSRF-TOKEN")).toBe("abc=123");
  });

  it("does not fetch the CSRF cookie for GET requests", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));

    await apiRequest("/api/v1/me");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes the CSRF cookie and retries once on 419", async () => {
    document.cookie = "XSRF-TOKEN=stale; path=/";
    fetchMock
      .mockResolvedValueOnce(json(419, { message: "CSRF token mismatch." }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(apiRequest("/api/v1/auth/logout", { method: "POST" })).resolves.toBeUndefined();

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/auth/logout",
      "/sanctum/csrf-cookie",
      "/api/v1/auth/logout",
    ]);
  });

  it("throws ApiError with Laravel validation errors", async () => {
    fetchMock.mockResolvedValueOnce(
      json(422, {
        message: "The email has already been taken.",
        errors: { email: ["The email has already been taken."] },
      }),
    );

    const error = await apiRequest("/api/v1/availability/email").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isValidation).toBe(true);
    expect((error as ApiError).fieldError("email")).toBe("The email has already been taken.");
  });

  it("serializes query parameters and skips empty values", async () => {
    fetchMock.mockResolvedValueOnce(json(200, {}));

    await apiRequest("/api/v1/availability/username", { query: { username: "jane doe", empty: undefined } });

    expect(fetchMock.mock.calls[0]![0]).toBe("/api/v1/availability/username?username=jane+doe");
  });
});
