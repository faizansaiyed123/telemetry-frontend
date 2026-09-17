export type ApiError = Error & { status?: number };

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = window.localStorage.getItem("telemetry_access_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      message = payload.detail || message;
    } catch {
      // Keep the HTTP fallback when the response is not JSON.
    }
    const error = new Error(message) as ApiError;
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export type AuthUser = { id: string; email: string; role: string; is_active: boolean };
export type AuthResponse = { access_token: string; token_type: string; user: AuthUser };

export async function login(email: string, password: string): Promise<AuthResponse> {
  const body = new URLSearchParams({ username: email, password });
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error("Invalid email or password");
  return response.json() as Promise<AuthResponse>;
}

export function saveSession(session: AuthResponse): void {
  window.localStorage.setItem("telemetry_access_token", session.access_token);
  window.localStorage.setItem("telemetry_user", JSON.stringify(session.user));
}

export function clearSession(): void {
  window.localStorage.removeItem("telemetry_access_token");
  window.localStorage.removeItem("telemetry_user");
}

export function getStoredUser(): AuthUser | null {
  const value = window.localStorage.getItem("telemetry_user");
  if (!value) return null;
  try { return JSON.parse(value) as AuthUser; } catch { return null; }
}
