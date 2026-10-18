import { ApiError, type ValidationErrors } from "./errors";

/**
 * Where the browser sends API requests. Empty (the default) means same-origin:
 * Next.js rewrites `/api/*` and `/sanctum/*` to Laravel (see next.config.ts),
 * so session cookies are first-party and no CORS is needed.
 */
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

const XSRF_COOKIE = "XSRF-TOKEN";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type Query = Record<string, string | number | boolean | null | undefined>;

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  headers?: HeadersInit;
  responseType?: "blob";
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

let csrfRequest: Promise<void> | null = null;

/**
 * Fetch Sanctum's CSRF cookie. Concurrent callers share one request.
 */
function refreshCsrfCookie(): Promise<void> {
  csrfRequest ??= fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  })
    .then((response) => {
      if (!response.ok) throw new ApiError(response.status, "Unable to start a secure session.");
    })
    .finally(() => {
      csrfRequest = null;
    });

  return csrfRequest;
}

function buildUrl(path: string, query?: Query): string {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${url}${url.includes("?") ? "&" : "?"}${search}` : url;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Call the Laravel API with session cookies and CSRF protection.
 * Throws `ApiError` for non-2xx responses.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const isMutation = !SAFE_METHODS.has(method);

  if (isMutation && !readCookie(XSRF_COOKIE)) {
    await refreshCsrfCookie();
  }

  const send = () => {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    headers.set("X-Requested-With", "XMLHttpRequest");
    if (options.body !== undefined) headers.set("Content-Type", "application/json");

    const xsrfToken = readCookie(XSRF_COOKIE);
    if (isMutation && xsrfToken) headers.set("X-XSRF-TOKEN", xsrfToken);

    return fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "include",
      signal: options.signal,
    });
  };

  let response = await send();

  // 419 = CSRF token mismatch, usually because the session expired. Refresh once and retry.
  if (response.status === 419 && isMutation) {
    await refreshCsrfCookie();
    response = await send();
  }

  if (response.ok && options.responseType === "blob") return (await response.blob()) as T;
  const data = await parseBody(response);

  if (!response.ok) {
    const payload = (typeof data === "object" && data !== null ? data : {}) as {
      message?: string;
      errors?: ValidationErrors;
    };
    throw new ApiError(response.status, payload.message ?? response.statusText, payload.errors, data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE", body }),
};
