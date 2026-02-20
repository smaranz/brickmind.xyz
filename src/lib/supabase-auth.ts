const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const AUTH_STORAGE_KEY = "supabase_auth_session";

export interface SupabaseAuthUser {
  id: string;
  email: string | null;
}

export interface SupabaseAuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: SupabaseAuthUser;
}

interface AuthResponsePayload {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  user?: {
    id?: string;
    email?: string | null;
  };
  session?: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    expires_in?: number;
    user?: {
      id?: string;
      email?: string | null;
    };
  };
}

function getAuthConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }

  return {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  };
}

function toSession(payload: AuthResponsePayload): SupabaseAuthSession | null {
  const normalized = payload.session || payload;
  const accessToken = normalized.access_token;
  const refreshToken = normalized.refresh_token;
  const userId = normalized.user?.id;

  if (!accessToken || !refreshToken || !userId) {
    return null;
  }

  let expiresAt = normalized.expires_at;
  if (!expiresAt && normalized.expires_in) {
    expiresAt = Math.floor(Date.now() / 1000) + normalized.expires_in;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    user: {
      id: userId,
      email: normalized.user?.email ?? null,
    },
  };
}

async function authRequest<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> {
  const { url, anonKey } = getAuthConfig();
  const endpoint = new URL(path, url);

  const headers = new Headers(options.headers);
  headers.set("apikey", anonKey);

  if (!headers.has("Content-Type") && options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint.toString(), {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message =
      parsed?.msg || parsed?.message || parsed?.error_description || "Auth request failed";
    throw new Error(message);
  }

  return parsed as T;
}

export function loadStoredSession(): SupabaseAuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SupabaseAuthSession;
  } catch {
    return null;
  }
}

export function saveStoredSession(session: SupabaseAuthSession): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getStoredUserId(): string | null {
  return loadStoredSession()?.user.id ?? null;
}

export function getStoredAccessToken(): string | null {
  return loadStoredSession()?.access_token ?? null;
}

export async function getValidAccessToken(): Promise<string | null> {
  const session = loadStoredSession();
  if (!session) {
    return null;
  }

  if (!isSessionExpiring(session)) {
    return session.access_token;
  }

  try {
    const refreshed = await refreshSession(session.refresh_token);
    saveStoredSession(refreshed);
    return refreshed.access_token;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function isSessionExpiring(
  session: SupabaseAuthSession,
  skewSeconds = 60,
): boolean {
  if (!session.expires_at) {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  return session.expires_at <= now + skewSeconds;
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<SupabaseAuthSession> {
  const payload = await authRequest<AuthResponsePayload>(
    "/auth/v1/token?grant_type=password",
    {
      method: "POST",
      body: { email, password },
    },
  );

  const session = toSession(payload);
  if (!session) {
    throw new Error("Sign-in response did not include a valid session.");
  }

  return session;
}

export async function signUpWithPassword(
  email: string,
  password: string,
): Promise<{
  session: SupabaseAuthSession | null;
  requiresEmailConfirmation: boolean;
}> {
  const payload = await authRequest<AuthResponsePayload>("/auth/v1/signup", {
    method: "POST",
    body: { email, password },
  });

  const session = toSession(payload);
  return {
    session,
    requiresEmailConfirmation: !session,
  };
}

export async function refreshSession(
  refreshToken: string,
): Promise<SupabaseAuthSession> {
  const payload = await authRequest<AuthResponsePayload>(
    "/auth/v1/token?grant_type=refresh_token",
    {
      method: "POST",
      body: { refresh_token: refreshToken },
    },
  );

  const session = toSession(payload);
  if (!session) {
    throw new Error("Refresh response did not include a valid session.");
  }

  return session;
}

export async function signOutWithToken(accessToken: string): Promise<void> {
  const { anonKey } = getAuthConfig();
  await authRequest("/auth/v1/logout", {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
