import type { QueryClient } from "@tanstack/react-query";

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

export type ApiUser = { id: string; name: string; mobile: string; status: "active" | "inactive" | "blocked"; joined: string };
export type ApiPlan = { id: string; name: string; icon: "zap" | "star" | "crown" | "gem"; price: number; daily: number; duration: number; validity: string; description: string; status: "active" | "inactive"; sortOrder?: number };
export type ApiNotification = { id: string; title: string; body: string; audience: "all" | "user"; date: string; read: boolean };
export type ApiWallet = { depositBalance: number; withdrawableBalance: number; availableBalance: number; totalDeposited: number; totalEarned: number; totalWithdrawn: number };
export type ApiBankAccount = { id: string; bankName: string; accountNumber: string; accountName: string; ifsc: string; isDefault: boolean };
export type ApiDeposit = { id: string; amount: number; method: string; gatewayOrderNo: string | null; platformId: string | null; paymentLink: string | null; status: "pending" | "success" | "failed"; date: string; paidAt: string | null };
export type ApiWithdrawal = { id: string; amount: number; method: string; bankName: string; accountNumber: string; accountName: string; ifsc: string; status: "pending" | "processing" | "success" | "rejected" | "failed"; note: string; date: string; reviewedAt: string | null };
export type ApiInvestment = { id: string; planId: string; planName: string; amount: number; daily: number; duration: number; daysCredited: number; start: string; status: "active" | "completed" };
export type ApiTransaction = { id: string; type: string; rawType: "deposit" | "withdrawal" | "investment" | "earning" | "task" | "referral" | "refund" | "admin_adjust"; bucket: "deposit" | "withdrawable"; direction: "credit" | "debit"; amount: number; balanceAfter: number; ref: string; status: "success" | "pending" | "failed"; note: string | null; date: string };
export type ApiTask = { id: string; title: string; category: "Daily" | "Social" | "Special"; reward: number; status: "active" | "paused"; completed: boolean };
export type ApiDashboard = {
  user: ApiUser;
  wallet: ApiWallet;
  totalInvested: number;
  investments: ApiInvestment[];
  recentTransactions: ApiTransaction[];
  profile: { displayName: string; city: string; avatarUrl: string };
  settings: { notifyPush: boolean; notifySms: boolean; language: "en" | "hi" };
  inviteCode: string;
  referralCount: number;
  unreadNotifications: number;
  plans: ApiPlan[];
  recentNotifications: ApiNotification[];
};
export type ApiReferrals = { inviteCode: string; invitedBy: { code: string; name: string } | null; bonusEarned: number; referrals: { id: string; name: string; status: string; reward: number; joined: string }[] };
export type ApiAdmin = { id: number; username: string; name: string; role: "super_admin" | "admin" | "viewer" };
export type ApiAdminUser = ApiUser & {
  lastLogin: string | null;
  displayName: string;
  city: string;
  inviteCode: string;
  balance: number;
  invitedWith?: string | null;
  referredBy?: string | null;
  referralCount?: number;
  wallet?: ApiWallet;
  transactions?: ApiTransaction[];
};
export type ApiAdminUsersPage = { items: ApiAdminUser[]; total: number; page: number; perPage: number; counts: { total: number; active: number; inactive: number; blocked: number } };
export type ApiAdminDeposit = ApiDeposit & { userId: string; userName: string };
export type ApiAdminDepositsPage = { items: ApiAdminDeposit[]; counts: { pending: number; success: number; failed: number } };
export type ApiAdminWithdrawal = ApiWithdrawal & { userId: string; userName: string };
export type ApiAdminWithdrawalsPage = { items: ApiAdminWithdrawal[]; counts: { pending: number; processing: number; success: number; rejected: number; failed: number } };
export type ApiAdminInvestmentsPage = { items: (ApiInvestment & { userId: string; userName: string })[]; counts: { active: number; completed: number; totalAmount: number }; distribution: { name: string; value: number }[]; monthly: { m: string; count: number; value: number }[] };
export type ApiAdminTx = ApiTransaction & { userId: string; userName: string };
export type ApiAdminTask = { id: string; title: string; category: "Daily" | "Social" | "Special"; reward: number; status: "active" | "paused"; assigned: string; assignedName: string; completions: number; totalUsers: number };
export type ApiAdminReferrals = {
  codes: { id: string; code: string; owner: string; ownerId: string | null; uses: number; maxUses: number | null; status: "active" | "disabled"; expiresAt: string | null }[];
  referrals: { userId: string; userName: string; code: string; referredBy: string; joined: string; status: string }[];
  topReferrers: { id: string; code: string; owner: string; uses: number }[];
  stats: { total: number; active: number; codes: number };
};
export type ApiAdminNotification = { id: string; title: string; body: string; audience: "all" | "user"; targetUser: { id: string; name: string } | null; date: string; readCount: number };
export type ApiAdminOverview = {
  users: { total: number; active: number; inactive: number; blocked: number };
  referrals: number;
  activePlans: number;
  totalDeposited: number;
  totalWithdrawn: number;
  activeInvestments: number;
  pendingWithdrawals: number;
  recentUsers: ApiUser[];
  recentLogs: { id: string; admin: string; action: string; targetType: string | null; targetId: string | null; date: string }[];
  recentTransactions: ApiAdminTx[];
  pendingRequests: ApiAdminWithdrawal[];
  revenueSeries: { m: string; v: number }[];
  userGrowthSeries: { m: string; v: number }[];
};
export type ApiAdminReport = { kind: "Users" | "Referrals" | "Deposits" | "Withdrawals" | "Investments" | "Transactions"; records: { date: string; label: string; amount: number }[]; byMonth: { m: string; v: number }[] };
export type ApiActivityLog = { id: string; admin: string; action: string; targetType: string | null; targetId: string | null; details: Record<string, unknown> | null; ip: string; date: string };

export const errMessage = (e: unknown, fallback = "Something went wrong. Please try again.") => (e instanceof ApiError ? e.message : fallback);

const MONEY_KEYS = ["me-wallet", "me-dashboard", "me-investments", "me-transactions", "me-deposits", "me-withdrawals", "me-tasks", "me-referrals"];
export function invalidateMoneyQueries(qc: QueryClient) {
  for (const key of MONEY_KEYS) void qc.invalidateQueries({ queryKey: [key] });
}

const ADMIN_MONEY_KEYS = ["admin-overview", "admin-withdrawals", "admin-deposits", "admin-investments", "admin-transactions", "admin-tasks", "admin-reports", "admin-users", "admin-user"];
export function invalidateAdminMoneyQueries(qc: QueryClient) {
  for (const key of ADMIN_MONEY_KEYS) void qc.invalidateQueries({ queryKey: [key] });
}
