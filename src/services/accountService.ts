import { getBackendApiBaseUrl } from "./walletService";

export interface AccountProfile {
  accountId: string;
  alias: string | null;
  displayName: string | null;
  currency: string;
  accountCreatedAt: number;
  lastLoginAt: number | null;
  walletAddress: string | null;
  walletCreatedAt: number | null;
  region: string | null;
  regionConsentAt: number | null;
}

export interface AccountSession {
  profile: AccountProfile;
  addressCreatedOnRegister?: string;
}

interface AuthReply {
  accountId?: string;
  token?: string;
  expiresIn?: number;
  address?: string;
}

interface ProfileUpdate {
  displayName?: string | null;
  region?: string | null;
  shareRegion?: boolean;
}

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

function apiUrl(path: string): string {
  const base = getBackendApiBaseUrl().replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  let body: unknown = null;
  try { body = await response.json(); } catch { /* empty/non-JSON response */ }
  if (!response.ok) {
    const root = body && typeof body === "object" ? body as Record<string, unknown> : {};
    const error = root.error && typeof root.error === "object" ? root.error as Record<string, unknown> : {};
    const message = typeof error.message === "string"
      ? error.message
      : typeof root.message === "string"
        ? root.message
        : `Subtle Pay API request failed (HTTP ${response.status}).`;
    throw new ApiError(message, response.status);
  }
  return body as T;
}

async function rawRequest<T>(path: string, init: RequestInit = {}, withAccessToken = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  headers.set("accept", "application/json");
  if (withAccessToken && accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    throw new Error("Could not reach the Subtle Pay account service. Start the backend or check VITE_SUBTLEPAY_API_BASE_URL.");
  }
  return parseResponse<T>(response);
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const result = await rawRequest<AuthReply>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({}),
      }, false);
      accessToken = typeof result.token === "string" ? result.token : null;
      return accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function authenticatedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, init, true);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || path === "/auth/refresh") throw error;
    const nextToken = await refreshAccessToken();
    if (!nextToken) {
      accessToken = null;
      throw error;
    }
    return rawRequest<T>(path, init, true);
  }
}

export function hasAccountSession(): boolean {
  return Boolean(accessToken);
}

export async function registerAccount(password: string): Promise<{ accountId: string; walletAddress: string }> {
  const result = await rawRequest<AuthReply>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ password }),
  }, false);
  if (!result.token || !result.accountId || !result.address) {
    throw new Error("Registration succeeded without the expected account and wallet details.");
  }
  accessToken = result.token;
  return { accountId: result.accountId, walletAddress: result.address };
}

export async function loginAccount(accountId: string, password: string): Promise<void> {
  const result = await rawRequest<AuthReply>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ accountId: accountId.trim(), password }),
  }, false);
  if (!result.token) throw new Error("Login response did not include an access token.");
  accessToken = result.token;
}

export async function getAccountProfile(): Promise<AccountProfile> {
  return authenticatedRequest<AccountProfile>("/me");
}

export async function updateAccountProfile(input: ProfileUpdate): Promise<Pick<AccountProfile, "displayName" | "region" | "regionConsentAt">> {
  return authenticatedRequest("/me/profile", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function logoutAccount(): Promise<void> {
  try {
    if (accessToken) await authenticatedRequest<{ ok: boolean }>("/auth/logout", { method: "POST" });
  } finally {
    accessToken = null;
    // The backend clears its HttpOnly refresh cookie when logout succeeds.
  }
}

export async function restoreAccountSession(): Promise<AccountProfile | null> {
  const nextToken = await refreshAccessToken();
  if (!nextToken) return null;
  try {
    return await getAccountProfile();
  } catch {
    accessToken = null;
    return null;
  }
}
