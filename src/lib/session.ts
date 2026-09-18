import { api } from "../services/api.js";
import type { AuthResponse, AuthUser } from "../types/app.js";

const TOKEN_KEY = "telemetry_access_token";
const USER_KEY = "telemetry_user";

export function getStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export function saveSession(session: AuthResponse): void {
  window.localStorage.setItem(TOKEN_KEY, session.access_token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export async function refreshSession(): Promise<AuthUser> {
  const user = await api.me();
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}
