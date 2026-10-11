import type { HomeData, Me, Payment, Rates, SendResult, Wallet, WithdrawResult } from "../types/api";

const BASE = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");
const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";

type SessionResponse = {
  token: string;
  refreshToken: string;
  expiresIn: number;
  accountId?: string;
  address?: string;
};

type ApiFailure = {
  message?: string;
  error?: { message?: string };
};

export const getToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const hasSession = () => Boolean(getToken() || getRefreshToken());

export function saveSession(token: string, refreshToken?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        const data = (await response.json().catch(() => ({}))) as Partial<SessionResponse>;
        if (!response.ok || !data.token || !data.refreshToken) {
          throw new Error("The session has expired.");
        }
        saveSession(data.token, data.refreshToken);
        return data.token;
      } catch {
        clearToken();
        return null;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<T> {
  const send = (token: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...extraHeaders,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let response = await send(getToken());
  const canRefresh = path !== "/auth/login" && path !== "/auth/register" && path !== "/auth/refresh";

  if (response.status === 401 && canRefresh) {
    const nextToken = await refreshAccessToken();
    if (!nextToken) {
      clearToken();
      throw new Error("Your session expired. Please log in again.");
    }
    response = await send(nextToken);
  }

  const data = await response.json().catch(() => ({})) as ApiFailure & Record<string, unknown>;
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `Request failed (${response.status}).`);
  }
  return data as T;
}

export const api = {
  register: (password: string) =>
    request<SessionResponse>("POST", "/auth/register", { password }),
  login: (accountId: string, password: string) =>
    request<SessionResponse>("POST", "/auth/login", { accountId, password }),
  logout: () => request<{ ok: boolean }>("POST", "/auth/logout"),
  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ ok: boolean }>("POST", "/auth/change-password", { oldPassword, newPassword }),
  getMe: () => request<Me>("GET", "/me"),
  getHome: () => request<HomeData>("GET", "/home"),
  setCurrency: (currency: string) =>
    request<{ currency: string }>("PUT", "/me/currency", { currency }),
  getWallet: () => request<Wallet>("GET", "/wallet"),
  setAlias: (alias: string) => request<{ alias: string }>("POST", "/alias", { alias }),
  resolveAlias: (name: string) =>
    request<{ alias: string; address: string }>("GET", `/alias/${encodeURIComponent(name)}`),
  getRates: (currency: string) =>
    request<Rates>("GET", `/rates?${new URLSearchParams({ currency })}`),
  getCurrencies: () =>
    request<{ currencies: Array<{ code: string; name: string; exponent: number }> }>(
      "GET",
      "/rates/currencies",
    ),
  getTokenPrice: (currency: string, amount = "1") =>
    request<{ asset: string; currency: string; tokenUsd: number; price: string; amount: string; value: string; updatedAt: string }>(
      "GET",
      `/rates/token?${new URLSearchParams({ currency, amount })}`,
    ),
  getAssets: () => request<{ assets: Array<Record<string, unknown>> }>("GET", "/assets"),
  send: (to: string, amount: number, amountCurrency: string, note?: string) =>
    request<SendResult>(
      "POST",
      "/payments/send",
      { to, amount, amountCurrency, note },
      { "idempotency-key": crypto.randomUUID() },
    ),
  getPayments: () => request<Payment[]>("GET", "/payments"),
  withdraw: (amount: number, currency: string) =>
    request<WithdrawResult>("POST", "/withdraw", { amount, currency }),
};
