// Client for the PowerBank PHP API. Auth lives in HttpOnly cookies set by the API;
// nothing sensitive is stored in the browser.
export type ApiFieldErrors = Record<string, string>;
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields: ApiFieldErrors = {}) { super(message); }
}
type Envelope<T> = { success: true; data: T; meta?: Record<string, unknown> } | { success: false; error: { code: string; message: string; fields?: ApiFieldErrors } };

export const API_BASE = (import.meta.env["VITE_API_BASE_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";
export const apiConfigured = () => API_BASE.length > 0;

let csrf: string | null = null;
async function ensureCsrf() {
  if (csrf) return csrf;
  const r = await request<{ csrfToken: string }>("GET", "/auth/csrf");
  return (csrf = r.csrfToken);
}
let refreshing: Promise<boolean> | null = null;
async function tryRefresh(path: string) {
  const admin = path.startsWith("/admin");
  refreshing ??= request("POST", admin ? "/admin/auth/refresh" : "/auth/refresh", undefined, false).then(() => true, () => false).finally(() => { refreshing = null; });
  return refreshing;
}

export async function request<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown, retry = true): Promise<T> {
  if (!apiConfigured()) throw new ApiError(0, "not_configured", "The server address is not set yet.");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = await ensureCsrf();
  let res: Response;
  try {
    res = await fetch(API_BASE + path, { method, headers, credentials: "include", ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  } catch {
    throw new ApiError(0, "network", "Can't reach the server. Check your connection.");
  }
  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (res.status === 401 && retry && !path.includes("/auth/") && (await tryRefresh(path))) return request<T>(method, path, body, false);
  if (res.status === 403 && json && !json.success && json.error.code === "csrf" && retry) { csrf = null; return request<T>(method, path, body, false); }
  if (!json) throw new ApiError(res.status, "bad_response", "Unexpected server response.");
  if (!json.success) throw new ApiError(res.status, json.error.code, json.error.message, json.error.fields ?? {});
  return json.data;
}
export const api = {
  get: <T,>(p: string) => request<T>("GET", p),
  post: <T,>(p: string, b?: unknown) => request<T>("POST", p, b ?? {}),
  put: <T,>(p: string, b?: unknown) => request<T>("PUT", p, b ?? {}),
  del: <T,>(p: string) => request<T>("DELETE", p),
};
