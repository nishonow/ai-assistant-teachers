import type { AuthSession } from "./types";

const AUTH_SESSION_KEY = "web.auth.session.v1";

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function loadAuthSession(): AuthSession | null {
  const parsed = safeParse<AuthSession>(localStorage.getItem(AUTH_SESSION_KEY));
  if (!parsed?.user?.username || !parsed?.user?.role) return null;
  return parsed;
}

export function saveAuthSession(session: AuthSession): void {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

